import Link from "next/link";
import { Alert } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";
import { publishedKits } from "@/lib/kits";
import { library } from "@/lib/resources";
import { cppEmail, site } from "@/lib/site";
import { IconGuidebook, IconMarketing, IconReference, IconDataSheet, IconCertification, IconSupport, IconDrugProfile } from "@/components/ResourceIcons";
import { drugSheets } from "@/lib/drugSheets";

const groupItems = (name: string) => library.find((g) => g.group === name)?.items ?? [];

function SectionHead({ id, Icon, kicker, title, text, count }: { id: string; Icon: () => React.JSX.Element; kicker: string; title: string; text: string; count?: number }) {
  return (
    <div className="lib-head" id={id}>
      <span className="res-icon"><Icon /></span>
      <div>
        <p className="lib-kicker">{kicker}{count != null ? ` · ${count}` : ""}</p>
        <h2>{title}</h2>
        <p className="lib-text">{text}</p>
      </div>
    </div>
  );
}

function DocTile({ title, url, tag }: { title: string; url: string; tag?: string }) {
  const ext = url.startsWith("http") && !url.includes("drive.google") ? "Web" : "PDF";
  return (
    <a className="doc-tile" href={url} target="_blank" rel="noopener">
      <span className="doc-type">{ext}</span>
      <span className="doc-title">{title}</span>
      {tag && <span className="doc-tag">{tag}</span>}
      <span className="doc-open" aria-hidden="true">Open &rarr;</span>
    </a>
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
        <p className="lede">The current version of every guidebook, data sheet and drug profile for Labb partners. Please don&apos;t share these files or your login outside your organization.</p>

        <nav className="lib-jump" aria-label="Jump to a section">
          <a href="#guidebooks">Guidebooks</a>
          <a href="#marketing">Marketing</a>
          <a href="#data-sheets">Data sheets</a>
          <a href="#drug-profiles">Drug profiles</a>
          <a href="#reference">Reference</a>
          <a href="#support">Training and support</a>
        </nav>

        <section className="lib-section">
          <SectionHead id="guidebooks" Icon={IconGuidebook} kicker="Guidebooks" title="Run your clinic. Sell to employers." text="Manuals for running your collection site, plus guidebooks to hand to the employers you sell to." count={groupItems("Clinic Owners Guidebooks").length + groupItems("Employer Guidebooks").length} />
          <h3 className="lib-sub">For your clinic</h3>
          <div className="doc-grid">
            {groupItems("Clinic Owners Guidebooks").map((i) => <DocTile key={i.url} {...i} tag="Clinic" />)}
          </div>
          <h3 className="lib-sub">Share with employers</h3>
          <div className="doc-grid">
            {groupItems("Employer Guidebooks").map((i) => <DocTile key={i.url} title={i.title.includes("Guidebook") ? i.title : `${i.title} Guidebook`} url={i.url} tag="Employer" />)}
          </div>
        </section>

        <section className="lib-section">
          <SectionHead id="marketing" Icon={IconMarketing} kicker="Marketing" title="Booklets and brochures" text="Product booklets to send to prospects or print for trade shows." count={groupItems("Marketing sheets").length} />
          <div className="doc-grid">
            {groupItems("Marketing sheets").map((i) => <DocTile key={i.url} {...i} />)}
          </div>
        </section>

        <section className="lib-section">
          <SectionHead id="data-sheets" Icon={IconDataSheet} kicker="Product data sheets" title="Test kit specifications" text="Panels, cutoffs and specimen details for every Labb rapid test kit." count={publishedKits.filter((k) => k.dataSheet).length} />
          {(["Urine", "Oral fluid"] as const).map((sp) => {
            const kits = publishedKits.filter((k) => k.dataSheet && k.specimen === sp);
            if (!kits.length) return null;
            return (
              <div key={sp}>
                <h3 className="lib-sub">{sp === "Urine" ? "Urine cups" : "Oral fluid"}</h3>
                <div className="kit-grid">
                  {kits.map((k) => (
                    <a key={k.slug} className="kit-tile" href={k.dataSheet} target="_blank" rel="noopener">
                      {k.image && <img src={k.image} alt="" loading="lazy" />}
                      <span className="kit-name">{k.code}</span>
                      <span className="kit-sub">{k.name.replace(k.code, "").replace(/^[\s:·-]+/, "") || sp}</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="lib-section">
          <SectionHead id="drug-profiles" Icon={IconDrugProfile} kicker="Drug Profile Series" title="One profile per drug" text="Two-page profiles for each drug and alcohol test on Labb rapid tests, with the Labb Screening Priority Index. Share them with employer clients to explain what a panel covers." count={drugSheets.length} />
          <div className="dp-grid">
            {drugSheets.map((d) => (
              <div key={d.slug} className="dp-tile">
                <span className="dp-no">{String(d.no).padStart(2, "0")}</span>
                <a className="dp-drug" href={`/api/members/drug-sheets/${d.slug}`} target="_blank" rel="noopener">{d.drug}</a>
                <span className="dp-class">{d.drugClass}</span>
                <a className="dp-dl" href={`/api/members/drug-sheets/${d.slug}?download=1`} aria-label={`Download the ${d.drug} profile`} title="Download">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="lib-section">
          <SectionHead id="reference" Icon={IconReference} kicker="Reference" title="Drug use data and drug guide" text="Background for building the right panel for each client." count={groupItems("Reference").length} />
          <div className="doc-grid">
            {groupItems("Reference").map((i) => <DocTile key={i.url} {...i} />)}
          </div>
        </section>

        <section className="lib-support" id="support">
          <div>
            <span className="res-icon"><IconCertification /></span>
            <h2>Certifications and training</h2>
            <p>Certification courses at CPP member pricing, with some included free with your membership. Enroll yourself or your staff, and progress saves as you go.</p>
            <Link className="btn btn-primary" href="/members/certifications">See CPP certification pricing</Link>
            <p style={{ marginTop: 12 }}><a href="/learn">Open my courses</a></p>
          </div>
          <div>
            <span className="res-icon"><IconSupport /></span>
            <h2>Member support</h2>
            <p>Pricing help, larger opportunities and program questions.</p>
            <p className="lib-contact"><a href={`mailto:${cppEmail}`}>{cppEmail}</a><br /><a href={site.phoneHref}>{site.phone}</a></p>
            <p className="fine">Give Labb advance notice of any account over 500 tests a month.</p>
          </div>
        </section>
      </div>
    </section>
  );
}
