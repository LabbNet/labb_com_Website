import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentMember, type Member } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";
import { AdminBar } from "@/components/AdminBar";

export const metadata: Metadata = { title: "Manage CPP Members", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never");

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const admin = await currentMember();
  if (!admin) redirect("/login?next=/admin/members");
  if (admin.role !== "admin") redirect("/members");

  const { q = "", show = "all" } = await searchParams;
  const like = `%${q.toLowerCase().slice(0, 80)}%`;
  const rows = await sql()<Member[]>`
    select id, username, email, name, clinic, role, status, session_version, created_at, last_login_at from members
    where (${q} = '' or lower(name) like ${like} or lower(email) like ${like} or lower(username) like ${like} or lower(coalesce(clinic, '')) like ${like})
      and (${show} = 'all' or status = ${show})
    order by status = 'disabled', lower(name)`;
  const counts = await sql()<{ status: string; n: number }[]>`select status, count(*)::int as n from members group by status`;
  const c = Object.fromEntries(counts.map((r) => [r.status, r.n]));

  let flash: { msg: string; link?: string; kind: "ok" | "error" } | null = null;
  try {
    const raw = (await cookies()).get("labb_flash")?.value;
    if (raw) flash = JSON.parse(raw);
  } catch {}

  const act = (id: string, action: string, label: string, danger = false) => (
    <form action="/api/admin/members" method="post" style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={`linkish${danger ? " danger" : ""}`}>{label}</button>
    </form>
  );

  return (
    <>
      <AdminBar title="CPP member accounts" current="/admin/members" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          {flash && (
            <div className={flash.kind === "error" ? "form-error" : "form-ok"} role="status" style={{ marginBottom: 24 }}>
              {flash.msg}
              {flash.link && <input readOnly value={flash.link} className="copy-link" aria-label="Link to send" />}
            </div>
          )}

          <div className="split" style={{ alignItems: "start", gridTemplateColumns: "1fr 1.6fr" }}>
            <div className="hero-card">
              <h2 className="form-title">Add a member</h2>
              <p className="form-sub">Creates the account and emails a setup link. Add members after their CPP agreement is signed.</p>
              <form action="/api/admin/members" method="post">
                <input type="hidden" name="action" value="create" />
                <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="field"><label htmlFor="a-name">Full name</label><input id="a-name" name="name" required /></div>
                  <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" required /></div>
                  <div className="field"><label htmlFor="a-clinic">Clinic or business</label><input id="a-clinic" name="clinic" /></div>
                  <div className="field">
                    <label htmlFor="a-user">Username</label>
                    <input id="a-user" name="username" placeholder="Defaults to the part of the email before @" pattern="[a-zA-Z0-9._-]{3,40}" />
                  </div>
                  <div className="field">
                    <label htmlFor="a-role">Access</label>
                    <select id="a-role" name="role" defaultValue="member">
                      <option value="member">CPP member</option>
                      <option value="admin">Labb admin (can manage members)</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} type="submit">Create account and send invite</button>
              </form>
            </div>

            <div>
              <div className="stats" style={{ marginBottom: 18 }}>
                <div><strong>{c.active || 0}</strong><span>Active</span></div>
                <div><strong>{c.invited || 0}</strong><span>Invited, not set up</span></div>
                <div><strong>{c.disabled || 0}</strong><span>Disabled</span></div>
              </div>
              <form method="get" className="admin-search">
                <input name="q" defaultValue={q} placeholder="Search name, email, username or clinic" aria-label="Search members" />
                <select name="show" defaultValue={show} aria-label="Filter by status">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="disabled">Disabled</option>
                </select>
                <button className="btn btn-outline-dark" type="submit">Filter</button>
              </form>
              <div className="compare-wrap">
                <table className="compare admin-table">
                  <thead>
                    <tr><th scope="col" style={{ textAlign: "left" }}>Member</th><th scope="col">Status</th><th scope="col">Last sign in</th><th scope="col">Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <th scope="row">
                          {m.name} {m.role === "admin" && <span className="tag plain">Admin</span>}
                          <span className="sub">{m.username} · {m.email}{m.clinic ? ` · ${m.clinic}` : ""}</span>
                        </th>
                        <td><span className={`status s-${m.status}`}>{m.status === "invited" ? "Invited" : m.status === "active" ? "Active" : "Disabled"}</span></td>
                        <td>{fmt(m.last_login_at)}</td>
                        <td className="acts">
                          {m.status === "invited" && act(m.id, "resend", "Re-send invite")}
                          {m.status === "active" && act(m.id, "reset", "Reset link")}
                          {m.status !== "disabled" && m.id !== admin.id && act(m.id, "disable", "Disable", true)}
                          {m.status === "disabled" && act(m.id, "enable", "Re-enable")}
                          {m.id !== admin.id && m.status !== "disabled" && (m.role === "admin" ? act(m.id, "demote", "Remove admin", true) : act(m.id, "promote", "Make admin"))}
                        </td>
                      </tr>
                    ))}
                    {!rows.length && <tr><td colSpan={4}>No members match.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
