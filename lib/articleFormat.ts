// Plain-text article bodies to HTML. Editors write paragraphs separated by a blank line and can use:
// "## Heading", "### Subheading", "- bullet", "1. numbered", "**bold**", "*italic*", "[link text](https://...)",
// and "> quote". Everything else is escaped.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function inline(s: string) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_m, text, url) => {
    const ext = /^https?:/.test(url) && !/^https?:\/\/(www\.)?labb\.com/.test(url);
    return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return t;
}

export function renderBody(src: string) {
  const blocks = src.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  return blocks
    .map((b) => {
      const lines = b.split("\n").map((l) => l.trimEnd());
      if (/^###\s/.test(lines[0])) return `<h3>${inline(lines[0].replace(/^###\s+/, ""))}</h3>${lines.length > 1 ? `<p>${lines.slice(1).map(inline).join("<br>")}</p>` : ""}`;
      if (/^##\s/.test(lines[0])) return `<h2>${inline(lines[0].replace(/^##\s+/, ""))}</h2>${lines.length > 1 ? `<p>${lines.slice(1).map(inline).join("<br>")}</p>` : ""}`;
      if (lines.every((l) => /^[-*]\s/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      if (lines.every((l) => /^\d+[.)]\s/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
      if (lines.every((l) => /^>\s?/.test(l))) return `<blockquote><p>${lines.map((l) => inline(l.replace(/^>\s?/, ""))).join("<br>")}</p></blockquote>`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("\n");
}

export const wordCount = (s: string) => (s.match(/\S+/g) || []).length;
export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "article";
