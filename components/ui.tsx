import Image from "next/image";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { badgeLabel, type Kit } from "@/lib/kits";

export function LabbHR() {
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      Labb<b style={{ fontWeight: 800 }}>HR</b>
    </span>
  );
}

export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  const all = [{ name: "Home", href: "/" }, ...items];
  return (
    <>
      <nav className="crumbs wrap" aria-label="Breadcrumb">
        <ol>
          {all.map((c, i) =>
            i === all.length - 1 ? (
              <li key={c.href} aria-current="page">{c.name}</li>
            ) : (
              <li key={c.href}><Link href={c.href}>{c.name}</Link></li>
            ),
          )}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
        }}
      />
    </>
  );
}

export function CtaBand({
  title = "Ready to simplify your drug testing?",
  body = "Get a quote or a free sample, and a Labb specialist will help you set up, certify your team and go live.",
  href = "/get-a-quote",
  label = "Get a Quote",
}: { title?: string; body?: string; href?: string; label?: string }) {
  return (
    <section className="cta-band">
      <div className="wrap">
        <div>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <Link href={href} className="btn btn-light">{label}</Link>
          <Link href="/get-a-quote?sample=1" className="btn btn-ghost">Request a free sample</Link>
        </div>
      </div>
    </section>
  );
}

export function KitCard({ kit }: { kit: Kit }) {
  return (
    <Link href={`/test-kits/${kit.slug}`} className="card kit-card card-link">
      <div className="ph">
        <Image src={kit.image} alt={`${kit.name} ${kit.specimen.toLowerCase()} drug screen`} width={600} height={600} sizes="(max-width: 700px) 90vw, 300px" />
      </div>
      <div className="bd">
        <span className={`pill${kit.badge === "FUO" ? " forensic" : ""}`}>{badgeLabel[kit.badge]}</span>
        <h3>{kit.name}</h3>
        <p>{kit.summary}</p>
        <div className="chips">
          <span>{kit.specimen}</span>
          <span>{kit.drugCount} drugs</span>
          <span>{kit.readTime} read</span>
        </div>
        <span className="more">View panel and cutoffs</span>
      </div>
    </Link>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <>
      <div className="faq">
        {items.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </>
  );
}

export function Checks({ items }: { items: string[] }) {
  return (
    <ul className="checks">
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
  );
}
