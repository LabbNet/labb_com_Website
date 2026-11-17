import Link from "next/link";
import { Alert } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";
import { publishedKits } from "@/lib/kits";
import { library } from "@/lib/resources";
import { lmsUrl } from "@/lib/commerce";
import { cppSupportEmails, site } from "@/lib/site";
import { IconHandbook, IconMarketing, IconReference, IconDataSheet, IconCertification, IconSupport, IconDrugProfile } from "@/components/ResourceIcons";
import { drugSheets } from "@/lib/drugSheets";

const GROUP_ICON: Record<string, () => React.JSX.Element> = {
  "Clinic Owners Handbooks": IconHandbook,
  "Marketing sheets": IconMarketing,
  Reference: IconReference,
};

function CardHead({ Icon, title }: { Icon: () => React.JSX.Element; title: string }) {
  return (
    <div className="res-head">
      <span className="res-icon"><Icon /></span>
      <h2>{title}</h2>
    </div>
  );
}

export default async function MembersHome({ searchParams }: { searchParams: Promise<{ welcome?: string; reset?: string }> }) {
  const { welcome, reset } = await searchParams;
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        {welcome && <Alert kind="ok">Your account is set up. Welcome to the Labb Channel Partner Program.</Alert>}
        {reset && <Alert kind="ok">Your password has been changed.</Alert>}
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>Welcome, {m.name.split(" ")[0]}.</h1>
        <p className="lede">The current version of every handbook, guidebook, data sheet and drug profile for Labb partners. Please don&apos;t share these files or your login outside your organization.</p>

        <div className="grid g3" style={{ marginTop: 32 }}>
          {library.map((g) => (
            <div key={g.group} className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
              <CardHead Icon={GROUP_ICON[g.group] || IconReference} title={g.group} />
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {g.items.map((i) => (
                  <li key={i.url} style={{ marginBottom: 8 }}>
                    <a href={i.url} target="_blank" rel="noopener">{i.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
            <CardHead Icon={IconDataSheet} title="Product data sheets" />
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {publishedKits.filter((k) => k.dataSheet).map((k) => (
                <li key={k.slug} style={{ marginBottom: 6 }}><a href={k.dataSheet} target="_blank" rel="noopener">{k.name}</a></li>
              ))}
            </ul>
          </div>
          <div className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
            <CardHead Icon={IconCertification} title="Certifications" />
            <p>Product, specimen, software and position certifications for you and your collectors.</p>
            <p style={{ marginTop: 12 }}>
              {lmsUrl ? <a className="btn btn-primary" href={lmsUrl}>Open Labb Learning</a> : <Link href="/certifications">See certifications</Link>}
            </p>
          </div>
          <div className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
            <CardHead Icon={IconSupport} title="Member support" />
            <p>Pricing help, larger opportunities and program questions.</p>
            <p style={{ marginTop: 12 }}>
              <a href={site.phoneHref}>{site.phone}</a>
              <br />
              <a href={`mailto:${cppSupportEmails[0]}`}>{cppSupportEmails[0]}</a> or <a href={`mailto:${cppSupportEmails[1]}`}>{cppSupportEmails[1]}</a>
            </p>
            <p style={{ marginTop: 10, fontSize: "0.85rem" }}>Give Labb advance notice of any account over 500 tests a month.</p>
          </div>
        </div>

        <div id="drug-profiles" className="card top drug-profiles" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)", marginTop: 32 }}>
          <CardHead Icon={IconDrugProfile} title="Drug Profile Series" />
          <p style={{ marginTop: 0 }}>Two-page profiles for each drug and alcohol test on Labb rapid tests, with the Labb Screening Priority Index. Share them with employer clients to explain what a panel covers.</p>
          <ol className="dp-list">
            {drugSheets.map((d) => (
              <li key={d.slug}>
                <span className="dp-no">{String(d.no).padStart(2, "0")}</span>
                <span className="dp-name">
                  <a href={`/api/members/drug-sheets/${d.slug}`} target="_blank" rel="noopener">{d.drug}</a>
                  <span className="sub">{d.drugClass} · v{d.version}</span>
                </span>
                <a className="dp-dl" href={`/api/members/drug-sheets/${d.slug}?download=1`} aria-label={`Download the ${d.drug} profile`}>Download</a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
