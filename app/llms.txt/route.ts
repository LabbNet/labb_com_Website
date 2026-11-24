import { sql } from "@/lib/db";
import { resources } from "@/lib/resources";
import { publishedKits } from "@/lib/kits";
import { drugProfiles } from "@/lib/drugProfiles";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

// /llms.txt: a plain map of labb.com for AI assistants and AI search (guidebooks, kits, drug profiles, expert answers).
export async function GET() {
  const answers = await sql()<{ question: string; slug: string }[]>`
    select question, slug from ask_questions where status = 'approved' and published and slug is not null order by views desc, reviewed_at desc limit 500`.catch(() => []);
  const lines = [
    "# Labb",
    "",
    "> Labb (Ramsey Diagnostics Corporation d/b/a Labb, Norfolk, Virginia) provides rapid drug test kits, the Labb Station digital reader, the LabbHR screening platform, training and certification, and a Channel Partner Program for drug testing clinics. Contact: info@labb.com, (877) 868-9967.",
    "",
    "## Ask an Expert",
    `- [Ask an Expert](${absoluteUrl("/ask")}): ask drug testing and background screening questions; answers are reviewed by the Labb team`,
    ...answers.map((a) => `- [${a.question.replace(/[[\]]/g, "")}](${absoluteUrl(`/ask/${a.slug}`)})`),
    "",
    "## Guidebooks",
    ...resources.map((r) => `- [${r.title}](${absoluteUrl(`/resources/${r.slug}`)}): ${r.metaDescription}`),
    "",
    "## Test kits",
    ...publishedKits.map((k) => `- [${k.name} (${k.code})](${absoluteUrl(`/test-kits/${k.slug}`)}): ${k.specimen}, ${k.drugCount} drugs: ${k.drugs.map((d) => d.code).join(", ")}`),
    "",
    "## Drug profiles",
    ...drugProfiles.map((d) => `- [${d.drug}](${absoluteUrl(`/drugs/${d.slug}`)}): ${d.kicker}`),
    "",
    "## Software",
    `- [Find your platform](${absoluteUrl("/find-your-platform")})`,
    `- [Labb Station vs LabbHR](${absoluteUrl("/compare")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
