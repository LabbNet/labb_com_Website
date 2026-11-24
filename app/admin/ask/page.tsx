import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import type { AskRow } from "@/lib/ask";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "Ask an Expert", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS: [string, string][] = [["review", "To review"], ["auto", "Answered from guidebooks"], ["approved", "Approved"], ["matched", "Repeat questions"], ["rejected", "Not answered"]];
const SOURCE: Record<string, string> = { ai: "Drafted from the guidebooks", kits: "Drafted from kit data", passages: "Closest guidebook passages (edit into an answer)", none: "No draft: the guidebooks don't cover this. Write the answer.", working: "Drafting...", admin: "Written by Labb" };

export default async function AdminAsk({ searchParams }: { searchParams: Promise<{ tab?: string; s?: string }> }) {
  await requireAdmin("/admin/ask");
  const { tab = "review", s = "" } = await searchParams;
  const db = sql();
  const [flash, counts] = await Promise.all([
    readFlash(),
    db<{ status: string; n: number }[]>`select status, count(*)::int as n from ask_questions group by status`,
  ]);
  const n = Object.fromEntries(counts.map((c) => [c.status, c.n]));
  const status = tab === "review" ? "pending" : tab;
  const search = s.trim().slice(0, 200);
  const rows = await db<(AskRow & { reviewer: string | null; matched_q: string | null; matched_slug: string | null })[]>`
    select a.*, m.name as reviewer, mq.question as matched_q, mq.slug as matched_slug from ask_questions a
    left join members m on m.id = a.reviewed_by left join ask_questions mq on mq.id = a.matched_id
    where a.status = ${status} ${search ? db`and (lower(a.question) like ${`%${search.toLowerCase()}%`} or lower(coalesce(a.answer, '')) like ${`%${search.toLowerCase()}%`})` : db``}
    order by ${status === "pending" ? db`a.created_at asc` : db`coalesce(a.reviewed_at, a.created_at) desc`} limit 200`;
  const back = `/admin/ask${tab !== "review" ? `?tab=${tab}` : ""}`;
  const hidden = (id: string, action: string) => <><input type="hidden" name="id" value={id} /><input type="hidden" name="back" value={back} /><input type="hidden" name="action" value={action} /></>;

  return (
    <>
      <AdminBar title="Ask an Expert" current="/admin/ask" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="ask-admin-head">
            <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Ask an Expert</h1>
            <Link href="/ask" target="_blank">View the public page</Link>
          </div>
          <p style={{ marginTop: 6 }}>Questions the guidebooks, labb.com or the kit data answer go out right away and land in Answered from guidebooks, where you can spot-check them and publish the good ones on labb.com. Only questions the system can&apos;t answer wait in To review: write or edit the answer and approve it. Every answer, automatic or approved, is reused right away for anyone who asks the same thing.{!process.env.ANTHROPIC_API_KEY && <strong> AI drafting is off until ANTHROPIC_API_KEY is set in Render; until then drafts come from kit data or the closest guidebook passages.</strong>}</p>

          <nav className="tl-filters" aria-label="Questions" style={{ margin: "18px 0" }}>
            {TABS.map(([k, label]) => {
              const c = n[k === "review" ? "pending" : k] || 0;
              return <Link key={k} href={k === "review" ? "/admin/ask" : `/admin/ask?tab=${k}`} className={k === tab ? "on" : ""}>{label} <span>{c}</span></Link>;
            })}
          </nav>
          {tab !== "review" && (
            <form method="get" className="ask-search" style={{ marginBottom: 16 }}>
              <input type="hidden" name="tab" value={tab} />
              <input name="s" defaultValue={search} placeholder="Search questions and answers" aria-label="Search" />
              <button className="btn btn-outline-dark" type="submit">Search</button>
            </form>
          )}

          {!rows.length && <p className="fine" style={{ textAlign: "left" }}>{tab === "review" ? "Nothing waiting. Every question has been reviewed." : "Nothing here yet."}</p>}

          <div className="ask-queue">
            {rows.map((q) => (
              <article key={q.id} id={`q-${q.id}`} className="hero-card ask-item">
                <div className="ask-item-head">
                  <span className="fine">#{q.id} · {fmtDate(q.created_at)} ET{q.name || q.email ? ` · ${[q.name, q.company, q.email].filter(Boolean).join(" · ")}` : ""}{q.lead_id ? <> · <Link href={`/admin/leads/${q.lead_id}`}>Lead</Link></> : null}</span>
                  {q.status === "approved" && <span className="fine">{q.published ? <Link href={`/ask/${q.slug}`} target="_blank">Published</Link> : "Private"}{q.reviewer ? ` · approved by ${q.reviewer}` : ""}{q.views ? ` · ${q.views} views` : ""}</span>}
                </div>

                {q.status === "matched" ? (
                  <>
                    <p className="ask-q">{q.question}</p>
                    <p className="fine" style={{ textAlign: "left" }}>Shown the approved answer to: {q.matched_slug ? <Link href={`/ask/${q.matched_slug}`} target="_blank">{q.matched_q}</Link> : q.matched_q}</p>
                  </>
                ) : q.status === "rejected" ? (
                  <>
                    <p className="ask-q">{q.question}</p>
                    <form action="/api/admin/ask" method="post">{hidden(q.id, "delete")}<button className="linkish" type="submit">Delete</button></form>
                  </>
                ) : (
                  <form action="/api/admin/ask" method="post" className="ask-edit">
                    <input type="hidden" name="id" value={q.id} /><input type="hidden" name="back" value={back} />
                    <label className="fine" htmlFor={`aq-${q.id}`} style={{ textAlign: "left" }}>Question (fix typos before publishing)</label>
                    <input id={`aq-${q.id}`} name="question" defaultValue={q.question} maxLength={1000} className="ask-q-input" />
                    {q.status === "pending" && (
                      <p className={`ask-src src-${q.draft_source || "working"}`}>{SOURCE[q.draft_source || "working"] || "Drafting..."}{q.confidence && q.draft_source === "ai" ? ` · confidence ${q.confidence}` : ""}</p>
                    )}
                    <label className="fine" htmlFor={`aa-${q.id}`} style={{ textAlign: "left" }}>Answer</label>
                    <textarea id={`aa-${q.id}`} name="answer" rows={9} maxLength={8000} defaultValue={q.status === "approved" ? q.answer || "" : q.draft_source === "passages" ? "" : q.draft || ""} placeholder={q.draft_source === "passages" ? "Write the answer using the passages below." : "Write the answer."} />
                    {q.draft_source === "passages" && q.draft && <details className="tl-detail"><summary>Closest guidebook passages</summary><div>{q.draft}</div></details>}
                    {q.sources?.length > 0 && <p className="fine" style={{ textAlign: "left", margin: 0 }}>Sources: {q.sources.map((s, i) => <span key={i}>{i ? " · " : ""}{s.url ? <Link href={s.url} target="_blank">{s.title}</Link> : s.title}{s.heading ? ` (${s.heading})` : ""}</span>)}</p>}
                    <label className="ask-pub"><input type="checkbox" name="publish" value="1" defaultChecked={q.status === "approved" ? q.published : true} /> Publish on labb.com (search engines and AI search can find it)</label>
                    {q.status === "auto" && <p className="fine" style={{ textAlign: "left", margin: 0 }}>Answered automatically{q.emailed_at ? ` and emailed ${fmtDate(q.emailed_at)} ET` : ""}. Not on labb.com until you approve it.</p>}
                    <div className="ask-btns">
                      {q.status === "pending" ? (
                        <>
                          <button className="btn btn-primary" type="submit" name="action" value="approve">Approve{q.email ? " and email" : ""}</button>
                          <button className="btn btn-outline-dark" type="submit" name="action" value="save">Save draft</button>
                          <button className="linkish" type="submit" name="action" value="redraft" formNoValidate>Redraft</button>
                          <button className="linkish" type="submit" name="action" value="reject" formNoValidate>Don&apos;t answer (spam or off-topic)</button>
                        </>
                      ) : q.status === "auto" ? (
                        <>
                          <button className="btn btn-primary" type="submit" name="action" value="approve">Approve</button>
                          <button className="linkish" type="submit" name="action" value="delete" formNoValidate>Delete</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-primary" type="submit" name="action" value="update">Save changes</button>
                          <button className="linkish" type="submit" name="action" value="delete" formNoValidate>Delete</button>
                        </>
                      )}
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>

          <details className="hero-card ask-add" style={{ marginTop: 28 }}>
            <summary><strong>Add a question and answer</strong> <span className="fine">for something people ask that isn&apos;t in the guidebooks yet</span></summary>
            <form action="/api/admin/ask" method="post" className="ask-edit" style={{ marginTop: 12 }}>
              <input type="hidden" name="action" value="add" /><input type="hidden" name="back" value={back} />
              <input name="question" required minLength={8} maxLength={1000} placeholder="Question" className="ask-q-input" aria-label="Question" />
              <textarea name="answer" required rows={7} maxLength={8000} placeholder="Answer" aria-label="Answer" />
              <label className="ask-pub"><input type="checkbox" name="publish" value="1" defaultChecked /> Publish on labb.com</label>
              <button className="btn btn-primary" type="submit" style={{ justifySelf: "start" }}>Add to Ask an Expert</button>
            </form>
          </details>
        </div>
      </section>
    </>
  );
}
