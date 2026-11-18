import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Faq } from "@/components/ui";
import { COURSE_TYPES, listCourses, type Course } from "@/lib/courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Labb Certifications: Online Drug Testing Certification Courses",
  description:
    "Paid online certification courses from Labb, built on Labb's written training documents. Enroll in the Clinic Owner certification today.",
  alternates: { canonical: "/certifications" },
};

const faqs = [
  { q: "How do the courses work?", a: "Each certification is a paid online course built on Labb's written training documents. Every chapter ends with an exam. You need about 85% on each chapter exam to pass and open the next chapter." },
  { q: "How do I get access after I pay?", a: "The learner gets an email to set up a Labb account. Progress saves to that account, so they can stop and pick up where they left off on any device." },
  { q: "Are certifications included for Channel Partner Program members?", a: "Yes. Some certifications are included free, and the rest are discounted for active Channel Partner Program members. Sign in before you check out to get the CPP price." },
  { q: "Is any of this DOT training?", a: "No. Labb certifications cover company (non-DOT) testing. They do not qualify anyone to perform a DOT or other regulated collection or alcohol test." },
];

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;
function CertItem({ c }: { c: Course }) {
  const href = `/certifications/${c.slug}`;
  return (
    <article className="cert-item">
      <div className="ci-main">
        <span className="ci-type">{COURSE_TYPES[c.type]} certification</span>
        <h3><Link href={href}>{c.short}</Link></h3>
        <p>{c.overview}</p>
        <p className="ci-for"><strong>For:</strong> {c.forWho}</p>
      </div>
      <dl className="ci-specs">
        <div><dt>Questions</dt><dd>{c.questions}</dd></div>
        {c.pages ? <div><dt>Pages</dt><dd>{c.pages}</dd></div> : <div><dt>Chapters</dt><dd>{c.chapters}</dd></div>}
        <div><dt>To pass</dt><dd>{c.passPct}%</dd></div>
      </dl>
      <div className="ci-buy">
        <div className="ci-price">{money(c.priceCents!)}<span>per learner</span></div>
        <Link className="btn btn-primary" href={`${href}#enroll`}>Start now</Link>
        <Link className="btn btn-outline" href={href}>Learn more</Link>
        {c.cppIncluded ? <span className="ci-note">Included for CPP members</span> : c.cppDiscountPct ? <span className="ci-note">{c.cppDiscountPct}% off for CPP members</span> : null}
      </div>
    </article>
  );
}

export default async function Page() {
  const all = await listCourses();
  const open = all.filter((c) => c.forSale);
  const soon = all.filter((c) => !c.forSale && c.status !== "draft");
  return (
    <>
      <section className="cert-head">
        <div className="wrap">
          <span className="eyebrow">Labb certifications</span>
          <h1>Online certification courses</h1>
          <p>Paid online courses built on Labb&apos;s training documents. Enroll, get your login by email, and start right away.</p>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Training", href: "/training" }, { name: "Certifications", href: "/certifications" }]} />

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="cert-bar">
            <h2>Available now <span>{open.length}</span></h2>
          </div>
          {!open.length && <p>New certifications are on the way. Call {"(877) 868-9967"} or email info@labb.com with questions.</p>}
          <div className="cert-list">
            {open.map((c) => <CertItem key={c.slug} c={c} />)}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div className="cert-bar">
            <h2>Coming soon <span>{soon.length}</span></h2>
          </div>
          <div className="cert-soon">
            {soon.map((c) => (
              <div key={c.slug} className="cs-item">
                <span className="ci-type">{COURSE_TYPES[c.type]}</span>
                <h3>{c.hasFile ? <Link href={`/certifications/${c.slug}`}>{c.short}</Link> : c.short}</h3>
                <p>{c.overview}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>About Labb certifications</h2>
          <Faq items={faqs} />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
