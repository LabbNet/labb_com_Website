import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { admins, getPerson, isKey, KINDS, kindLabel, STAGES, TYPE_LABELS } from "@/lib/crm";
import { LIST_LABELS } from "@/lib/contacts";
import { leadActivity } from "@/lib/analytics";
import { sequenceName } from "@/lib/sequences";

export const metadata: Metadata = { title: "CRM record", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
const iso = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

type Item = { at: Date; kind: string; title: string; body?: string | null; by?: string | null; id?: string; mine?: boolean; due?: Date | null; done?: Date | null };

// One person across Contacts, leads and CPP: details, owner, stage, tags, follow-up, and the full activity timeline.
export default async function Record({ params }: { params: Promise<{ key: string }> }) {
  const { key: raw } = await params;
  const key = decodeURIComponent(raw).toLowerCase();
  const admin = await requireAdmin(`/admin/crm/p/${encodeURIComponent(key)}`);
  if (!isKey(key)) notFound();
  const [p, team, flash] = await Promise.all([getPerson(key), admins(), readFlash()]);
  if (!p.contacts.length && !p.leads.length && !p.members.length) notFound();
  const views = p.email ? await leadActivity(p.leads[0]?.id ?? "0", p.email) : [];

  const c = p.contacts[0] as Record<string, string | null> | undefined;
  const l = p.leads[0];
  const m = p.members[0];
  const name = m?.name || [c?.first_name, c?.last_name].filter(Boolean).join(" ") || [l?.first_name, l?.last_name].filter(Boolean).join(" ") || c?.company || p.email || key;
  const company = m?.clinic || c?.company || l?.company || "";
  const phone = m?.phone || c?.phone || l?.phone || "";
  const place = [c?.address, c?.address2, [c?.city || l?.city || m?.city, c?.state || l?.state || m?.state].filter(Boolean).join(", "), c?.zip].filter(Boolean).join(", ");
  const types = [...new Set([...p.contacts.map((x) => (x.email ? "contact" : "location")), ...(p.leads.length ? ["lead"] : []), ...p.members.map((x) => (x.role === "admin" ? "admin" : x.cpp_status === "prospect" ? "prospect" : "member"))])];
  const blocked = p.sup.some((s) => s.audience === "all" || s.audience === "newsletter");

  // Timeline: CRM activity, lead history, guidebook emails and website visits, newest first.
  const items: Item[] = [
    ...p.acts.map((a) => ({ at: a.created_at, kind: a.kind, title: kindLabel(a.kind), body: a.body, by: a.author, id: a.id, mine: a.author_id === admin.id, due: a.due_at, done: a.done_at })),
    ...p.events.map((e) => ({ at: e.created_at, kind: "lead", title: `Lead: ${e.event.replace(/_/g, " ")}`, body: e.detail, by: e.actor_name })),
    ...p.runs.map((r) => ({ at: r.created_at, kind: "email", title: `${sequenceName(r.sequence)} guidebook emails`, body: `${r.sent} sent · ${r.status}` })),
    ...[...new Set(views.map((v) => v.session))].slice(0, 30).map((sid) => {
      const pv = views.filter((v) => v.session === sid).reverse();
      return { at: pv[0].ts, kind: "visit", title: `Website visit, ${pv.length} ${pv.length === 1 ? "page" : "pages"}`, body: pv.map((v) => v.path).slice(0, 8).join(" → ") };
    }),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const post = (action: string, children: React.ReactNode, cls = "") => (
    <form action="/api/admin/crm" method="post" className={cls}>
      <input type="hidden" name="key" value={key} />
      <input type="hidden" name="action" value={action} />
      {children}
    </form>
  );

  return (
    <>
      <AdminBar title="CRM" current="/admin/crm" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <p className="fine" style={{ textAlign: "left", margin: "0 0 6px" }}><Link href="/admin/crm">← CRM</Link></p>
          <div className="crm-head">
            <div>
              <h1>{name}</h1>
              <p className="lede" style={{ margin: 0 }}>{[company !== name ? company : "", place].filter(Boolean).join(" · ")}</p>
              <p style={{ margin: "8px 0 0" }}>
                {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}{phone && <> · <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></>}
              </p>
              <p style={{ margin: "8px 0 0" }}>
                {types.map((t) => <span key={t} className="crm-type">{TYPE_LABELS[t] || t}</span>)}
                {blocked && <span className="status s-lost" style={{ marginLeft: 6 }}>Do not send</span>}
              </p>
            </div>
          </div>

          <div className="crm-grid">
            <div>
              <div className="hero-card crm-log">
                {post("log", <>
                  <div className="crm-kinds" role="radiogroup" aria-label="Type">
                    {KINDS.map(([k, label], i) => <label key={k}><input type="radio" name="kind" value={k} defaultChecked={i === 0} /> {label}</label>)}
                  </div>
                  <label htmlFor="crm-body" className="sr-only">Details</label>
                  <textarea id="crm-body" name="body" rows={3} required placeholder="What happened, or what needs to happen?" />
                  <div className="crm-log-row">
                    <label className="fine">Task due <input type="date" name="due" /></label>
                    <button className="btn btn-primary" type="submit">Save</button>
                  </div>
                </>)}
              </div>

              <h2 className="crm-h2">Activity</h2>
              {!items.length ? <p className="fine" style={{ textAlign: "left" }}>No activity yet.</p> : (
                <ol className="crm-timeline">
                  {items.map((it, i) => (
                    <li key={i} className={`crm-item k-${it.kind}${it.done ? " done" : ""}`}>
                      <div className="crm-item-head">
                        <strong>{it.title}</strong>
                        {it.kind === "task" && <span className={`fine${!it.done && it.due && iso(it.due) <= iso(new Date()) ? " crm-due" : ""}`}>{it.done ? `Done ${day(it.done)}` : it.due ? `Due ${day(it.due)}` : "Open"}</span>}
                        <span className="fine">{fmtDate(it.at)} ET{it.by ? ` · ${it.by}` : ""}</span>
                      </div>
                      {it.body && <p className="crm-body">{it.body}</p>}
                      {it.id && (
                        <div className="crm-item-actions">
                          {it.kind === "task" && post(it.done ? "reopen" : "done", <><input type="hidden" name="id" value={it.id} /><button className="linkish" type="submit">{it.done ? "Reopen" : "Mark done"}</button></>)}
                          {it.mine && post("delete", <><input type="hidden" name="id" value={it.id} /><button className="linkish" type="submit">Delete</button></>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <aside className="crm-side-col">
              <div className="hero-card crm-side">
                <h2>Record</h2>
                {post("update", <>
                  <div className="field"><label htmlFor="crm-owner">Owner</label>
                    <select id="crm-owner" name="owner" defaultValue={p.meta?.owner_id || ""}>
                      <option value="">Unassigned</option>
                      {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="field"><label htmlFor="crm-stage">Stage</label>
                    <select id="crm-stage" name="stage" defaultValue={p.meta?.stage || (m && m.role !== "admin" && m.cpp_status !== "prospect" ? "cpp-member" : "new")}>
                      {STAGES.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
                    </select>
                  </div>
                  <div className="field"><label htmlFor="crm-follow">Follow up on</label>
                    <input id="crm-follow" type="date" name="follow_up" defaultValue={iso(p.meta?.follow_up_at ?? null)} />
                  </div>
                  <div className="field"><label htmlFor="crm-tags">Tags</label>
                    <input id="crm-tags" name="tags" defaultValue={(p.meta?.tags || []).join(", ")} placeholder="trade show, hot, renewal" />
                    <span className="fine">Separate with commas.</span>
                  </div>
                  <button className="btn btn-outline-dark" type="submit">Save record</button>
                </>, "crm-form")}
              </div>

              <div className="hero-card crm-side">
                <h2>On file</h2>
                <ul className="crm-files">
                  {p.members.map((x) => (
                    <li key={x.id}><Link href={`/admin/members/${x.id}`}>{x.role === "admin" ? "Labb admin account" : x.cpp_status === "prospect" ? "CPP prospect" : "CPP member account"}</Link><span className="fine">{x.status}{x.role !== "admin" ? ` · CPP ${x.cpp_status}` : ""}{x.last_login_at ? ` · last sign-in ${day(x.last_login_at)}` : ""}</span></li>
                  ))}
                  {p.leads.map((x) => (
                    <li key={x.id}><Link href={`/admin/leads/${x.id}`}>Lead: {x.type.replace(/-/g, " ")}</Link><span className="fine">{day(x.created_at)} · {x.status}{x.owner === "partner" ? " · with a CPP partner" : ""}{x.archived ? " · archived" : ""}</span></li>
                  ))}
                  {p.contacts.map((x) => (
                    <li key={String(x.id)}><Link href={`/admin/contacts?view=${x.status === "assigned" ? x.list : x.status === "ignored" ? "ignored" : "pending"}&q=${encodeURIComponent(String(x.email || x.company || ""))}`}>Contact: {x.status === "assigned" && x.list ? LIST_LABELS[x.list as keyof typeof LIST_LABELS] : x.status === "ignored" ? "Not added" : "Pending"}</Link><span className="fine">from {String(x.source)}</span></li>
                  ))}
                  {p.sup.map((s, i) => <li key={`s${i}`}><span>{s.audience === "all" ? "Do not send" : `Unsubscribed: ${s.audience}`}</span><span className="fine">{day(s.created_at)}</span></li>)}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
