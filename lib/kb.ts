import "server-only";
import { createHash } from "node:crypto";
import chunks from "@/content/kb/chunks.json";
import { sql } from "@/lib/db";
import { listArticles } from "@/lib/articles";
import { drugProfiles } from "@/lib/drugProfiles";
import { badgeLabel, publishedKits, type Kit } from "@/lib/kits";

// Knowledge base for Ask an Expert: guidebook and booklet passages (content/kb/chunks.json, built from the PDFs),
// plus every published kit and drug profile, kept in kb_chunks for full-text search.

type Chunk = { id: string; source: string; source_title: string; url: string | null; page: number | null; heading: string | null; body: string };

function kitText(k: Kit) {
  return `${k.name} (${k.code}) is a ${k.specimen.toLowerCase()} ${k.drugCount} drug test kit in the ${k.series}, labeled ${badgeLabel[k.badge]}. ${k.summary} Drugs and cutoffs: ${k.drugs.map((d) => `${d.name} (${d.code}) ${d.cutoff} ng/mL`).join("; ")}.${k.validity ? ` Specimen validity: ${k.validity}.` : ""} Read time: ${k.readTime}. Good for: ${k.goodFor.join(", ")}.`;
}

// labb.com articles, split into passages of about 300 words.
async function articleChunks(): Promise<Chunk[]> {
  const list = await listArticles().catch(() => []);
  return list.flatMap((a) => {
    const text = a.html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<\/(p|h[1-6]|li|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/[ \t]+/g, " ");
    const paras = text.split(/\n+/).map((p) => p.trim()).filter((p) => p.split(" ").length > 4);
    const out: Chunk[] = [];
    let buf: string[] = [];
    const flush = () => { if (buf.length) out.push({ id: `article-${a.slug}-${out.length}`, source: "articles", source_title: a.title, url: `/news/${a.slug}`, page: null, heading: a.title, body: buf.join(" ") }); buf = []; };
    for (const p of paras) { if (buf.join(" ").split(" ").length + p.split(" ").length > 320) flush(); buf.push(p); }
    flush();
    return out;
  });
}

export function allChunks(): Chunk[] {
  const kitChunks: Chunk[] = publishedKits.map((k) => ({ id: `kit-${k.slug}`, source: "test-kits", source_title: `${k.name} kit`, url: `/test-kits/${k.slug}`, page: null, heading: `${k.name} (${k.code})`, body: kitText(k) }));
  const drugChunks: Chunk[] = drugProfiles.map((d) => ({
    id: `drug-${d.slug}`, source: "drug-profiles", source_title: `${d.drug} drug profile`, url: `/drugs/${d.slug}`, page: null, heading: `${d.drug} (${d.drugClass})`,
    body: [d.kicker, d.bottom, d.what, d.how, d.used?.length ? `Used: ${d.used.join("; ")}` : "", d.signs?.length ? `Signs: ${d.signs.join("; ")}` : "", d.work?.length ? `At work: ${d.work.join("; ")}` : "", d.specimen ? `Specimen: ${d.specimen}` : "", d.available ? `Availability: ${d.available}` : "", d.reading ? `Reading: ${d.reading}` : "", `Screening importance: ${d.level}.`].filter(Boolean).join(" "),
  }));
  return [...(chunks as Chunk[]), ...kitChunks, ...drugChunks];
}

