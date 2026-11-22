import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { ALL_LISTS as LISTS, LIST_LABELS, SOURCES, sourceLabel } from "@/lib/contacts";

export const metadata: Metadata = { title: "Contacts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PER = 40;
const num = (x: number) => x.toLocaleString("en-US");
type C = { id: string; email: string | null; address?: string | null; first_name: string | null; last_name: string | null; company: string | null; city: string | null; state: string | null; phone: string | null; source: string; list: string | null; status: string; assigned_at: Date | null };

// Opt-ins imported from HubSpot and Labb Station wait here until an admin puts them on a list.
export default async function Contacts({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; state?: string; p?: string }> }) {
  await requireAdmin("/admin/contacts");
  const sp = await searchParams;
  const view = sp.view && ["pending", "ignored", ...LISTS].includes(sp.view) ? sp.view : "pending";
  const q = (sp.q || "").trim().slice(0, 100).toLowerCase();
  const st = (sp.state || "").trim().slice(0, 20).toUpperCase();
  const page = Math.max(1, Number(sp.p) || 1);
  const like = `%${q}%`;
  const db = sql();
  const qs = (o: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ view, q: q || undefined, state: st || undefined, ...o })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/admin/contacts?${u}`;
  };
  const here = qs({ p: page > 1 ? page : undefined });

  const [counts, states, flash] = await Promise.all([
    db<{ k: string; n: number }[]>`select case when status = 'assigned' then list else status end as k, count(*)::int as n from contact_imports group by 1`,
    db<{ state: string }[]>`select distinct upper(trim(state)) as state from contact_imports where coalesce(trim(state), '') <> '' order by 1`,
    readFlash(),
  ]);
  const n = (k: string) => counts.find((c) => c.k === k)?.n ?? 0;
  const filter = db`(${q} = '' or lower(coalesce(company, '')) like ${like} or lower(coalesce(email, '')) like ${like} or lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) like ${like})
    and (${st} = '' or upper(trim(coalesce(state, ''))) = ${st})`;

  // Pending: grouped by company, biggest first, so a whole company goes onto a list with one click.
  let groups: { key: string; company: string | null; n: number; places: string | null; contacts: C[] }[] = [];
  let total = 0;
  let rows: C[] = [];
  if (view === "pending") {
    const g = await db<{ key: string; company: string | null; n: number; places: string | null; total: number }[]>`
      select lower(trim(coalesce(company, ''))) as key, max(company) as company, count(*)::int as n,
        string_agg(distinct nullif(trim(concat_ws(', ', city, upper(state))), ''), ' · ') as places, count(*) over ()::int as total
      from contact_imports where status = 'pending' and ${filter}
      group by 1 order by (lower(trim(coalesce(company, ''))) = ''), count(*) desc, 1 limit ${PER} offset ${(page - 1) * PER}`;
    total = g[0]?.total ?? 0;
    const keys = g.map((x) => x.key);
    const cs = keys.length
      ? await db<(C & { key: string })[]>`select *, lower(trim(coalesce(company, ''))) as key from contact_imports
          where status = 'pending' and lower(trim(coalesce(company, ''))) = any(${keys}) and ${filter} order by lower(coalesce(email, ''))`
      : [];
    groups = g.map((x) => ({ ...x, contacts: cs.filter((c) => c.key === x.key) }));
  } else {
    const r = await db<(C & { total: number })[]>`
      select *, count(*) over ()::int as total from contact_imports
      where ${view === "ignored" ? db`status = 'ignored'` : db`status = 'assigned' and list = ${view}`} and ${filter}
      order by lower(coalesce(company, '')), lower(coalesce(email, '')) limit 100 offset ${(page - 1) * 100}`;
    rows = r;
    total = r[0]?.total ?? 0;
  }
  const pages = Math.max(1, Math.ceil(total / (view === "pending" ? PER : 100)));
  const name = (c: C) => [c.first_name, c.last_name].filter(Boolean).join(" ") || (c.email ? "" : c.company || "");

  const listButtons = (hidden: React.ReactNode, label: string) => (
    <div className="ct-assign">
      <form action="/api/admin/contacts" method="post" className="ct-assign">
        <input type="hidden" name="back" value={here} />
        <input type="hidden" name="action" value="assign" />
        {hidden}
        <span className="fine">{label}</span>
        {LISTS.map((l) => <button key={l} className="btn btn-outline-dark btn-sm" type="submit" name="list" value={l}>{LIST_LABELS[l]}</button>)}
      </form>
      <form action="/api/admin/contacts" method="post">
        <input type="hidden" name="back" value={here} />
        <input type="hidden" name="action" value="ignore" />
        {hidden}
        <button className="linkish" type="submit">Don&apos;t add</button>
      </form>
    </div>
  );

  return (
    <>
      <AdminBar title="Contacts" current="/admin/contacts" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="leads-head">
            <p className="lede" style={{ margin: 0, maxWidth: 760 }}>Opt-in contacts from HubSpot and the Labb Station platform. Uploads land in Pending, or straight on a list you choose; put each company on the right newsletter list. Unsubscribes always apply.</p>
          </div>

          <details className="hero-card" open={!n("pending") && !LISTS.some((l) => n(l))} style={{ marginBottom: 24 }}>
            <summary><strong>Upload a CSV</strong> <span className="fine">· HubSpot or Labb Station export. Needs an Email column; name, company, address and phone are picked up when present.</span></summary>
            <form action="/api/admin/contacts" method="post" encType="multipart/form-data" className="ct-upload">
              <input type="hidden" name="action" value="upload" />
              <div className="field"><label htmlFor="ct-f">File</label><input id="ct-f" type="file" name="file" accept=".csv,text/csv" required /></div>
              <div className="field">
                <label htmlFor="ct-s">Source</label>
                <select id="ct-s" name="source" defaultValue="hubspot">{SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="ct-to">Put new contacts on</label>
                <select id="ct-to" name="to" defaultValue="">
                  <option value="">Pending (sort them here)</option>
                  {LISTS.map((l) => <option key={l} value={l}>{LIST_LABELS[l]}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Upload</button>
            </form>
            <p className="fine" style={{ margin: "10px 0 0" }}><strong>Clinic locations (no marketing)</strong> never receive newsletters. Use it for clinics that haven&apos;t opted in and for lab sites such as Quest and LabCorp; rows there may have no email if they include Company and Address. Only upload people who opted in to Labb email. Every upload is checked against existing contacts by email, so nobody is added twice; contacts already sorted onto a list keep their list.</p>
          </details>

          {(() => {
            // Two levels: the group first, then the lists inside it.
            const groups: { key: string; label: string; tabs: [string, string][] }[] = [
              { key: "sort", label: "To sort", tabs: [["pending", "Pending"], ["ignored", "Not added"]] },
              { key: "lists", label: "Newsletter lists", tabs: (["employers", "clinics", "treatment", "corrections"] as const).map((l) => [l, LIST_LABELS[l]] as [string, string]) },
              { key: "locations", label: "No marketing", tabs: [["clinic-locations", "Clinic locations"]] },
            ];
            const cur = groups.find((g) => g.tabs.some(([k]) => k === view)) ?? groups[0];
            return (
              <div className="ct-nav">
                <nav className="ct-groups-nav" aria-label="Contact groups">
                  {groups.map((g) => (
                    <Link key={g.key} href={`/admin/contacts?view=${g.tabs[0][0]}`} aria-current={g === cur ? "true" : undefined}>
                      {g.label} <span className="ct-count">{num(g.tabs.reduce((t, [k]) => t + n(k), 0))}</span>
                    </Link>
                  ))}
                </nav>
                <nav className="ct-lists-nav" aria-label={`${cur.label} lists`}>
                  {cur.tabs.map(([k, l]) => (
                    <Link key={k} href={`/admin/contacts?view=${k}`} aria-current={view === k ? "page" : undefined}>
                      {l} <span className="ct-count">{num(n(k))}</span>
                    </Link>
                  ))}
                </nav>
                {cur.key === "locations" && <p className="fine" style={{ margin: "8px 0 0", textAlign: "left" }}>Clinics that never receive newsletters, including lab sites such as Quest and LabCorp.</p>}
              </div>
            );
          })()}

          <form className="ct-filter" action="/admin/contacts">
            <input type="hidden" name="view" value={view} />
            <input name="q" defaultValue={q} placeholder="Search company, name or email" aria-label="Search" />
            <select name="state" defaultValue={st} aria-label="State"><option value="">All states</option>{states.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}</select>
            <button className="btn btn-outline-dark" type="submit">Filter</button>
            <span className="fine">{total} {view === "pending" ? "companies" : "contacts"}</span>
          </form>

          {view === "pending" && (
            <div className="ct-groups">
              {!groups.length && <p className="hero-card">Nothing pending.</p>}
              {groups.map((g) => (
                <div className="hero-card ct-group" key={g.key || "none"}>
                  <div className="ct-head">
                    <div>
                      <h3>{g.company || "No company"}</h3>
                      <span className="fine">{g.n} {g.n === 1 ? "contact" : "contacts"}{g.places ? ` · ${g.places.length > 120 ? `${g.places.slice(0, 118)}...` : g.places}` : ""}</span>
                    </div>
                    {g.key ? listButtons(<input type="hidden" name="company" value={g.key} />, "Add all to:") : null}
                  </div>
                  <details open={!g.key}>
                    <summary className="fine">Show contacts</summary>
                    <form action="/api/admin/contacts" method="post" className="ct-pick">
                      <input type="hidden" name="back" value={here} />
                      <ul>
                        {g.contacts.map((c) => (
                          <li key={c.id}>
                            <label><input type="checkbox" name="id" value={c.id} defaultChecked={!!g.key} /> <strong>{name(c) || c.email}</strong> <span className="fine">{c.email}{c.phone ? ` · ${c.phone}` : ""} · {sourceLabel(c.source)}</span></label>
                          </li>
                        ))}
                      </ul>
                      <div className="ct-assign">
                        <span className="fine">Checked to:</span>
                        <select name="list" defaultValue="" aria-label="List"><option value="" disabled>Choose a list</option>{LISTS.map((l) => <option key={l} value={l}>{LIST_LABELS[l]}</option>)}</select>
                        <button className="btn btn-outline-dark btn-sm" type="submit" name="action" value="assign">Add</button>
                        <button className="linkish" type="submit" name="action" value="ignore">Don&apos;t add</button>
                      </div>
                    </form>
                  </details>
                </div>
              ))}
            </div>
          )}

          {view !== "pending" && (
            <form action="/api/admin/contacts" method="post">
              <input type="hidden" name="back" value={here} />
              {!rows.length ? <p className="hero-card">No contacts here.</p> : (
                <div className="bg-table-wrap">
                  <table className="bg-table">
                    <thead><tr><th scope="col"></th><th scope="col">Contact</th><th scope="col">Company</th><th scope="col">Location</th><th scope="col">Source</th><th scope="col">Added</th></tr></thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr key={c.id}>
                          <td><input type="checkbox" name="id" value={c.id} aria-label={`Select ${c.email}`} /></td>
                          <th scope="row">{name(c) || c.email}<span className="bg-note" style={{ color: "var(--muted)" }}>{c.email || [c.address, c.phone].filter(Boolean).join(" · ") || "No email"}</span></th>
                          <td>{c.company}</td>
                          <td>{[c.city, c.state].filter(Boolean).join(", ")}</td>
                          <td>{sourceLabel(c.source)}</td>
                          <td>{c.assigned_at ? fmtDate(c.assigned_at).split(",").slice(0, 2).join(",") : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {rows.length > 0 && (
                <div className="ct-assign" style={{ marginTop: 14 }}>
                  <span className="fine">Checked:</span>
                  <select name="list" defaultValue="" aria-label="Move to list"><option value="" disabled>Move to list</option>{LISTS.map((l) => <option key={l} value={l}>{LIST_LABELS[l]}</option>)}</select>
                  <button className="btn btn-outline-dark btn-sm" type="submit" name="action" value="assign">Move</button>
                  <button className="linkish" type="submit" name="action" value="pending">Back to Pending</button>
                </div>
              )}
            </form>
          )}

          {pages > 1 && (
            <p className="ct-pages">
              {page > 1 && <Link href={qs({ p: page - 1 })}>← Previous</Link>}
              <span className="fine">Page {page} of {pages}</span>
              {page < pages && <Link href={qs({ p: page + 1 })}>Next →</Link>}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
