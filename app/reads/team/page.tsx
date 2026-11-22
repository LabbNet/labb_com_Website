import { redirect } from "next/navigation";
import { Flash } from "@/components/AdminBar";
import { readFlash } from "@/lib/admin";
import { readTeam, requireReads } from "@/lib/reads";

const day = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "Never");

// The read team: add read admins, make someone a super read admin, send setup links.
export default async function ReadsTeam() {
  const a = await requireReads("/reads/team");
  if (!a.approver && !a.superadmin) redirect("/reads");
  const [team, flash] = await Promise.all([readTeam(), readFlash()]);
  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <Flash flash={flash} />
        <div className="bg-table-wrap">
          <table className="bg-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Access</th><th scope="col">Account</th><th scope="col">Last sign-in</th><th scope="col"></th></tr></thead>
            <tbody>
              {team.map((t) => (
                <tr key={t.id}>
                  <th scope="row">{t.name}<span className="bg-note">{t.email}</span></th>
                  <td>{t.read_approver ? "Super read admin, approver" : t.read_role === "super" ? "Super read admin" : "Read admin"}{t.role === "admin" ? " · Labb admin" : t.role === "reader" ? " · reads only" : ""}</td>
                  <td>{t.status === "invited" ? "Setup link not used yet" : t.status}</td>
                  <td>{day(t.last_login_at)}</td>
                  <td className="rd-team-actions">
                    {!t.read_approver && (
                      <form action="/api/reads" method="post">
                        <input type="hidden" name="action" value="team-role" />
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="back" value="/reads/team" />
                        <select name="read_role" defaultValue={t.read_role || "reader"} aria-label={`Access for ${t.name}`}>
                          <option value="reader">Read admin</option>
                          <option value="super">Super read admin</option>
                          <option value="none">Remove from team</option>
                        </select>
                        <button className="linkish" type="submit">Save</button>
                      </form>
                    )}
                    {t.status === "invited" && (
                      <form action="/api/reads" method="post">
                        <input type="hidden" name="action" value="team-invite" />
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="back" value="/reads/team" />
                        <button className="linkish" type="submit">Send setup link</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hero-card rd-card" style={{ marginTop: 24, maxWidth: 560 }}>
          <h2>Add a read admin</h2>
          <form action="/api/reads" method="post" className="rd-form">
            <input type="hidden" name="action" value="team-add" />
            <input type="hidden" name="back" value="/reads/team" />
            <div className="field"><label htmlFor="tm-n">Name</label><input id="tm-n" name="name" required maxLength={120} /></div>
            <div className="field"><label htmlFor="tm-e">Email</label><input id="tm-e" name="email" type="email" required /></div>
            <div className="field"><label htmlFor="tm-r">Access</label>
              <select id="tm-r" name="read_role" defaultValue="reader"><option value="reader">Read admin</option><option value="super">Super read admin</option></select>
            </div>
            <button className="btn btn-primary" type="submit">Add and email setup link</button>
            <p className="fine" style={{ margin: 0 }}>New people get a reads-only account: they see the schedule and hours, nothing else. Giving read access to someone who already has a Labb account is done by James.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
