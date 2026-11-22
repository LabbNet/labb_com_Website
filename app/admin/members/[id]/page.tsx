import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { activeTemplate } from "@/lib/contracts";

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
  cpp_prospect: "CPP set to prospect",
  prospect_created: "Became a CPP prospect",
  contract_sent: "Contract sent",
  contract_signed: "Contract signed by partner",
  contract_countersigned: "Contract countersigned by Labb",
  contract_uploaded: "Contract uploaded",
  contract_deleted: "Contract deleted",
};

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtDay = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set";

type Row = {
  id: string; name: string; email: string; username: string; clinic: string | null; phone: string | null;
  city: string | null; state: string | null; role: string; status: string; created_at: Date; last_login_at: Date | null;
  cpp_start_date: string | null; cpp_status: "prospect" | "active" | "inactive"; cpp_status_changed_at: Date | null; legal_name: string | null;
};

export default async function AdminMember({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/members/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = sql();
  const [m] = await db<Row[]>`
    select id, name, email, username, clinic, phone, city, state, role, status, created_at, last_login_at,
      to_char(cpp_start_date, 'YYYY-MM-DD') as cpp_start_date, cpp_status, cpp_status_changed_at, legal_name
    from members where id = ${id}`;
  if (!m || m.role === "reader") notFound(); // the read team is managed in Access (superadmin) and Reads
  const [contracts, events, flash, template, requests] = await Promise.all([
    db<{ id: string; filename: string; size_bytes: number; note: string | null; uploaded_at: Date; by_name: string | null }[]>`
      select c.id, c.filename, c.size_bytes, c.note, c.uploaded_at, u.name as by_name
      from member_contracts c left join members u on u.id = c.uploaded_by
      where c.member_id = ${id} order by c.uploaded_at desc`,
    db<{ id: string; event: string; detail: string | null; actor: string | null; created_at: Date }[]>`
      select e.id, e.event, e.detail, a.name as actor, e.created_at
      from member_events e left join members a on a.id = e.actor_id
      where e.member_id = ${id} and e.event <> 'login' order by e.created_at desc limit 40`,
    readFlash(),
    activeTemplate(),
    db<{ id: string; status: string; sent_to: string; sent_at: Date; expires_at: Date; viewed_at: Date | null; signed_at: Date | null;
      signer_name: string | null; version: string; member_contract_id: string | null; by_name: string | null;
      labb_signed_at: Date | null; labb_signer_name: string | null }[]>`
      select r.id, r.status, r.sent_to, r.sent_at, r.expires_at, r.viewed_at, r.signed_at, r.signer_name, t.version, r.member_contract_id, u.name as by_name,
        r.labb_signed_at, r.labb_signer_name
      from contract_requests r join contract_templates t on t.id = r.template_id left join members u on u.id = r.sent_by
      where r.member_id = ${id} order by r.sent_at desc limit 10`,
  ]);
  const signed = requests.find((r) => r.status === "signed");
  const pending = requests.find((r) => (r.status === "sent" || r.status === "viewed") && r.expires_at.getTime() > Date.now());
  const cppLabel = { prospect: "CPP prospect", active: "CPP active", inactive: "CPP inactive" }[m.cpp_status];
  const cppClass = { prospect: "s-invited", active: "s-active", inactive: "s-disabled" }[m.cpp_status];

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
                {m.clinic ? `${m.name} · ` : ""}{m.email} · {m.username} · <Link href={`/admin/crm/p/${encodeURIComponent(m.email.toLowerCase())}`}>CRM record</Link>
                {m.phone ? ` · ${m.phone}` : ""}{m.city ? ` · ${m.city}${m.state ? `, ${m.state}` : ""}` : ""}
              </p>
            </div>
            <span className={`status ${cppClass}`}>{cppLabel}</span>
          </div>

          <div className="hero-card agreement-card" style={{ marginTop: 28 }}>
            <div className="agreement-head">
              <div>
                <h2 className="form-title" style={{ marginBottom: 4 }}>CPP agreement</h2>
                <p className="form-sub" style={{ margin: 0 }}>
                  {signed
                    ? <>Signed {fmtDate(signed.signed_at!)} by <strong>{signed.signer_name}</strong> (version {signed.version}).{" "}
                        {signed.labb_signed_at
                          ? <>Countersigned by {signed.labb_signer_name} {fmtDate(signed.labb_signed_at)}. <strong>Fully executed.</strong>{" "}</>
                          : <strong>Waiting for Labb&apos;s countersignature.</strong>}{" "}
                        {signed.member_contract_id && <a href={`/api/admin/members/contracts/${signed.member_contract_id}`} target="_blank" rel="noopener">Open the PDF</a>}</>
                    : pending
                      ? <>Sent to {pending.sent_to} {fmtDate(pending.sent_at)}{pending.viewed_at ? `, opened ${fmtDate(pending.viewed_at)}` : ", not opened yet"}. The link expires {fmtDate(pending.expires_at)}.</>
                      : template
                        ? <>Sends {template.title}, version {template.version}, to {m.email} for electronic signature.</>
                        : <>Upload the agreement PDF before sending. <Link href="/admin/members/agreement">Upload the CPP agreement</Link></>}
                </p>
              </div>
              <form action="/api/admin/members/cpp" method="post">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="action" value="send-contract" />
                <button className="btn btn-primary" type="submit" disabled={!template}>{pending || signed ? "Send Contract again" : "Send Contract"}</button>
              </form>
            </div>
            {signed && !signed.labb_signed_at && (
              <form action="/api/admin/members/cpp" method="post" className="countersign">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="action" value="countersign" />
                <input type="hidden" name="rid" value={signed.id} />
                <div className="field">
                  <label htmlFor="cs-title">Your title on Labb&apos;s signature line</label>
                  <input id="cs-title" name="title" defaultValue="Chief Executive Officer" maxLength={120} required />
                </div>
                <button className="btn btn-primary" type="submit">Countersign for Labb</button>
                <p className="form-sub" style={{ margin: 0 }}>Signs as you ({admin.name}) with today&apos;s date, which becomes the Effective Date, and emails the fully executed copy to the partner.</p>
              </form>
            )}
            {requests.length > 0 && (
              <ul className="contract-list" style={{ marginTop: 14 }}>
                {requests.map((r) => (
                  <li key={r.id}>
                    <div>
                      <strong>{r.status === "signed" ? (r.labb_signed_at ? "Fully executed" : "Signed by partner") : r.status === "void" ? "Replaced by a newer link" : r.expires_at.getTime() < Date.now() ? "Expired" : r.status === "viewed" ? "Opened, not signed" : "Sent, not opened"}</strong>
                      {" "}· version {r.version}
                      <span className="sub">Sent {fmtDate(r.sent_at)} to {r.sent_to}{r.by_name ? ` by ${r.by_name}` : ""}{r.signed_at ? ` · signed ${fmtDate(r.signed_at)}` : ""}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="form-sub" style={{ margin: "12px 0 0" }}><Link href="/admin/members/agreement">Manage the agreement PDF</Link></p>
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
                      <option value="prospect">Prospect</option>
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
