import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand } from "@/components/ui";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Drug Testing News and Insights",
  description: "Articles on rapid drug testing, oral fluid vs urine, test panels, privacy and running a workplace screening program.",
  alternates: { canonical: "/news" },
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export default function NewsIndex() {
  return (
    <>
      <Breadcrumbs items={[{ name: "News", href: "/news" }]} />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <span className="eyebrow">News and insights</span>
          <h1>Drug testing news and insights</h1>
          <div className="grid g3" style={{ marginTop: 36 }}>
            {articles.map((a) => (
              <Link key={a.slug} href={`/news/${a.slug}`} className="card card-link" style={{ padding: 0, overflow: "hidden" }}>
                {a.image && <Image src={a.image} alt="" width={a.imageW || 1200} height={a.imageH || 800} sizes="(max-width: 700px) 92vw, 380px" style={{ aspectRatio: "16 / 10", objectFit: "cover", width: "100%" }} />}
                <div style={{ padding: 22, display: "flex", flexDirection: "column", flex: 1 }}>
                  <p className="article-meta" style={{ marginBottom: 6 }}>{fmt(a.publishedAt)}</p>
                  <h2 style={{ fontSize: "1.15rem" }}>{a.title}</h2>
                  <p>{a.description}</p>
                  <span className="more">Read article</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
