import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand } from "@/components/ui";
import { GraphicSlot } from "@/components/visual/GraphicSlot";

export const metadata: Metadata = {
  title: "Drug Testing Technology for Clinics, TPAs and Laboratories",
  description: "Labb technology, test kits and support for drug testing professionals: clinics and collection sites, TPAs and laboratories, plus corrections and treatment programs.",
  alternates: { canonical: "/testing-professionals" },
};

const doors = [
  { href: "/collection-sites", g: "collection-sites", eyebrow: "Clinics and collection sites", title: "Every result documented. More clients served.", body: "Objective reads, custom panels from one kit, and the tools to grow." },
  { href: "/tpas", g: "tpas", eyebrow: "TPAs", title: "Sell, contract and bill programs in one place.", body: "Background checks built in, clinics and labs connected." },
  { href: "/laboratories", g: "laboratories", eyebrow: "Laboratories", title: "Connect with the sites that send you specimens.", body: "A connected network and electronic custody from rapid sites." },
];

export default function TestingProfessionals() {
  return (
    <>
      <section className="hero-v2">
        <div className="wrap">
          <div>
            <span className="eyebrow">For testing professionals</span>
            <h1>Run a better drug testing business.</h1>
            <p className="lede">Technology, test kits and a support team for the people who collect, manage and confirm drug tests.</p>
          </div>
          <GraphicSlot src="/graphics/pros/hero.webp" alt="Labb technology at a collection site" label="Hero: Labb at a collection site" w={1600} h={1200} priority />
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Testing professionals", href: "/testing-professionals" }]} />
      <section className="band light">
        <div className="wrap">
          <div className="paths" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
            {doors.map((d) => (
              <Link key={d.href} href={d.href} className="split-door">
                <GraphicSlot src={`/graphics/who/${d.g}.webp`} alt="" label={d.eyebrow} w={1000} h={600} sizes="400px" />
                <span className="eyebrow">{d.eyebrow}</span>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
                <span className="go">Learn more →</span>
              </Link>
            ))}
          </div>
          <div className="split-more">
            <Link href="/corrections">Corrections programs</Link>
            <Link href="/treatment-recovery">Treatment and recovery programs</Link>
            <Link href="/channel-partner-program">Channel Partner Program</Link>
          </div>
        </div>
      </section>
      <CtaBand segment="collection-site" topic="Testing professional" />
    </>
  );
}
