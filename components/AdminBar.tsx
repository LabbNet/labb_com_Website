import Link from "next/link";

const LINKS = [
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/members", label: "CPP members" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminBar({ title, current }: { title: string; current: string }) {
  return (
    <section className="member-bar">
      <div className="wrap">
        <div>
          <span className="eyebrow">Labb admin</span>
          <strong>{title}</strong>
        </div>
        <nav aria-label="Admin" className="admin-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={current === l.href ? "page" : undefined}>{l.label}</Link>
          ))}
          <Link href="/members">Member area</Link>
          <form action="/api/auth/logout" method="post"><button type="submit" className="linkish">Sign out</button></form>
        </nav>
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