// Load the knowledge base into Postgres when its content changed (runs once at server start).
export async function syncKb() {
  try {
    const all = [...allChunks(), ...(await articleChunks())];
    const hash = createHash("sha256").update(JSON.stringify(all)).digest("hex");
    const db = sql();
    const [cur] = await db<{ value: string }[]>`select value from kb_meta where key = 'chunks_hash'`;
    if (cur?.value === hash) return;
    await db.begin(async (tx) => {
      await tx`delete from kb_chunks`;
      for (let i = 0; i < all.length; i += 200) {
        await tx`insert into kb_chunks ${tx(all.slice(i, i + 200).map((c) => ({ ...c, url: c.url ?? null, page: c.page ?? null, heading: c.heading ?? null })), "id", "source", "source_title", "url", "page", "heading", "body")}`;
      }
      await tx`insert into kb_meta (key, value) values ('chunks_hash', ${hash}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
    });
    console.log(`[kb] loaded ${all.length} passages`);
  } catch (e) {
    console.error("[kb] sync failed", e);
  }
}

const STOP = new Set("long after before need needs get make like does a an and are as at be by can do does for from has have how i if in is it its of on or our should that the their them they this to was we what when where which who why will with you your about any there these those would could into than then also just more most some such only other very much many".split(" "));
export const terms = (q: string) => [...new Set(q.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).map((w) => w.replace(/^-+|-+$/g, "")).filter((w) => w.length > 1 && !STOP.has(w)))].slice(0, 24);

export type Hit = { id: string; source: string; source_title: string; url: string | null; page: number | null; heading: string | null; body: string; rank: number };
export async function searchKb(q: string, limit = 8): Promise<Hit[]> {
  const t = terms(q);
  if (!t.length) return [];
  const db = sql();
  const lex = t.map((w) => w.replace(/-/g, " ").split(" ").filter(Boolean).join(" & ")).map((w) => `(${w})`);
  const run = (query: string) => db<Hit[]>`
    with q as (select to_tsquery('english', ${query}) as q)
    select c.id, c.source, c.source_title, c.url, c.page, c.heading, c.body, ts_rank_cd(c.tsv, q.q, 32) as rank
    from kb_chunks c, q where c.tsv @@ q.q order by rank desc limit 120`.catch(() => [] as Hit[]);
  // Score each passage by the rarity (IDF) of the question's terms it contains, headings counting extra,
  // so specific words like "post-accident" outweigh words every passage has, like "drug" and "test".
  const df = await db<{ i: number; n: number; total: number }[]>`
    select i, (select count(*)::int from kb_chunks where tsv @@ to_tsquery('english', x)) as n, (select count(*)::int from kb_chunks) as total
    from unnest(${lex}::text[]) with ordinality as u(x, i)`.catch(() => []);
  const total = df[0]?.total || 1;
  const idf = t.map((_, i) => Math.log((total + 1) / ((df.find((d) => Number(d.i) === i + 1)?.n || 0) + 1)));
  const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
  const esc = (w: string) => stem(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cands = await run(lex.join(" | "));
  if (!cands.length) return [];
  const avg = cands.reduce((n, h) => n + h.body.length, 0) / cands.length;
  const maxScore = idf.reduce((a, b) => a + b, 0);
  // BM25 over the candidates, with a bonus when a term is in the section heading.
  return cands
    .map((h) => {
      const head = (h.heading || "").toLowerCase(), body = h.body.toLowerCase();
      const score = t.reduce((n, w, i) => {
        const tf = (body.match(new RegExp(`\\b${esc(w)}`, "g")) || []).length;
        const part = tf ? (idf[i] * (tf * 2.2)) / (tf + 1.2 * (0.25 + 0.75 * (body.length / avg))) : 0;
        return n + part + (head.includes(stem(w)) ? idf[i] * 0.6 : 0);
      }, 0);
      return { ...h, score };
    })
    .filter((h) => h.score >= maxScore * 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---- Drugs and kits ----
// Words people use for each kit drug code.
const DRUG_WORDS: Record<string, RegExp> = {
  AMP: /\bamp\b|\bamphetamines?\b|adderall/i,
  MET: /\bmet\b|\bm-?amp\b|methamphetamine|\bmeth\b|crystal/i,
  BAR: /\bbar\b|barbiturates?|phenobarbital|butalbital/i,
  BZO: /\bbzo\b|benzodiazepines?|\bbenzos?\b|xanax|alprazolam|valium|diazepam|klonopin|clonazepam|ativan|lorazepam/i,
  COC: /\bcoc\b|cocaine|\bcoke\b|crack/i,
  MTD: /\bmtd\b|methadone/i,
  EDDP: /\beddp\b/i,
  OPI: /\bopi\b|opiates?\b|morphine|codeine|\bmop\b/i,
  "6-MAM": /6-?mam|heroin/i,
  OXY: /\boxy\b|oxycodone|oxycontin|percocet|oxymorphone/i,
  HMO: /\bhmo\b|hydromorphone|dilaudid/i,
  PCP: /\bpcp\b|phencyclidine|angel dust/i,
  THC: /\bthc\b|marijuana|cannabis|\bweed\b|\bpot\b|delta-?9|cannabinoids?(?! synthetic)/i,
  MDMA: /\bmdma\b|ecstasy|molly/i,
  BUP: /\bbup\b|buprenorphine|suboxone|subutex/i,
  FEN: /\bfen\b|\bfty\b|fentanyl/i,
  TRA: /\btra\b|tramadol|ultram/i,
  PPX: /\bppx\b|propoxyphene|darvon/i,
  TCA: /\btca\b|tricyclic/i,
  MQL: /\bmql\b|methaqualone|quaaludes?/i,
  ETG: /\betg\b|ethyl glucuronide/i,
  ALC: /\balcohol\b|\bethanol\b|\bbac\b|\bdrinking\b/i,
  XYL: /\bxyl\b|xylazine|tranq/i,
  LSD: /\blsd\b|\bacid\b/i,
  KRA: /\bkra\b|kratom|mitragynine/i,
  KET: /\bket\b|ketamine/i,
  K3: /\bk2\b|\bk3\b|spice|synthetic (marijuana|cannabinoids?)|ab-?pinaca/i,
};

export function drugsIn(q: string): string[] {
  return Object.entries(DRUG_WORDS).filter(([, re]) => re.test(q)).map(([c]) => c);
}

// Which published kits cover a set of drug codes. Used for questions like "do you have a kit with fentanyl and xylazine?"
export function kitCoverage(codes: string[], specimen?: "Urine" | "Oral fluid" | null) {
  const has = (k: Kit, c: string) => k.drugs.some((d) => d.code === c || (c === "ALC" && d.code === "ETG"));
  const rows = publishedKits.filter((k) => !specimen || k.specimen === specimen).map((k) => ({ kit: k, covered: codes.filter((c) => has(k, c)) }));
  const full = rows.filter((r) => r.covered.length === codes.length).map((r) => r.kit);
  const partial = rows.filter((r) => r.covered.length && r.covered.length < codes.length).sort((a, b) => b.covered.length - a.covered.length);
  const none = codes.filter((c) => !publishedKits.some((k) => (!specimen || k.specimen === specimen) && has(k, c)));
  return { full, partial, none };
}

export const kitTable = () =>
  publishedKits.map((k) => `${k.name} (${k.code}), ${k.specimen}, ${badgeLabel[k.badge]}, /test-kits/${k.slug}: ${k.drugs.map((d) => `${d.code} ${d.name} ${d.cutoff}`).join(", ")}`).join("\n");
