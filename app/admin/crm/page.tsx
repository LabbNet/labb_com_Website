import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { admins, allTags, dueWork, keyHref, searchPeople, STAGES, stageLabel, TYPE_LABELS } from "@/lib/crm";

export const metadata: Metadata = { title: "CRM", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PER = 50;
const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
const ago = (d: Date | null) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : day(d);
};

// Every person Labb has on file (contacts, leads, CPP members), searchable, with owner, stage and follow-ups.
export default async function Crm({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; owner?: string; stage?: string; tag?: string; due?: string; p?: string; mine?: string }> }) {
  const admin = await requireAdmin("/admin/crm");
  const sp = await searchParams;
  const f = {
    q: (sp.q || "").slice(0, 100), type: sp.type && sp.type in TYPE_LABELS ? sp.type : "", owner: sp.owner === "me" ? admin.id : (sp.owner || "").slice(0, 40),
    stage: sp.stage || "", tag: (sp.tag || "").slice(0, 30), due: sp.due === "1", page: Math.max(1, Number(sp.p) || 1),
  };
  const [rows, team, tags, tasks, flash] = await Promise.all([searchPeople(f, PER), admins(), allTags(), dueWork(sp.mine === "0" ? null : admin.id), readFlash()]);
  const total = rows[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (o: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: f.q, type: f.type, owner: sp.owner, stage: f.stage, tag: f.tag, due: f.due ? "1" : undefined, ...o })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/admin/crm?${u}`;
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <AdminBar title="CRM" current="/admin/crm" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="crm-top">
            <form className="crm-search" action="/admin/crm">
              <input name="q" defaultValue={f.q} placeholder="Search name, email, company, phone, city or tag" aria-label="Search" autoFocus />
              <select name="type" defaultValue={f.type} aria-label="Type">
                <option value="">Everyone</option>
                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}s</option>)}
              </select>
              <select name="stage" defaultValue={f.stage} aria-label="Stage">
                <option value="">Any stage</option>
                {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select name="owner" defaultValue={sp.owner || ""} aria-label="Owner">
                <option value="">Any owner</option>
                <option value="me">Mine</option>
                <option value="none">Unassigned</option>
                {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {tags.length > 0 && (
                <select name="tag" defaultValue={f.tag} aria-label="Tag">
                  <option value="">Any tag</option>
                  {tags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.n})</option>)}
                </select>
              )}
              <label className="crm-check"><input type="checkbox" name="due" value="1" defaultChecked={f.due} /> Follow-up due</label>
              <button className="btn btn-primary" type="submit">Search</button>
            </form>
          </div>

          <div className="crm-grid">
            <div>
              <p className="fine" style={{ textAlign: "left", margin: "0 0 10px" }}>{total.toLocaleString("en-US")} {total === 1 ? "record" : "records"}{f.q ? ` matching "${f.q}"` : ""}</p>
              {!rows.length ? <p className="hero-card">No records match.</p> : (
                <div className="bg-table-wrap">
                  <table className="bg-table crm-table">
                    <thead><tr><th scope="col">Person</th><th scope="col">Company</th><th scope="col">Type</th><th scope="col">Stage</th><th scope="col">Owner</th><th scope="col">Follow-up</th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key}>
                          <th scope="row">
                            <Link href={keyHref(r.key)}>{r.name || r.email || r.company || r.key}</Link>
                            <span className="bg-note" style={{ color: "var(--muted)" }}>{[r.email, r.phone, [r.city, r.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</span>
                            {r.tags.length > 0 && <span className="crm-tags">{r.tags.map((t) => <Link key={t} href={qs({ tag: t, p: undefined })} className="crm-tag">{t}</Link>)}</span>}
                          </th>
                          <td>{r.company}</td>
                          <td>{r.types.map((t) => <span key={t} className="crm-type">{TYPE_LABELS[t] || t}</span>)}</td>
                          <td>{stageLabel(r.stage)}</td>
                          <td>{r.owner_name || <span className="fine">None</span>}</td>
                          <td>
                            {r.follow_up_at ? <span className={day(r.follow_up_at) && new Date(r.follow_up_at).toISOString().slice(0, 10) <= today ? "crm-due" : ""}>{day(r.follow_up_at)}</span> : null}
                            {r.open_tasks > 0 && <span className="bg-note">{r.open_tasks} open {r.open_tasks === 1 ? "task" : "tasks"}</span>}
                            {r.last_activity && <span className="bg-note">Last activity {ago(r.last_activity)}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {pages > 1 && (
                <p className="ct-pages">
                  {f.page > 1 && <Link href={qs({ p: f.page - 1 })}>← Previous</Link>}
                  <span className="fine">Page {f.page} of {pages}</span>
                  {f.page < pages && <Link href={qs({ p: f.page + 1 })}>Next →</Link>}
                </p>
              )}
            </div>

            <aside className="hero-card crm-side">
              <h2>Open tasks</h2>
              <p className="fine" style={{ margin: "0 0 10px", textAlign: "left" }}>
                {sp.mine === "0" ? <>Everyone&apos;s · <Link href="/admin/crm">Show mine</Link></> : <>Yours · <Link href="/admin/crm?mine=0">Show everyone&apos;s</Link></>}
              </p>
              {!tasks.length ? <p className="fine" style={{ textAlign: "left" }}>No open tasks.</p> : (
                <ul className="crm-tasks">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <Link href={keyHref(t.key)}>{t.body.length > 90 ? `${t.body.slice(0, 88)}...` : t.body}</Link>
                      <span className={`fine${t.due_at && new Date(t.due_at).toISOString().slice(0, 10) <= today ? " crm-due" : ""}`}>{t.due_at ? `Due ${day(t.due_at)}` : "No due date"}{t.owner_name ? ` · ${t.owner_name}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
