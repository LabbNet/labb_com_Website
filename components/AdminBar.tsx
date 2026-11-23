import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";

// Admin navigation: five sections. The current section's pages show as tabs underneath.
const SECTIONS = [
  { label: "Analytics", links: [{ href: "/admin/analytics", label: "Analytics" }] },
  {
    label: "Sales",
    links: [
      { href: "/admin/crm", label: "CRM" },
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/meetings", label: "Meetings" },
      { href: "/admin/quotes", label: "Quotes" },
    ],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/articles", label: "Articles" },
      { href: "/admin/email", label: "Email" },
      { href: "/admin/sequences", label: "Sequences" },
      { href: "/admin/contacts", label: "Contacts" },
    ],
  },
  {
    label: "CPP",
    links: [
      { href: "/admin/members", label: "Members" },
      { href: "/admin/members/agreement", label: "Agreement" },
      { href: "/admin/pricing", label: "Pricing" },
      { href: "/admin/trade-shows", label: "Trade shows" },
      { href: "/admin/shelf-life", label: "Shelf-life requests" },
    ],
  },
  {
    label: "Learning",
    links: [
      { href: "/admin/courses", label: "Courses" },
      { href: "/admin/learners", label: "Learners" },
    ],
  },
  { label: "Settings", links: [{ href: "/admin/settings", label: "Settings" }, { href: "/admin/access", label: "Admin users" }] },
];

export async function AdminBar({ title, current }: { title: string; current: string }) {
  // The reads schedule link shows only for the superadmin and admins given read access; Access only for the superadmin.
  const m = await currentMember();
  const [x] = m ? await sql()<{ superadmin: boolean; reads: boolean }[]>`select superadmin, (read_role is not null or read_approver) as reads from members where id = ${m.id}` : [];
  const found = SECTIONS.find((s) => s.links.some((l) => l.href === current));
  // Admin users is the superadmin's page only.
  const section = found && { ...found, links: found.links.filter((l) => l.href !== "/admin/access" || x?.superadmin) };
  return (
    <section className="member-bar admin-bar">
      <div className="wrap">
        <div className="ab-top">
          <div>
            <span className="eyebrow">Labb admin</span>
            <strong>{title}</strong>
          </div>
          <div className="ab-util">
            {(x?.superadmin || x?.reads) && <Link href="/reads">Reads schedule</Link>}
            <Link href="/members">Member area</Link>
            <form action="/api/auth/logout" method="post"><button type="submit" className="linkish">Sign out</button></form>
          </div>
        </div>
        <nav aria-label="Admin" className="admin-nav">
          {SECTIONS.map((s) => (
            <Link key={s.label} href={s.links[0].href} aria-current={s === section ? "true" : undefined}>{s.label}</Link>
          ))}
        </nav>
        {section && section.links.length > 1 && (
          <nav aria-label={`${section.label} pages`} className="admin-subnav">
            {section.links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={current === l.href ? "page" : undefined}>{l.label}</Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

export function Flash({ flash }: { flash: { msg: string; link?: string; kind: "ok" | "error" } | null }) {
  if (!flash) return null;
  return (
    <div className={flash.kind === "error" ? "form-error" : "form-ok"} role="status" style={{ marginBottom: 24 }}>
      {flash.msg}
      {flash.link && <input readOnly value={flash.link} className="copy-link" aria-label="Link to send" />}
    </div>
  );
}
