import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { admins, getPerson, isKey, KINDS, kindLabel, STAGES, TYPE_LABELS } from "@/lib/crm";
import { LIST_LABELS } from "@/lib/contacts";
import { leadActivity } from "@/lib/analytics";
import { sequenceName } from "@/lib/sequences";
import { sql } from "@/lib/db";
import { fmtWhen } from "@/lib/meetings";

export const metadata: Metadata = { title: "CRM record", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
const iso = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

// Timeline categories: what the filter chips and icons use.
type Cat = "note" | "call" | "email" | "meeting" | "task" | "lead" | "visit" | "system";
type Item = { at: Date; cat: Cat; title: string; body?: string | null; by?: string | null; id?: string; mine?: boolean; due?: Date | null; done?: Date | null; pages?: { path: string; title: string | null }[]; quiet?: boolean; detail?: string | null };

const FILTERS: [string, string, Cat[]][] = [
  ["all", "All", []],
  ["team", "Notes and calls", ["note", "call", "task"]],
  ["email", "Emails", ["email"]],
  ["meeting", "Meetings", ["meeting"]],
  ["lead", "Lead updates", ["lead", "system"]],
  ["visit", "Website", ["visit"]],
];

// Lead history events in plain words.
function leadEvent(e: { event: string; detail: string | null }): { cat: Cat; title: string; body?: string | null; quiet?: boolean; detail?: string | null } {
  const d = e.detail || "";
  switch (e.event) {
    case "received": return { cat: "lead", title: "Lead came in", body: d.replace(/^Submitted from \/$/, "Submitted from the home page") };
    case "paid": return { cat: "lead", title: "Payment received", body: d };
    case "notified": return { cat: "system", title: "Labb team alerted", body: d, quiet: true };
    case "notify_failed": return { cat: "system", title: "Team alert didn't send", body: d, quiet: true };
    case "status": return { cat: "lead", title: "Status changed", body: d.replace(" to ", " → ") };
    case "segment": return { cat: "lead", title: "Segment changed", body: d.replace(" to ", " → ") };
    case "note": return { cat: "note", title: "Note on the lead", body: d };
    case "passed": return { cat: "lead", title: "Passed to a CPP member", body: d };
    case "returned": return { cat: "lead", title: "Passed back to Labb" };
    case "partner_emailed": return { cat: "system", title: "CPP member notified", body: d, quiet: true };
    case "archived": return { cat: "lead", title: "Lead archived", quiet: true };
    case "unarchived": return { cat: "lead", title: "Lead restored", quiet: true };
    case "accepted": return { cat: "lead", title: "Lead accepted", body: d };
    case "prospect_emailed": return { cat: "email", title: /booking link/i.test(d) ? "Booking link emailed" : "Introduction emailed", body: d };
    case "sequence": return { cat: "email", title: "Guidebook emails", body: d };
    case "emailed": {
      const [head, , ...rest] = d.split("\n");
      const subj = head.match(/Subject: (.*)$/)?.[1];
      return { cat: "email", title: subj ? `Email sent: ${subj}` : "Email sent", body: head.replace(/\. Subject: .*$/, ""), detail: rest.join("\n") || null };
    }
    case "meeting": {
      const title = /cancel/i.test(d) ? "Meeting cancelled" : /^Rescheduled/.test(d) ? "Meeting rescheduled" : /^Booked/.test(d) ? "Meeting booked" : "Meeting";
      return { cat: "meeting", title, body: d.replace(/^(Booked|Rescheduled to) /, "") };
    }
    default: return { cat: "lead", title: e.event.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), body: d };
  }
}

const etDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const etTime = (d: Date | string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
function dayHeading(key: string) {
  const today = etDay(new Date());
  const yest = etDay(new Date(Date.now() - 86400000));
  const label = new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: key.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" });
  return key === today ? `Today · ${label}` : key === yest ? `Yesterday · ${label}` : label;
}

const ICON: Record<Cat, React.ReactNode> = {
  note: <path d="M5 4h10l4 4v12H5z M14 4v5h5 M8 13h8 M8 17h5" />,
  call: <path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />,
  email: <path d="M3 6h18v12H3z M3 7l9 6 9-6" />,
  meeting: <path d="M3 7h12v10H3z M15 10l6-3v10l-6-3" />,
  task: <path d="M4 12l5 5L20 6" />,
  lead: <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />,
  visit: <path d="M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18 M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18" />,
  system: <path d="M12 8v5 M12 16h.01 M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18" />,
};
const Icon = ({ cat }: { cat: Cat }) => (
  <span className={`tl-icon c-${cat}`} aria-hidden="true">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICON[cat]}</svg>
  </span>
);

// One person across Contacts, leads and CPP: details, owner, stage, tags, follow-up, and the full activity timeline.
export default async function Record({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ show?: string }> }) {
  const { key: raw } = await params;
  const { show = "all" } = await searchParams;
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
  const all: Item[] = [
    ...p.acts.map((a) => ({ at: a.created_at, cat: a.kind as Cat, title: kindLabel(a.kind), body: a.body, by: a.author, id: a.id, mine: a.author_id === admin.id, due: a.due_at, done: a.done_at })),
    ...p.events.map((e) => ({ at: e.created_at, by: e.actor_name && e.actor_name !== "Website" ? e.actor_name : null, ...leadEvent(e) })),
    ...p.runs.map((r) => ({ at: r.created_at, cat: "email" as Cat, title: `${sequenceName(r.sequence)} guidebook series`, body: `${r.sent} of 5 emails sent · ${r.status}` })),
    ...[...new Set(views.map((v) => v.session))].slice(0, 30).map((sid) => {
      const pv = views.filter((v) => v.session === sid).reverse();
      const src = pv[0].utm_source ? `from ${pv[0].utm_source}${pv[0].utm_campaign ? ` / ${pv[0].utm_campaign}` : ""}` : pv[0].referrer ? `from ${pv[0].referrer.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}` : "directly";
      return { at: pv[0].ts, cat: "visit" as Cat, title: `Visited the website · ${pv.length} ${pv.length === 1 ? "page" : "pages"}`, body: `${src}${pv[0].device ? ` · ${pv[0].device}` : ""}`, pages: pv.map((v) => ({ path: v.path, title: v.title?.replace(/ \| Labb$/, "") || null })) };
    }),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const openTasks = all.filter((i) => i.cat === "task" && !i.done).sort((a, b) => (a.due ? new Date(a.due).getTime() : Infinity) - (b.due ? new Date(b.due).getTime() : Infinity));
  const filter = FILTERS.find(([k]) => k === show) ?? FILTERS[0];
  const items = all.filter((i) => !filter[2].length || filter[2].includes(i.cat)).filter((i) => !(i.cat === "task" && !i.done));
  const days = new Map<string, Item[]>();
  for (const it of items) {
    const k = etDay(it.at);
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(it);
  }
  const counts = Object.fromEntries(FILTERS.map(([k, , cats]) => [k, all.filter((i) => !cats.length || cats.includes(i.cat)).filter((i) => !(i.cat === "task" && !i.done)).length]));
  const leadIds = p.leads.map((x) => x.id);
  const nextMeeting = leadIds.length ? (await sql()<{ starts_at: Date; room_url: string; host: string }[]>`
    select g.starts_at, g.room_url, m.name as host from lead_meetings g join members m on m.id = g.host_id
    where g.lead_id = any(${leadIds}) and g.status = 'booked' and g.ends_at > now() order by g.starts_at limit 1`)[0] : undefined;
  const today = etDay(new Date());
  const href = (k: string) => `/admin/crm/p/${encodeURIComponent(key)}${k === "all" ? "" : `?show=${k}`}#activity`;

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

              {(nextMeeting || openTasks.length > 0) && (
                <div className="tl-pins">
                  {nextMeeting && (
                    <div className="tl-pin pin-meeting">
                      <Icon cat="meeting" />
                      <div>
                        <span className="tl-pin-label">Next meeting</span>
                        <strong>{fmtWhen(nextMeeting.starts_at)}</strong>
                        <span className="fine"> with {nextMeeting.host}</span>
                      </div>
                      {nextMeeting.room_url && <a className="btn btn-outline-dark tl-pin-btn" href={nextMeeting.room_url} target="_blank" rel="noreferrer">Join</a>}
                    </div>
                  )}
                  {openTasks.map((t) => {
                    const overdue = t.due && etDay(t.due) < today;
                    const dueToday = t.due && etDay(t.due) === today;
                    return (
                      <div key={t.id} className={`tl-pin pin-task${overdue ? " overdue" : ""}`}>
                        <Icon cat="task" />
                        <div>
                          <span className="tl-pin-label">{overdue ? `Overdue · was due ${day(t.due!)}` : dueToday ? "Due today" : t.due ? `Due ${day(t.due)}` : "Open task"}</span>
                          <strong>{t.body}</strong>
                          <span className="fine"> · {t.by}</span>
                        </div>
                        {post("done", <><input type="hidden" name="id" value={t.id} /><button className="btn btn-primary tl-pin-btn" type="submit">Done</button></>)}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="tl-head" id="activity">
                <h2 className="crm-h2" style={{ margin: 0 }}>Activity</h2>
                <nav className="tl-filters" aria-label="Filter activity">
                  {FILTERS.filter(([k]) => k === "all" || counts[k] > 0).map(([k, label]) => (
                    <Link key={k} href={href(k)} className={k === filter[0] ? "on" : ""} aria-current={k === filter[0] ? "true" : undefined}>{label} <span>{counts[k]}</span></Link>
                  ))}
                </nav>
              </div>
              {!items.length ? <p className="fine" style={{ textAlign: "left" }}>Nothing here yet.</p> : (
                <div className="tl">
                  {[...days.entries()].map(([d, list]) => (
                    <section key={d} className="tl-day">
                      <h3 className="tl-date">{dayHeading(d)}</h3>
                      <ol>
                        {list.map((it, i) => (
                          <li key={i} className={`tl-item c-${it.cat}${it.quiet ? " quiet" : ""}${it.done ? " done" : ""}`}>
                            <Icon cat={it.cat} />
                            <div className="tl-main">
                              <div className="tl-top">
                                <strong>{it.done ? `Task done: ${it.body}` : it.title}</strong>
                                <span className="tl-meta">{etTime(it.at)}{it.by ? ` · ${it.by}` : ""}</span>
                              </div>
                              {it.body && !it.done && it.cat !== "visit" && <p className="tl-body">{it.body}</p>}
                              {it.cat === "visit" && (
                                <>
                                  <p className="tl-sub">Came {it.body}</p>
                                  <ol className="tl-pages">
                                    {it.pages!.slice(0, 10).map((pg, j) => <li key={j}><a href={pg.path} target="_blank" rel="noreferrer">{pg.title || pg.path}</a></li>)}
                                    {it.pages!.length > 10 && <li className="fine">+{it.pages!.length - 10} more</li>}
                                  </ol>
                                </>
                              )}
                              {it.detail && (
                                <details className="tl-detail"><summary>Show message</summary><div>{it.detail}</div></details>
                              )}
                              {it.id && (
                                <div className="tl-actions">
                                  {it.cat === "task" && it.done && post("reopen", <><input type="hidden" name="id" value={it.id} /><button className="linkish" type="submit">Reopen</button></>)}
                                  {it.mine && post("delete", <><input type="hidden" name="id" value={it.id} /><button className="linkish" type="submit">Delete</button></>)}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
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
                    <li key={x.id}>{x.role === "admin" ? <span>Labb admin account</span> : <Link href={`/admin/members/${x.id}`}>{x.cpp_status === "prospect" ? "CPP prospect" : "CPP member account"}</Link>}<span className="fine">{x.status}{x.role !== "admin" ? ` · CPP ${x.cpp_status}` : ""}{x.last_login_at ? ` · last sign-in ${day(x.last_login_at)}` : ""}</span></li>
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
