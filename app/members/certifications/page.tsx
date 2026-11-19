import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { COURSE_TYPES, cppFree, cppPriceCents, isActiveCpp, listCourses } from "@/lib/courses";
import { cppEmail, site } from "@/lib/site";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;

// CPP member pricing for certification courses. Only shown here, never on public pages.
export default async function MemberCertifications({ searchParams }: { searchParams: Promise<{ checkout?: string; error?: string }> }) {
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  const { checkout, error } = await searchParams;
  const active = await isActiveCpp(m);
  const courses = (await listCourses()).filter((c) => c.forSale);

  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>CPP certification pricing</h1>
        <p className="lede">
          Certification courses at Channel Partner Program pricing. Enroll yourself or anyone on your staff: enter their name and email and the
          course goes to their account. Member pricing is confidential to CPP members.
        </p>
        {!active && m.role !== "admin" && <div className="form-error" role="status">CPP pricing applies to active CPP memberships. Contact <a href={`mailto:${cppEmail}`}>{cppEmail}</a> with questions.</div>}
        {checkout === "soon" && <div className="form-error" role="status">Card checkout opens soon. To enroll now, call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${cppEmail}`}>{cppEmail}</a>.</div>}
        {checkout === "cancelled" && <div className="form-error" role="status">Checkout was cancelled. You haven&apos;t been charged.</div>}
        {error === "details" && <div className="form-error" role="status">Enter the learner&apos;s full name and a valid email.</div>}

        <div className="mc-list">
          {courses.map((c) => {
            const free = cppFree(c);
            const cpp = cppPriceCents(c);
            const price = free ? 0 : cpp ?? c.priceCents!;
            return (
              <article key={c.slug} id={c.slug} className="mc-item">
                <div className="mc-info">
                  <span className="ci-type">{COURSE_TYPES[c.type]} certification</span>
                  <h2>{c.short}</h2>
                  <p>{c.overview}</p>
                  <p className="mc-facts">{c.chapters} chapters · {c.questions} exam questions · {c.passPct}% to pass{c.pages ? ` · ${c.pages} pages` : ""} · <Link href={`/certifications/${c.slug}`}>Course details</Link></p>
                </div>
                <div className="mc-buy">
                  <div className="mc-price">
                    <strong>{free ? "Included" : money(price)}</strong>
                    <span><s>{money(c.priceCents!)}</s> {free ? "with your membership" : c.cppDiscountPct ? `CPP price, ${c.cppDiscountPct}% off` : "per learner"}</span>
                  </div>
                  {free ? (
                    <>
                      <a className="btn btn-primary btn-block" href={`/learn/${c.slug}/play`}>Open the course</a>
                      <p className="fine">Enrolling staff? Call {site.phone} or email {cppEmail} and Labb will set them up.</p>
                    </>
                  ) : (
                    <form action="/api/learn/checkout" method="post" className="mc-form">
                      <input type="hidden" name="course" value={c.slug} />
                      <input type="hidden" name="portal" value="1" />
                      <label htmlFor={`n-${c.slug}`}>Learner&apos;s name</label>
                      <input id={`n-${c.slug}`} name="name" required maxLength={120} defaultValue={m.name} />
                      <label htmlFor={`e-${c.slug}`}>Learner&apos;s email</label>
                      <input id={`e-${c.slug}`} name="email" type="email" required maxLength={160} defaultValue={m.email} />
                      <button className="btn btn-primary btn-block" type="submit">Enroll for {money(price)}</button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
