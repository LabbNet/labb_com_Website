import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Faq } from "@/components/ui";
import { COURSE_TYPES, courseOutline, getCourse } from "@/lib/courses";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCourse((await params).slug);
  if (!c || c.status === "draft") return { title: "Course not found", robots: { index: false } };
  return {
    title: `${c.title}: ${c.short} Certification`,
    description: `${c.overview}${c.forSale && c.priceCents !== null ? ` ${money(c.priceCents)} per learner.` : ""}`.slice(0, 300),
    alternates: { canonical: `/certifications/${c.slug}` },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string; error?: string }> }) {
  const c = await getCourse((await params).slug);
  if (!c || c.status === "draft") notFound();
  const { checkout, error } = await searchParams;
  const chapters = await courseOutline(c);
  const parts = [...new Set(chapters.map((ch) => ch.part))];
  const list = c.forSale && c.priceCents !== null ? money(c.priceCents) : null;
  const price = list;

  const faqs = [
    { q: "How does the course work?", a: `${c.chapters ? `${c.chapters} chapters, taken in order. ` : ""}Each chapter ends with an exam. You need ${c.passPct || 85}% on a chapter exam to pass it and open the next chapter. Your progress saves to your Labb account, so you can stop and pick up on any device.` },
    { q: "What do I get when I finish?", a: "A certificate of completion with your name, completion date and certificate number. You can print it, save it as a PDF or email it to your employer." },
    { q: "Is this DOT training?", a: "No. This is an educational course. Completing it is not a DOT certification and does not by itself qualify anyone to perform a DOT collection or alcohol test." },
    { q: "Can I buy it for someone on my team?", a: `Enter their name and email at checkout and the course goes to their account. For several people, call ${site.phone} and Labb will set it up.` },
  ];

  return (
    <>
      <section className="section course-hero">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">{COURSE_TYPES[c.type]} certification · {c.short}</span>
            <h1>{c.title}</h1>
            <p className="lede">{c.overview}</p>
            {c.forWho && <p className="fine"><strong>For:</strong> {c.forWho}</p>}
            {c.hasFile && (
              <div className="stats" style={{ marginTop: 22, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div><strong>{c.chapters}</strong><span>Chapters</span></div>
                <div><strong>{c.questions}</strong><span>Exam questions</span></div>
                <div><strong>{c.passPct}%</strong><span>To pass each chapter exam</span></div>
                {c.pages ? <div><strong>{c.pages}</strong><span>Pages of material</span></div> : <div><strong>Certificate</strong><span>On completion</span></div>}
              </div>
            )}
          </div>
          <div className="hero-card enroll-card" id="enroll">
            {price ? (
              <>
                <p className="enroll-price"><strong>{price}</strong> per learner</p>
                {checkout === "soon" && <div className="form-error" role="status">Card checkout opens soon. To enroll now, call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${site.email}`}>{site.email}</a> and Labb will set up your course.</div>}
                {checkout === "cancelled" && <div className="form-error" role="status">Checkout was cancelled. You haven&apos;t been charged.</div>}
                {error === "details" && <div className="form-error" role="status">Enter the learner&apos;s full name and a valid email.</div>}
                <form action="/api/learn/checkout" method="post" className="fields" style={{ gridTemplateColumns: "1fr", marginTop: 12 }}>
                  <input type="hidden" name="course" value={c.slug} />
                  <div className="field"><label htmlFor="e-name">Learner&apos;s full name</label><input id="e-name" name="name" required maxLength={120} autoComplete="name" /></div>
                  <div className="field"><label htmlFor="e-email">Learner&apos;s email</label><input id="e-email" name="email" type="email" required maxLength={160} autoComplete="email" /></div>
                  <button className="btn btn-primary btn-block" type="submit">Enroll for {price}</button>
                  <p className="fine" style={{ margin: 0 }}>The learner gets an email to set up their account and start the course.</p>
                </form>
              </>
            ) : (
              <>
                <p className="enroll-price"><strong>Coming soon</strong></p>
                <p className="fine" style={{ marginTop: 0 }}>This certification isn&apos;t open for enrollment yet. Questions? Call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
                <Link className="btn btn-outline btn-block" href="/certifications">See available certifications</Link>
              </>
            )}
          </div>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Training", href: "/training" }, { name: "Certifications", href: "/certifications" }, { name: c.short, href: `/certifications/${c.slug}` }]} />

      {chapters.length > 0 && (
        <section className="section" style={{ paddingTop: 24 }}>
          <div className="wrap">
            <h2>What the course covers</h2>
            {parts.map((p) => (
              <div key={p || "all"} className="course-part">
                {p && <h3 className="lib-sub">{p.replace(/^PART (\w+) /, "Part $1: ").replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase())}</h3>}
                <ol className="chapter-list">
                  {chapters.filter((ch) => ch.part === p).map((ch) => (
                    <li key={ch.n}>
                      <span className="ch-n">{ch.n}</span>
                      <div><strong>{ch.title}</strong>{ch.desc && <p>{ch.desc}</p>}</div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="fine">Each chapter ends with an exam. Score {c.passPct}% or higher to pass and open the next chapter. Educational course only; not a DOT certification.</p>
          </div>
        </section>
      )}

      <section className="section soft">
        <div className="wrap">
          <h2>Questions</h2>
          <Faq items={faqs} />
        </div>
      </section>
    </>
  );
}
