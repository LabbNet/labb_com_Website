"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// CPP member area tabs. The current page is highlighted (nested pages count toward their tab).
const TABS = [
  { href: "/members", label: "Resources", exact: true, d: "M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM14 3v5h5M8 13h8M8 17h5" },
  { href: "/members/pricing", label: "Pricing", d: "M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9zM8 8h.01" },
  { href: "/members/certifications", label: "Certifications", d: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14 7 21l5-3 5 3-1.5-7" },
  { href: "/members/leads", label: "Leads", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
  { href: "/members/quotes", label: "Quotes", d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h6" },
  { href: "/members/trade-shows", label: "Trade shows", d: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" },
];

export function MemberNav() {
  const path = usePathname() || "";
  return (
    <nav aria-label="Member area" className="admin-nav member-tabs">
      {TABS.map((t) => {
        const on = t.exact ? path === t.href : path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
