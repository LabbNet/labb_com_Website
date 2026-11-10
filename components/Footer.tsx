import Image from "next/image";
import Link from "next/link";
import { industries } from "@/lib/industries";
import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap footer-top">
        <div>
          <Image src="/brand/labb-logo-white.png" alt="Labb" width={600} height={225} style={{ width: "auto" }} />
          <p>Rapid drug testing for employers, with an objective digital read and results documented automatically.</p>
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
          <h2>Solutions</h2>
          <ul>
            <li><Link href="/labbhr">LabbHR platform</Link></li>
            <li><Link href="/oral-fluid-drug-testing">Oral fluid testing</Link></li>
            <li><Link href="/urine-drug-testing">Urine testing</Link></li>
            <li><Link href="/test-kits">All test kits</Link></li>
            <li><Link href="/for-clinics">For clinics</Link></li>
          </ul>
        </div>
        <div>
          <h2>Industries</h2>
          <ul>
            {industries.map((i) => (
              <li key={i.slug}><Link href={`/industries/${i.slug}`}>{i.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Company</h2>
          <ul>
            <li><Link href="/get-a-quote">Get a quote</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/resources">Resources</Link></li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/certifications">Certifications</Link></li>
            <li><a href={site.clientLogin} rel="nofollow">Client login</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="wrap">
          <span>© {year} {site.legalName}. All rights reserved.</span>
          <span>
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy#your-choices">Do not sell or share my personal information</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
