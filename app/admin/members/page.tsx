import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { currentMember, type Member } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";
import { AdminBar } from "@/components/AdminBar";

export const metadata: Metadata = { title: "Manage CPP Members", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never");

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; cpp?: string }> }) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const admin = await currentMember();
  if (!admin) redirect("/login?next=/admin/members");
  if (admin.role !== "admin") redirect("/members");

  const { q = "", show = "current", cpp = "all" } = await searchParams;
  const like = `%${q.toLowerCase().slice(0, 80)}%`;
  const rows = await sql()<(Member & { cpp_status: string; cpp_start: string | null; contracts: number })[]>`
    select id, username, email, name, clinic, role, status, session_version, created_at, last_login_at, cpp_status,
      to_char(cpp_start_date, 'Mon FMDD, YYYY') as cpp_start,
      (select count(*)::int from member_contracts c where c.member_id = members.id) as contracts
    from members
    where role <> 'reader' and (${q} = '' or lower(name) like ${like} or lower(email) like ${like} or lower(username) like ${like} or lower(coalesce(clinic, '')) like ${like})
      and (${show} = 'all' or (${show} = 'current' and status <> 'disabled') or status = ${show})
      and (${cpp} = 'all' or (role = 'member' and cpp_status = ${cpp}))
    order by status = 'disabled', cpp_status <> 'prospect', status <> 'invited', lower(name)`;
  const counts = await sql()<{ status: string; n: number }[]>`select status, count(*)::int as n from members where role <> 'reader' and not (status = 'invited' and cpp_status = 'prospect') group by status`;
  const c = Object.fromEntries(counts.map((r) => [r.status, r.n]));
  const cppCounts = await sql()<{ cpp_status: string; n: number }[]>`select cpp_status, count(*)::int as n from members where role = 'member' group by cpp_status`;
  const cc = Object.fromEntries(cppCounts.map((r) => [r.cpp_status, r.n]));

  let flash: { msg: string; link?: string; kind: "ok" | "error" } | null = null;
  try {
    const raw = (await cookies()).get("labb_flash")?.value;
    if (raw) flash = JSON.parse(raw);
  } catch {}

  // Row actions as icon buttons; the label shows as a hover hint and is read by screen readers.
  const ICONS: Record<string, React.ReactNode> = {
    resend: <path d="M3 6h18v12H3zM3 6l9 7 9-7" />,
    reset: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></>,
    disable: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
    enable: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
    promote: <><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M12 9v6M9 12h6" /></>,
    demote: <><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M9 12h6" /></>,
  };
  const act = (id: string, action: string, label: string, danger = false) => (
    <form action="/api/admin/members" method="post" style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={`icon-act${danger ? " danger" : ""}`} aria-label={label} data-tip={label}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[action]}</svg>
      </button>
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

          <div className="members-top">
              <div className="stats" >
                <div><strong>{c.active || 0}</strong><span>Active</span></div>
                <div><strong>{c.invited || 0}</strong><span>Invited, not set up</span></div>
                <div><strong>{c.disabled || 0}</strong><span>Disabled</span></div>
                <div><strong>{cc.prospect || 0}</strong><span>CPP prospects</span></div>
                <div><strong>{cc.active || 0}</strong><span>CPP active</span></div>
                <div><strong>{cc.inactive || 0}</strong><span>CPP inactive</span></div>
              </div>
              <details className="hero-card add-member" open={rows.length === 0}>
                <summary className="btn btn-primary">+ Add a member</summary>
                <p className="form-sub" style={{ marginTop: 14 }}>Creates the account and emails a setup link. CPP applications from the website appear here as Prospects. Open one to send the agreement for signature; add the login once it is signed.</p>
              <form action="/api/admin/members" method="post" autoComplete="off">
                <input type="hidden" name="action" value="create" />
                <div className="fields add-member-fields">
                  <div className="field"><label htmlFor="a-name">Full name</label><input id="a-name" name="name" required /></div>
                  <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" autoComplete="off" required /></div>
                  <div className="field"><label htmlFor="a-clinic">Clinic or business</label><input id="a-clinic" name="clinic" /></div>
                  <div className="field">
                    <label htmlFor="a-user">Username</label>
                    <input id="a-user" name="new_member_username" autoComplete="off" data-lpignore="true" data-1p-ignore="true" placeholder="Defaults to the part of the email before @" pattern="[a-zA-Z0-9._-]{3,40}" />
                  </div>
                  <div className="field">
                    <label htmlFor="a-start">CPP start date</label>
                    <input id="a-start" name="cpp_start" type="date" />
                  </div>
                  <div className="field">
                    <label htmlFor="a-role">Access</label>
                    <select id="a-role" name="role" defaultValue="member">
                      <option value="member">CPP member</option>
                      <option value="admin">Labb admin (can manage members)</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 18 }} type="submit">Create account and send invite</button>
              </form>
              </details>
          </div>

          <div>
              <form method="get" className="admin-search">
                <input name="q" defaultValue={q} placeholder="Search name, email, username or clinic" aria-label="Search members" />
                <select name="show" defaultValue={show} aria-label="Filter by status">
                  <option value="current">Active and invited</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="disabled">Disabled</option>
                  <option value="all">All, including disabled</option>
                </select>
                <select name="cpp" defaultValue={cpp} aria-label="Filter by CPP status">
                  <option value="all">Any CPP status</option>
                  <option value="prospect">CPP prospect</option>
                  <option value="active">CPP active</option>
                  <option value="inactive">CPP inactive</option>
                </select>
                <button className="btn btn-outline-dark" type="submit">Filter</button>
              </form>
              <div className="compare-wrap">
                <table className="compare admin-table">
                  <thead>
                    <tr><th scope="col" style={{ textAlign: "left" }}>Member</th><th scope="col">CPP</th><th scope="col">Account</th><th scope="col">Last sign-in</th><th scope="col">Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <th scope="row">
                          <Link href={`/admin/members/${m.id}`}>{m.name}</Link>{m.clinic ? <span className="clinic"> · {m.clinic}</span> : null} {m.role === "admin" && <span className="tag plain">Admin</span>}
                          <span className="sub">{m.email} · {m.username}</span>
                        </th>
                        <td>
                          {m.role === "member" ? (
                            <>
                              <span className={`status ${m.cpp_status === "active" ? "s-active" : m.cpp_status === "prospect" ? "s-invited" : "s-disabled"}`}>{m.cpp_status === "active" ? "Active" : m.cpp_status === "prospect" ? "Prospect" : "Inactive"}</span>{" "}
                              <span className="inline-sub">{m.cpp_start ? `since ${m.cpp_start}` : "no start date"} · {m.contracts ? `${m.contracts} contract${m.contracts > 1 ? "s" : ""}` : "no contract"}</span>
                            </>
                          ) : <span className="sub">Labb staff</span>}
                        </td>
                        <td><span className={`status s-${m.status}`}>{m.status === "invited" ? (m.cpp_status === "prospect" ? "No login yet" : "Invited") : m.status === "active" ? "Active" : "Disabled"}</span></td>
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
                    {!rows.length && <tr><td colSpan={5}>No members match.</td></tr>}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      </section>
    </>
  );
}
