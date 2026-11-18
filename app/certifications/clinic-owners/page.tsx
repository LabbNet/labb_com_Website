import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Faq } from "@/components/ui";
import chapters from "@/content/clinic-owners-chapters.json";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "LabbHR Clinic Owners Course: Clinic Owner Certification",
  description:
    "An 11-chapter online course for clinic owners and operators: rapid test technology, drug classes, collections, lab testing, package inserts, the MRO process, alcohol testing, communicating results, privacy and quality control. $199, included for CPP members.",
  alternates: { canonical: "/certifications/clinic-owners" },
};

const faqs = [
  { q: "How does the course work?", a: "Eleven chapters, taken in order. Each chapter ends with an exam, and passing it opens the next chapter. Your progress saves to your Labb account, so you can stop and pick up on any device." },
  { q: "What do I get when I finish?", a: "A certificate of completion with your name, completion date and certificate number. You can print it, save it as a PDF or email it to your employer." },
  { q: "Is this DOT training?", a: "No. This is an educational course. It is not a DOT collector, breath alcohol technician (BAT) or screening test technician (STT) qualification." },
  { q: "Is it included in the Channel Partner Program?", a: "Yes. Active CPP members open the course from the member area at no charge." },
  { q: "Can I buy it for someone on my team?", a: `Enter their name and email at checkout and the course goes to their account. For several people, call ${site.phone} and Labb will set it up.` },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ checkout?: string; error?: string }> }) {
  const { checkout, error } = await searchParams;
  const parts = [...new Set(chapters.map((c) => c.part))];
  const totalQ = chapters.reduce((t, c) => t + c.questions, 0);
  return (
    <>
      <section className="section course-hero">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Position certification · Clinic Owner</span>
            <h1>LabbHR Clinic Owners Course</h1>
            <p className="lede">Everything a clinic owner or operator needs to know about workplace drug testing, from how a rapid test works to the MRO process, privacy and quality control.</p>
            <div className="stats" style={{ marginTop: 22, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div><strong>11</strong><span>Chapters</span></div>
              <div><strong>{totalQ}</strong><span>Exam questions</span></div>
              <div><strong>Online</strong><span>Saves as you go</span></div>
              <div><strong>Certificate</strong><span>On completion</span></div>
            </div>
          </div>
          <div className="hero-card enroll-card" id="enroll">
            <p className="enroll-price"><strong>$199</strong> per learner</p>
            <p className="fine" style={{ marginTop: 0 }}>Included for active Channel Partner Program members. <Link href="/login?next=/learn">Sign in</Link> to open it.</p>
            {checkout === "soon" && <div className="form-error" role="status">Card checkout opens soon. To enroll now, call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${site.email}`}>{site.email}</a> and Labb will set up your course.</div>}
            {checkout === "cancelled" && <div className="form-error" role="status">Checkout was cancelled. You haven&apos;t been charged.</div>}
            {error === "details" && <div className="form-error" role="status">Enter the learner&apos;s full name and a valid email.</div>}
            <form action="/api/learn/checkout" method="post" className="fields" style={{ gridTemplateColumns: "1fr", marginTop: 12 }}>
              <input type="hidden" name="course" value="clinic-owners" />
              <div className="field"><label htmlFor="e-name">Learner&apos;s full name</label><input id="e-name" name="name" required maxLength={120} autoComplete="name" /></div>
              <div className="field"><label htmlFor="e-email">Learner&apos;s email</label><input id="e-email" name="email" type="email" required maxLength={160} autoComplete="email" /></div>
              <button className="btn btn-primary btn-block" type="submit">Enroll for $199</button>
              <p className="fine" style={{ margin: 0 }}>The learner gets an email to set up their account and start the course.</p>
            </form>
          </div>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Training", href: "/training" }, { name: "Certifications", href: "/certifications" }, { name: "Clinic Owners Course", href: "/certifications/clinic-owners" }]} />

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <h2>What the course covers</h2>
          {parts.map((p) => (
            <div key={p} className="course-part">
              <h3 className="lib-sub">{p.replace(/^PART (\w+) /, "Part $1: ").replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase())}</h3>
              <ol className="chapter-list">
                {chapters.filter((c) => c.part === p).map((c) => (
                  <li key={c.n}>
                    <span className="ch-n">{c.n}</span>
                    <div><strong>{c.title}</strong><p>{c.desc}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="fine">Each chapter ends with an exam you need to pass before the next chapter opens. Educational course only; not a DOT collector, BAT or STT qualification.</p>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <h2>Questions</h2>
          <Faq items={faqs} />
        </div>
      </section>
    </>
  );
}
