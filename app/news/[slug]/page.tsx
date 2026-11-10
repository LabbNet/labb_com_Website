import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, JsonLd } from "@/components/ui";
import { articles, getArticle } from "@/lib/articles";
import { absoluteUrl, site } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle((await params).slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/news/${a.slug}` },
    openGraph: { type: "article", publishedTime: a.publishedAt, images: a.image ? [{ url: a.image }] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const more = articles.filter((x) => x.slug !== a.slug).slice(0, 3);
  const date = new Date(a.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <Breadcrumbs items={[{ name: "News", href: "/news" }, { name: a.title.length > 48 ? `${a.title.slice(0, 46)}...` : a.title, href: `/news/${a.slug}` }]} />
      <article className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <header className="prose" style={{ marginBottom: 32 }}>
            <p className="article-meta">{date} · {Math.max(1, Math.round(a.words / 220))} min read</p>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.9rem)" }}>{a.title}</h1>
          </header>
          {a.image && (
            <Image src={a.image} alt={a.imageAlt || ""} width={a.imageW || 1200} height={a.imageH || 800} priority sizes="(max-width: 900px) 92vw, 900px" style={{ maxWidth: 900, margin: "0 auto 40px", borderRadius: 16 }} />
          )}
          <div className="prose" dangerouslySetInnerHTML={{ __html: a.html }} />
          <aside className="prose" style={{ marginTop: 48 }}>
            <div className="card top">
              <h2 style={{ fontSize: "1.3rem" }}>Run rapid testing in-house</h2>
              <p>Get a quote or a free sample, and see how an objective digital read works for your program.</p>
              <div className="btn-row" style={{ marginTop: 16 }}><Link href="/get-a-quote" className="btn btn-primary">Get a Quote</Link></div>
            </div>
          </aside>
        </div>
      </article>
      <section className="section soft">
        <div className="wrap">
          <h2>More articles</h2>
          <div className="grid g3" style={{ marginTop: 20 }}>
            {more.map((m) => (
              <Link key={m.slug} href={`/news/${m.slug}`} className="card card-link rail">
                <h3 style={{ fontSize: "1.05rem" }}>{m.title}</h3>
                <span className="more">Read article</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: a.title,
          description: a.description,
          datePublished: a.publishedAt,
          image: a.image ? absoluteUrl(a.image) : undefined,
          author: { "@type": "Organization", name: "Labb" },
          publisher: { "@id": `${site.url}/#org` },
          mainEntityOfPage: absoluteUrl(`/news/${a.slug}`),
        }}
      />
    </>
  );
}
