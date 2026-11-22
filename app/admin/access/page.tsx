import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "Access", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = { id: string; name: string; email: string; role: string; status: string; read_role: string | null; read_approver: boolean; superadmin: boolean; last_login_at: Date | null };
const day = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "Never");

// Superadmin only: who can use the Labb admin portal, who can use the reads schedule, and who has both.
export default async function Access() {
  const admin = await requireAdmin("/admin/access");
  const [me] = await sql()<{ superadmin: boolean }[]>`select superadmin from members where id = ${admin.id}`;
  if (!me?.superadmin) redirect("/admin/crm");
  const [rows, flash] = await Promise.all([
    sql()<Row[]>`select id, name, email, role, status, read_role, read_approver, superadmin, last_login_at from members
      where role in ('admin', 'reader') or read_role is not null or read_approver or superadmin
      order by superadmin desc, (role = 'admin' and (read_role is not null or read_approver)) desc, role, name`,
    readFlash(),
  ]);
  const reads = (r: Row) => (r.read_approver ? "approver" : r.read_role || "none");

  return (
    <>
      <AdminBar title="Access" current="/admin/access" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <p className="lede" style={{ maxWidth: 820, textAlign: "left" }}>
            You are the only superadmin. Labb admins see only the admin portal; read admins see only the reads schedule. Give someone both here (dual access).
          </p>
          <div className="bg-table-wrap">
            <table className="bg-table">
              <thead><tr><th scope="col">Person</th><th scope="col">Labb admin portal</th><th scope="col">Reads schedule</th><th scope="col">Last sign-in</th><th scope="col"></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.name}<span className="bg-note">{r.email}{r.status !== "active" ? ` · ${r.status === "invited" ? "setup link not used yet" : r.status}` : ""}</span></th>
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
                        <td><button className="btn btn-outline-dark btn-sm" type="submit" form={`f-${r.id}`}>Save</button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine" style={{ textAlign: "left", marginTop: 12 }}>
            Turning off both disables the account. CPP member and learner accounts aren&apos;t listed. Read admins are added in Reads → Team.
          </p>
        </div>
      </section>
    </>
  );
}
