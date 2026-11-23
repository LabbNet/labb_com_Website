import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "Admin users", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = { id: string; name: string; email: string; phone: string | null; username: string; role: string; status: string; read_role: string | null; read_approver: boolean; superadmin: boolean; last_login_at: Date | null };
const day = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "Never");

// Superadmin only: who can use the Labb admin portal, who can use the reads schedule, and who has both.
export default async function Access() {
  const admin = await requireAdmin("/admin/access");
  const [me] = await sql()<{ superadmin: boolean }[]>`select superadmin from members where id = ${admin.id}`;
  if (!me?.superadmin) redirect("/admin/crm");
  const [rows, flash] = await Promise.all([
    sql()<Row[]>`select id, name, email, phone, username, role, status, read_role, read_approver, superadmin, last_login_at from members
      where role in ('admin', 'reader') or read_role is not null or read_approver or superadmin
      order by superadmin desc, (role = 'admin' and (read_role is not null or read_approver)) desc, role, name`,
    readFlash(),
  ]);
  const reads = (r: Row) => (r.read_approver ? "approver" : r.read_role || "none");

  return (
    <>
      <AdminBar title="Admin users" current="/admin/access" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <p className="lede" style={{ maxWidth: 820, textAlign: "left" }}>
            Add and manage Labb admins here. CPP members are managed separately in CPP, Members. You are the only superadmin and the only one who sees this page. Labb admins see only the admin portal; read admins see only the reads schedule; give someone both here (dual access).
          </p>
          <details className="hero-card" style={{ marginBottom: 20, textAlign: "left", maxWidth: 640 }}>
            <summary className="btn btn-primary">+ Add a Labb admin</summary>
            <form action="/api/admin/access" method="post" className="rd-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="action" value="add" />
              <div className="field"><label htmlFor="ad-n">Name</label><input id="ad-n" name="name" required maxLength={120} /></div>
              <div className="field"><label htmlFor="ad-e">Email</label><input id="ad-e" name="email" type="email" required /></div>
              <button className="btn btn-primary" type="submit">Create admin and send invite</button>
              <p className="fine" style={{ margin: 0 }}>They get a setup link by email (expires in 7 days) and see only the admin portal.</p>
            </form>
          </details>
          <div className="bg-table-wrap">
            <table className="bg-table">
              <thead><tr><th scope="col">Person</th><th scope="col">Labb admin portal</th><th scope="col">Reads schedule</th><th scope="col">Last sign-in</th><th scope="col"></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">
                      {r.name}<span className="bg-note">{r.email}{r.phone ? ` · ${r.phone}` : ""}{r.status !== "active" ? ` · ${r.status === "invited" ? "setup link not used yet" : r.status}` : ""}</span>
                      <details className="au-edit">
                        <summary className="linkish">Edit details</summary>
                        <form action="/api/admin/access" method="post" className="au-form">
                          <input type="hidden" name="action" value="details" />
                          <input type="hidden" name="id" value={r.id} />
                          <label>Name<input name="name" required maxLength={120} defaultValue={r.name} /></label>
                          <label>Email<input name="email" type="email" required maxLength={160} defaultValue={r.email} /></label>
                          <label>Phone<input name="phone" type="tel" maxLength={40} defaultValue={r.phone || ""} /></label>
                          <label>Username (sign-in)<input name="username" required maxLength={40} pattern="[A-Za-z0-9._-]{3,40}" defaultValue={r.username} /></label>
                          <button className="btn btn-primary btn-sm" type="submit">Save details</button>
                        </form>
                      </details>
                    </th>
                    {r.superadmin ? (
                      <><td>Superadmin</td><td>Everything</td><td>{day(r.last_login_at)}</td><td></td></>
                    ) : (
                      <>
                        <td colSpan={2}>
                          <form action="/api/admin/access" method="post" className="ct-assign" id={`f-${r.id}`}>
                            <input type="hidden" name="id" value={r.id} />
                            <label className="crm-check"><input type="checkbox" name="admin" value="1" defaultChecked={r.role === "admin"} /> Admin portal</label>
                            <select name="reads" defaultValue={reads(r)} aria-label={`Reads access for ${r.name}`}>
                              <option value="none">No reads access</option>
                              <option value="reader">Read admin</option>
                              <option value="super">Super read admin</option>
                              <option value="approver">Super read admin, approver</option>
                            </select>
                            {r.role === "admin" && (r.read_role || r.read_approver) && <span className="status s-contacted">Dual access</span>}
                          </form>
                        </td>
                        <td>{day(r.last_login_at)}</td>
                        <td className="rd-team-actions">
                          <button className="btn btn-outline-dark btn-sm" type="submit" form={`f-${r.id}`}>Save</button>
                          {r.status !== "disabled" && (
                            <form action="/api/admin/access" method="post">
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="action" value={r.status === "invited" ? "resend" : "reset"} />
                              <button className="linkish" type="submit">{r.status === "invited" ? "Resend setup link" : "Password reset link"}</button>
                            </form>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine" style={{ textAlign: "left", marginTop: 12 }}>
            Turning off both disables the account. CPP member and learner accounts aren&apos;t listed here.
          </p>
        </div>
      </section>
    </>
  );
}
