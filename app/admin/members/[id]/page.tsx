import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "CPP Member", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  created: "Account created",
  invite_sent: "Invite sent",
  login: "Signed in",
  disabled: "Account disabled",
  enabled: "Account re-enabled",
  made_admin: "Made admin",
  admin_removed: "Admin removed",
  reset_link_created: "Reset link created",
  cpp_start_date: "CPP start date set",
  cpp_active: "CPP set to active",
  cpp_inactive: "CPP set to inactive",
  contract_uploaded: "Contract uploaded",
  contract_deleted: "Contract deleted",
};

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtDay = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set";

type Row = {
  id: string; name: string; email: string; username: string; clinic: string | null; phone: string | null;
  city: string | null; state: string | null; role: string; status: string; created_at: Date; last_login_at: Date | null;
  cpp_start_date: string | null; cpp_status: "active" | "inactive"; cpp_status_changed_at: Date | null;
};

export default async function AdminMember({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/members/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = sql();
  const [m] = await db<Row[]>`
    select id, name, email, username, clinic, phone, city, state, role, status, created_at, last_login_at,
      to_char(cpp_start_date, 'YYYY-MM-DD') as cpp_start_date, cpp_status, cpp_status_changed_at
    from members where id = ${id}`;
  if (!m) notFound();
  const [contracts, events, flash] = await Promise.all([
    db<{ id: string; filename: string; size_bytes: number; note: string | null; uploaded_at: Date; by_name: string | null }[]>`
      select c.id, c.filename, c.size_bytes, c.note, c.uploaded_at, u.name as by_name
      from member_contracts c left join members u on u.id = c.uploaded_by
      where c.member_id = ${id} order by c.uploaded_at desc`,
    db<{ id: string; event: string; detail: string | null; actor: string | null; created_at: Date }[]>`
      select e.id, e.event, e.detail, a.name as actor, e.created_at
      from member_events e left join members a on a.id = e.actor_id
      where e.member_id = ${id} and e.event <> 'login' order by e.created_at desc limit 40`,
    readFlash(),
  ]);

  return (
    <>
      <AdminBar title="CPP member" current="/admin/members" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p style={{ marginTop: 0 }}><Link href="/admin/members">← All members</Link></p>
          <Flash flash={flash} />
          <div className="member-head">
            <div>
              <h1 style={{ margin: "0 0 6px" }}>{m.clinic || m.name}</h1>
              <p className="muted" style={{ margin: 0 }}>
                {m.clinic ? `${m.name} · ` : ""}{m.email} · {m.username}
                {m.phone ? ` · ${m.phone}` : ""}{m.city ? ` · ${m.city}${m.state ? `, ${m.state}` : ""}` : ""}
              </p>
            </div>
            <span className={`status ${m.cpp_status === "active" ? "s-active" : "s-disabled"}`}>CPP {m.cpp_status === "active" ? "active" : "inactive"}</span>
          </div>

          <div className="split" style={{ alignItems: "start", gridTemplateColumns: "1fr 1fr", marginTop: 28 }}>
            <div className="hero-card">
              <h2 className="form-title">CPP record</h2>
              <p className="form-sub">
                Start date: <strong>{fmtDay(m.cpp_start_date)}</strong>
                {m.cpp_status_changed_at ? ` · Status changed ${fmtDate(m.cpp_status_changed_at)}` : ""}
              </p>
              <form action="/api/admin/members/cpp" method="post">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="action" value="program" />
                <div className="fields" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="field">
                    <label htmlFor="cpp-start">CPP start date</label>
                    <input id="cpp-start" name="start" type="date" defaultValue={m.cpp_start_date ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="cpp-status">CPP status</label>
                    <select id="cpp-status" name="cpp_status" defaultValue={m.cpp_status}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} type="submit">Save</button>
              </form>
              <p className="form-sub" style={{ marginTop: 16, marginBottom: 0 }}>
                CPP status tracks the partnership. Login access is separate: account status is <strong>{m.status}</strong>
                {m.status !== "disabled" ? ". Disable the account on the members list if they should no longer sign in." : "."}
              </p>
            </div>

            <div className="hero-card">
              <h2 className="form-title">Contracts</h2>
              <p className="form-sub">Signed CPP agreements and amendments. PDF, Word, PNG or JPG, up to 15 MB. Only Labb admins can open them.</p>
              <form action="/api/admin/members/cpp" method="post" encType="multipart/form-data">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="action" value="upload" />
                <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="field">
                    <label htmlFor="c-file">Contract file</label>
                    <input id="c-file" name="contract" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" required />
                  </div>
                  <div className="field">
                    <label htmlFor="c-note">Note (optional)</label>
                    <input id="c-note" name="note" placeholder="For example: Signed agreement, 2026 renewal" maxLength={300} />
                  </div>
                </div>
                <button className="btn btn-outline-dark" style={{ marginTop: 16 }} type="submit">Upload contract</button>
              </form>
              <ul className="contract-list">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <div>
                      <a href={`/api/admin/members/contracts/${c.id}`} target="_blank" rel="noopener">{c.filename}</a>
                      <span className="sub">
                        {kb(c.size_bytes)} · Uploaded {fmtDate(c.uploaded_at)}{c.by_name ? ` by ${c.by_name}` : ""}{c.note ? ` · ${c.note}` : ""}
                      </span>
                    </div>
                    <form action="/api/admin/members/cpp" method="post">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="action" value="delete-contract" />
                      <input type="hidden" name="cid" value={c.id} />
                      <button type="submit" className="linkish danger">Delete</button>
                    </form>
                  </li>
                ))}
                {!contracts.length && <li className="muted">No contract on file yet.</li>}
              </ul>
            </div>
          </div>

          <div className="hero-card" style={{ marginTop: 28 }}>
            <h2 className="form-title">History</h2>
            <ul className="contract-list">
              {events.map((e) => (
                <li key={e.id}>
                  <div>
                    <strong>{EVENT_LABEL[e.event] || e.event}</strong>
                    {e.detail ? ` · ${e.event === "cpp_start_date" ? fmtDay(e.detail === "cleared" ? null : e.detail) : e.detail}` : ""}
                    <span className="sub">{fmtDate(e.created_at)}{e.actor ? ` by ${e.actor}` : ""}</span>
                  </div>
                </li>
              ))}
              {!events.length && <li className="muted">Nothing yet.</li>}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
