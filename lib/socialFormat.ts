// Fits one article post to each social network's rules. Shared by the admin Send panel (live previews)
// and lib/social.ts (what actually goes to the Make webhook), so what the editor sees is what posts.
//
// Rules used (Nov 2026):
// - LinkedIn: post text up to 3,000 characters; about 210 show before "see more". Link card title up to
//   200 characters and description up to 256 are safe for the LinkedIn API.
// - Facebook: technical limit is far higher, but link posts are kept to 2,000 characters; about 125 show
//   before "See more". The link is attached as a preview card, not pasted into the text.
// - X: 280 characters. Every link counts as 23 characters (t.co), whatever its real length.
// - Instagram: caption up to 2,200 characters, at most 5 hashtags, links in captions aren't clickable,
//   and a post needs a JPEG image between 4:5 (portrait) and 1.91:1 (landscape). /api/articles/[id]/social-image
//   serves each cover as a JPEG at each network's size.

export const SOCIAL_RULES = {
  linkedin: { label: "LinkedIn", max: 3000, fold: 210 },
  facebook: { label: "Facebook", max: 2000, fold: 125 },
  x: { label: "X", max: 280, fold: 280 },
  instagram: { label: "Instagram", max: 2200, fold: 125 },
} as const;
export type SocialNetwork = keyof typeof SOCIAL_RULES;
export const SOCIAL_NETWORKS = Object.keys(SOCIAL_RULES) as SocialNetwork[];

export const LINKEDIN_TITLE_MAX = 200;
export const LINKEDIN_DESCRIPTION_MAX = 256;
export const X_LINK_LENGTH = 23;
export const INSTAGRAM_HASHTAG_MAX = 5;

// Article text uses light markdown; social networks show it literally, so strip it to plain text.
export function plainText(s: string) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Characters as the networks count them (emoji and other astral characters count once).
export const charCount = (s: string) => Array.from(s).length;

// Shortens text to max characters, preferring to end on a sentence, then a word, and adds "…" if cut.
export function fit(text: string, max: number) {
  const t = text.trim();
  if (charCount(t) <= max) return t;
  const chars = Array.from(t).slice(0, Math.max(0, max - 1)).join("");
  const sentence = Math.max(chars.lastIndexOf(". "), chars.lastIndexOf("! "), chars.lastIndexOf("? "), chars.lastIndexOf("\n"));
  if (sentence > max * 0.6) return chars.slice(0, sentence + 1).trim();
  const word = chars.lastIndexOf(" ");
  return `${(word > max * 0.5 ? chars.slice(0, word) : chars).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

// Keeps the first n hashtags and removes the rest.
export function limitHashtags(text: string, n: number) {
  let seen = 0;
  return text
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, (m) => (++seen <= n ? m : ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export type PostInput = { message: string; title: string; summary: string; url: string; hasImage: boolean };
export type FittedPost = { network: SocialNetwork; text: string; chars: number; max: number; trimmed: boolean; skip?: string; notes: string[] };

export function fitPost(network: SocialNetwork, input: PostInput): FittedPost {
  const rule = SOCIAL_RULES[network];
  const msg = plainText(input.message);
  const notes: string[] = [];
  let text: string;
  let skip: string | undefined;

  if (network === "x") {
    // Text plus a blank line plus the link (counted as 23) must fit in 280.
    const room = rule.max - X_LINK_LENGTH - 2;
    const body = fit(msg, room);
    text = `${body}\n\n${input.url}`;
    const chars = charCount(body) + 2 + X_LINK_LENGTH;
    if (body !== msg) notes.push("Shortened to fit 280 characters with the link.");
    return { network, text, chars, max: rule.max, trimmed: body !== msg, notes };
  }

  if (network === "instagram") {
    const tags = limitHashtags(msg, INSTAGRAM_HASHTAG_MAX);
    if (tags !== msg) notes.push(`Hashtags cut to ${INSTAGRAM_HASHTAG_MAX}.`);
    const cta = "\n\nRead the full article at labb.com/news (link in bio).";
    const body = fit(tags, rule.max - charCount(cta));
    text = `${body}${cta}`;
    if (!input.hasImage) skip = "Instagram needs a cover image. Add one to the article.";
    else notes.push("Cover is sent as a 1080×1350 JPEG (4:5), cropped to the most important area.");
    if (body !== tags) notes.push("Shortened to fit 2,200 characters.");
    return { network, text, chars: charCount(text), max: rule.max, trimmed: body !== tags, skip, notes };
  }

  // LinkedIn and Facebook: the link goes out as a preview card, so the text doesn't repeat it.
  text = fit(msg, rule.max);
  if (text !== msg) notes.push(`Shortened to fit ${rule.max.toLocaleString()} characters.`);
  const firstLine = text.split("\n")[0];
  if (charCount(firstLine) > rule.fold) notes.push(`Only the first ${rule.fold} characters show before "see more". Lead with the hook.`);
  return { network, text, chars: charCount(text), max: rule.max, trimmed: text !== msg, notes };
}

// LinkedIn link-card fields.
export const linkedinTitle = (title: string) => fit(plainText(title), LINKEDIN_TITLE_MAX);
export const linkedinDescription = (summary: string) => fit(plainText(summary), LINKEDIN_DESCRIPTION_MAX);

// LinkedIn's posts API reads text as "little text format", where these characters are markup:
// | { } @ [ ] ( ) < > # \ * _ ~. Unescaped, they can cut a post short or drop text, so escape them.
export const escapeLinkedIn = (s: string) => s.replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => `\\${c}`);

