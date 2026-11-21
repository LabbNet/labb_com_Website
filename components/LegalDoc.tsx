import fs from "node:fs";
import path from "node:path";
import { Breadcrumbs } from "@/components/ui";
import { renderBody } from "@/lib/articleFormat";

// Renders a legal document kept in content/legal/*.md, with anchors and a contents list.
export function LegalDoc({ file, title, eyebrow, updated, crumbs, intro }: {
  file: string; title: string; eyebrow?: string; updated: string; crumbs: { name: string; href: string }[]; intro?: React.ReactNode;
}) {
  const src = fs.readFileSync(path.join(process.cwd(), "content/legal", file), "utf8");
  const toc: { id: string; text: string }[] = [];
  const html = renderBody(src).replace(/<h2>(.*?)<\/h2>/g, (_m, t: string) => {
    const text = t.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'");
    const id = text.toLowerCase().replace(/^(\d+)\.\s*/, "s$1-").replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").slice(0, 60);
    toc.push({ id, text });
    return `<h2 id="${id}">${t}</h2>`;
  });
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="prose wrap legal-doc">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          <p className="article-meta">Last updated: {updated}</p>
          {intro}
          <nav className="legal-toc" aria-label="Contents">
            <p><strong>Contents</strong></p>
            <ol>{toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.text.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
          </nav>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </section>
    </>
  );
}
