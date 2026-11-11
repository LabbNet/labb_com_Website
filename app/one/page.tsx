import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, LabbHR } from "@/components/ui";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "One by Labb: The Connected Drug Testing Industry",
  description:
    "One by Labb is the ecosystem every LabbHR user connects to, where collection sites, national accounts, TPAs, laboratories, MROs and employers find and work with each other.",
  alternates: { canonical: "/one" },
};

const members = [
  { t: "Collection sites", b: "Get found by the TPAs, national accounts and employers who need collections." },
  { t: "National accounts", b: "Reach sites and partners wherever your clients test." },
  { t: "TPAs", b: "Connect programs to the sites, labs and MROs that deliver them." },
  { t: "Laboratories", b: "Connect with the businesses that send specimens." },
  { t: "MROs", b: "Work alongside the TPAs, sites and employers you serve." },
  { t: "Employers", b: "Find the testing partners that fit your program." },
];

export default function One() {
  return (
    <>
      <PageHero
        eyebrow="One by Labb"
        title="One industry, connected."
        lede={<>One by Labb is the ecosystem every <LabbHR /> user connects to. The people who sell, collect, test and review drug tests, working with each other in one place.</>}
        primary={{ href: "/labbhr#beta", label: "Join through LabbHR" }}
        secondary={{ href: "/labbhr", label: "About LabbHR" }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "One by Labb", href: "/one" }]} />

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Who connects</span>
          <h2>Everyone in the drug testing industry, on one network</h2>
          <div className="net" role="list" aria-label="One by Labb network">
            <div className="hub" role="listitem">One by Labb</div>
            {members.map((m) => <div key={m.t} role="listitem">{m.t}</div>)}
          </div>
          <div className="grid g3" style={{ marginTop: 32 }}>
            {members.map((m) => (
              <div key={m.t} className="card rail">
                <h3>{m.t}</h3>
                <p>{m.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div>
            <h2>LabbHR is the way in</h2>
            <p>Every LabbHR user is part of One by Labb. Join the beta to connect.</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <Link href="/labbhr#beta" className="btn btn-light">Join the LabbHR Beta</Link>
          </div>
        </div>
      </section>
    </>
  );
}
