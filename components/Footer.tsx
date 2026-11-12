import Image from "next/image";
import Link from "next/link";
import { Newsletter } from "@/components/Newsletter";
import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap footer-top">
        <div>
          <Image src="/brand/labb-logo-white.png" alt="Labb" width={600} height={225} style={{ width: "auto", height: 56 }} />
          <p>
            {site.address.street}
            <br />
            {site.address.city}, {site.address.region} {site.address.postal}
            <br />
            <a href={site.phoneHref}>{site.phone}</a>
            <br />
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
        <div>
          <h2>Who we serve</h2>
          <ul>
            <li><Link href="/employers">Employers</Link></li>
            <li><Link href="/collection-sites">Clinics and collection sites</Link></li>
            <li><Link href="/tpas">TPAs</Link></li>
            <li><Link href="/laboratories">Laboratories</Link></li>
            <li><Link href="/corrections">Corrections</Link></li>
            <li><Link href="/treatment-recovery">Treatment and recovery</Link></li>
            <li><Link href="/quick-test">Individuals: Quick Test</Link></li>
          </ul>
        </div>
        <div>
          <h2>Test kits</h2>
          <ul>
            <li><Link href="/test-kits/oral-etest">Oral eTest</Link></li>
            <li><Link href="/test-kits/urine-etest">Urine eTest</Link></li>
            <li><Link href="/test-kits/oraflo">OraFlo</Link></li>
            <li><Link href="/test-kits#compare">Compare panels</Link></li>
          </ul>
          <h2 style={{ marginTop: 24 }}>Software</h2>
          <ul>
            <li><Link href="/labb-station">Labb Station</Link></li>
            <li><Link href="/labbhr">LabbHR</Link></li>
            <li><Link href="/labbpo">LabbPO</Link></li>
            <li><Link href="/labbmd">LabbMD</Link></li>
            <li><Link href="/one">One by Labb</Link></li>
          </ul>
        </div>
        <div>
          <h2>Resources</h2>
          <ul>
            <li><Link href="/certifications">Get certified</Link></li>
            <li><Link href="/training">Training and handbooks</Link></li>
            <li><Link href="/training#data-sheets">Data sheets</Link></li>
            <li><Link href="/channel-partner-program">Channel Partner Program</Link></li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/get-a-quote">Get a quote</Link></li>
          </ul>
        </div>
        <div>
          <h2>Labb updates</h2>
          <Newsletter />
        </div>
      </div>
      <div className="footer-bottom">
        <div className="wrap">
          <span>© {year} {site.legalName}</span>
          <span>
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy#your-choices">Do not sell or share my personal information</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
