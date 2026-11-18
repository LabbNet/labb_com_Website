import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "@/lib/db";
import type { Member } from "@/lib/auth";

// Online courses hosted on labb.com. Each course file is a self-contained player; the site
// gates it, stores progress per learner and records completion.
// What is built into a file (chapters, questions, pass mark, storage key) lives here.
// What admins edit (name, overview, price, pages, CPP access, status) lives in the courses table.
type CourseFile = { file: string; storageKey: string; version: string; chapters: number; questions: number; passPct: number };

export const COURSE_FILES: Record<string, CourseFile> = {
  "clinic-owners": { file: "labbhr-clinic-owners-course-v4.0.0.html", storageKey: "labbhr-clinic-course-v2", version: "4.0.0", chapters: 11, questions: 225, passPct: 85 },
  employer: { file: "labbhr-employer-course-v1.2.1.html", storageKey: "labbhr-employer-course-v1-2", version: "1.2.1", chapters: 16, questions: 320, passPct: 85 },
  "employer-healthcare": { file: "labbhr-employer-healthcare-course-v1.2.1.html", storageKey: "labbhr-employer-hc-course-v1-2", version: "1.2.1", chapters: 19, questions: 380, passPct: 85 },
  "employer-hospitality": { file: "labbhr-employer-hospitality-course-v1.2.1.html", storageKey: "labbhr-employer-hosp-course-v1-2", version: "1.2.1", chapters: 19, questions: 380, passPct: 85 },
  construction: { file: "labbhr-construction-screening-course-v1.7.1.html", storageKey: "labbhr-construction-course-v1-70", version: "1.7.1", chapters: 9, questions: 180, passPct: 85 },
  manufacturing: { file: "labbhr-manufacturing-screening-course-v1.7.1.html", storageKey: "labbhr-manufacturing-course-v1-70", version: "1.7.1", chapters: 9, questions: 180, passPct: 85 },
  logistics: { file: "labbhr-logistics-screening-course-v1.7.1.html", storageKey: "labbhr-logistics-course-v1-70", version: "1.7.1", chapters: 9, questions: 180, passPct: 85 },
  "rapid-test": { file: "labbhr-rapid-test-course-v1.2.html", storageKey: "labbhr-rapid-course-v1-2", version: "1.2", chapters: 11, questions: 220, passPct: 85 },
  "specimen-collector": { file: "labbhr-specimen-collector-course-v1.2.html", storageKey: "labbhr-collector-course-v12", version: "1.2", chapters: 16, questions: 320, passPct: 85 },
  "train-the-trainer": { file: "labbhr-train-the-trainer-course-v1.2.html", storageKey: "labbhr-ttt-course-v1-2", version: "1.2", chapters: 16, questions: 320, passPct: 85 },
};

export type CourseType = "position" | "product" | "software" | "specimen";
export type CourseStatus = "live" | "coming" | "draft";
export const COURSE_TYPES: Record<CourseType, string> = { position: "Position", product: "Product", software: "Software", specimen: "Specimen collection" };

type CourseRow = {
  slug: string; title: string; short: string; type: CourseType; overview: string; for_who: string; price_cents: number | null;
  pages: number | null; cpp_included: boolean; cpp_discount_pct: number; status: CourseStatus; sort: number; updated_at: Date;
};

export type Course = {
  slug: string; title: string; short: string; type: CourseType; overview: string; forWho: string;
  priceCents: number | null; pages: number | null; cppIncluded: boolean; cppDiscountPct: number; status: CourseStatus; sort: number; updatedAt: Date;
  hasFile: boolean; file: string; storageKey: string; version: string; chapters: number; questions: number; passPct: number;
  forSale: boolean; // live, priced and has a course file
};

function toCourse(r: CourseRow): Course {
  const f = COURSE_FILES[r.slug];
  return {
    slug: r.slug, title: r.title, short: r.short, type: r.type, overview: r.overview, forWho: r.for_who, priceCents: r.price_cents,
    pages: r.pages, cppIncluded: r.cpp_included, cppDiscountPct: r.cpp_discount_pct ?? 0, status: r.status, sort: r.sort, updatedAt: r.updated_at,
    hasFile: !!f, file: f?.file ?? "", storageKey: f?.storageKey ?? "", version: f?.version ?? "", chapters: f?.chapters ?? 0,
    questions: f?.questions ?? 0, passPct: f?.passPct ?? 0,
    forSale: !!f && r.status === "live" && r.price_cents !== null,
  };
}

export async function listCourses(): Promise<Course[]> {
  const rows = await sql()<CourseRow[]>`select * from courses order by sort, title`;
  return rows.map(toCourse);
}
export async function getCourse(slug: string): Promise<Course | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const [r] = await sql()<CourseRow[]>`select * from courses where slug = ${slug}`;
  return r ? toCourse(r) : null;
}

// Price for a buyer: active CPP members get the course's CPP discount (unless it's included free for them).
export async function isActiveCpp(m: Member | null) {
  if (!m || m.role !== "member") return false;
  const [row] = await sql()<{ cpp_status: string | null }[]>`select cpp_status from members where id = ${m.id}`;
  return row?.cpp_status === "active";
}
export function cppPriceCents(c: Course) {
  if (c.priceCents === null || c.cppIncluded || !c.cppDiscountPct) return null;
  return Math.round((c.priceCents * (100 - c.cppDiscountPct)) / 100);
}

// Chapter outline read from the course file, cached per file.
export type Chapter = { n: number; title: string; part: string; desc: string };
const outlines = new Map<string, Chapter[]>();
export async function courseOutline(c: Course): Promise<Chapter[]> {
  if (!c.hasFile) return [];
  const hit = outlines.get(c.file);
  if (hit) return hit;
  const html = await readFile(path.join(process.cwd(), "private", "courses", c.file), "utf8");
  const m = html.match(/id="courseData" type="application\/json">([\s\S]*?)<\/script>/);
  let list: Chapter[] = [];
  if (m) {
    try {
      const d = JSON.parse(m[1]) as { chapters: { n: number | string; title: string; part?: string; desc?: string }[] };
      const clean = (t: string) => t.replace(/\u2014/g, ":").replace(/<[^>]+>/g, "");
      list = d.chapters.map((ch) => ({ n: Number(ch.n), title: clean(ch.title), part: clean(ch.part ?? ""), desc: clean(ch.desc ?? "") }));
    } catch { list = []; }
  }
  outlines.set(c.file, list);
  return list;
}

export type Enrollment = {
  id: string; member_id: string; course: string; source: string; chapters_done: number; started_at: Date | null;
  completed_at: Date | null; cert_id: string | null; cert_name: string | null; created_at: Date; updated_at: Date;
};

// Access: an enrollment, or an active CPP member for courses included with the program (enrolled on first open), or a Labb admin.
export async function courseAccess(m: Member, c: Course): Promise<Enrollment | null> {
  if (!c.hasFile) return null;
  const db = sql();
  const [e] = await db<Enrollment[]>`select * from course_enrollments where member_id = ${m.id} and course = ${c.slug}`;
  if (e) return e;
  const [row] = await db<{ cpp_status: string | null }[]>`select cpp_status from members where id = ${m.id}`;
  const cpp = m.role === "member" && row?.cpp_status === "active";
  if ((cpp && c.cppIncluded && c.status === "live") || m.role === "admin") {
    const [n] = await db<Enrollment[]>`
      insert into course_enrollments (member_id, course, source) values (${m.id}, ${c.slug}, ${m.role === "admin" ? "admin" : "cpp"})
      on conflict (member_id, course) do update set updated_at = now() returning *`;
    return n;
  }
  return null;
}

// Serves the course player with a small shim that keeps its progress in the learner's account.
export async function coursePage(c: Course, state: unknown, learner: { name: string; clinic: string | null }) {
  let html = await readFile(path.join(process.cwd(), "private", "courses", c.file), "utf8");
  // House style and hosted-course wording: no em dashes, "Guidebook" not "Handbook", progress lives in the account.
  const swaps: [RegExp, string][] = [
    [/—/g, ":"],
    [/Clinic Owners Handbook/g, "Clinic Owners Guidebook"],
    [/LabbHR Handbook/g, "LabbHR Guidebook"],
    [/This handbook/g, "This guidebook"],
    [/Your progress is saved in this browser on this device\./g, "Your progress saves to your Labb account, so you can continue on any device."],
    [/Your notes are saved in this browser\./g, "Your notes save to your Labb account."],
    [/All progress in this browser will be erased\./g, "All of your progress will be erased."],
  ];
  for (const [a, b] of swaps) html = html.replace(a, b);
  const boot = JSON.stringify({ key: c.storageKey, course: c.slug, state: state ?? null, name: learner.name, clinic: learner.clinic ?? "" }).replace(/</g, "\\u003c");
  const shim = `<script>(function(){var B=${boot};var mem=B.state?JSON.stringify(B.state):null;
if(!mem){mem=JSON.stringify({name:B.name,clinic:B.clinic,start:'',view:'welcome',curCh:1,ch:{},completedAt:null,certId:null});}
var real;try{real=window.localStorage;}catch(e){real=null;}var t=null;
function body(){return JSON.stringify({course:B.course,state:JSON.parse(mem)});}
function sync(){t=null;try{fetch('/api/learn/progress',{method:'POST',headers:{'content-type':'application/json'},body:body(),credentials:'same-origin',keepalive:true});}catch(e){}}
var ls={getItem:function(k){return k===B.key?mem:(real?real.getItem(k):null);},setItem:function(k,v){if(k===B.key){mem=String(v);if(t)clearTimeout(t);t=setTimeout(sync,700);}else if(real){real.setItem(k,v);}},removeItem:function(k){if(k!==B.key&&real)real.removeItem(k);},clear:function(){},key:function(i){return real?real.key(i):null;},get length(){return real?real.length:0;}};
try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return ls;}});}catch(e){}
window.addEventListener('pagehide',function(){if(t){clearTimeout(t);try{navigator.sendBeacon('/api/learn/progress',new Blob([body()],{type:'application/json'}));}catch(e){}}});
})();</script>`;
  // The player's own script reads localStorage at start, so the shim goes in before any script.
  return html.replace(/<script/i, `${shim}<script`);
}

// Pull the facts the site needs out of the player state.
export function summarize(c: Course, state: Record<string, unknown> | null) {
  const ch = (state?.ch ?? {}) as Record<string, { exam?: { passed?: boolean } }>;
  let done = 0;
  for (let n = 1; n <= c.chapters; n++) if (ch[n]?.exam?.passed) done++;
  const completedAt = typeof state?.completedAt === "string" || typeof state?.completedAt === "number" ? new Date(state.completedAt as string) : null;
  return {
    done,
    complete: done >= c.chapters && !!completedAt && !Number.isNaN(completedAt.getTime()),
    completedAt,
    certId: typeof state?.certId === "string" ? state.certId.slice(0, 60) : null,
    name: typeof state?.name === "string" ? state.name.slice(0, 120) : null,
    started: !!(typeof state?.start === "string" && state.start) || done > 0 || Object.keys(ch).length > 0,
  };
}

// Builds a free username from the email: name part, then name2, name3...
export async function uniqueUsername(email: string) {
  let base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 34);
  if (base.length < 3) base = (base + "member").slice(0, 34);
  const taken = new Set((await sql()<{ username: string }[]>`select lower(username) as username from members where lower(username) like ${base + "%"}`).map((r) => r.username));
  let u = base;
  for (let n = 2; taken.has(u); n++) u = `${base}${n}`;
  return u;
}

// Gives someone a course: finds or creates their account (as a learner), enrolls them, and emails them.
// Safe to call twice for the same Stripe session.
export async function grantCourse(o: { email: string; name: string; course: Course; source: "purchase" | "admin"; stripeSession?: string; amountCents?: number; by?: string }) {
  const { sendInvite } = await import("@/lib/invites");
  const { emailLayout, sendMail } = await import("@/lib/mail");
  const { absoluteUrl } = await import("@/lib/site");
  const db = sql();
  const email = o.email.trim().toLowerCase();
  if (o.stripeSession) {
    const [dup] = await db<{ id: string }[]>`select id from course_enrollments where stripe_session = ${o.stripeSession}`;
    if (dup) return { created: false, invited: false, link: null as string | null, sent: false, already: true };
  }
  let [m] = await db<{ id: string; email: string; name: string; username: string; role: string; status: string }[]>`
    select id, email, name, username, role, status from members where lower(email) = ${email} limit 1`;
  let created = false;
  if (!m) {
    const username = await uniqueUsername(email);
    [m] = await db`insert into members (username, email, name, role, created_by) values (${username}, ${email}, ${o.name.trim() || email}, 'learner', ${o.by ?? null})
      returning id, email, name, username, role, status`;
    created = true;
  }
  await db`insert into course_enrollments (member_id, course, source, stripe_session, amount_cents, created_by)
    values (${m.id}, ${o.course.slug}, ${o.source}, ${o.stripeSession ?? null}, ${o.amountCents ?? null}, ${o.by ?? null})
    on conflict (member_id, course) do update set stripe_session = coalesce(course_enrollments.stripe_session, excluded.stripe_session),
      amount_cents = coalesce(course_enrollments.amount_cents, excluded.amount_cents), updated_at = now()`;
  if (m.status === "invited") {
    const { link, sent } = await sendInvite({ ...m, role: m.role === "learner" ? "learner" : m.role }, o.course.title);
    return { created, invited: true, link, sent, already: false };
  }
  const sent = await sendMail(
    m.email,
    `You're enrolled in the ${o.course.title}`,
    emailLayout("You're enrolled", `<p>Hi ${m.name.split(" ")[0]},</p><p>The <strong>${o.course.title}</strong> is now in your Labb account. Sign in with your existing username (<strong>${m.username}</strong>) to start.</p>`, { href: absoluteUrl("/learn"), label: "Go to my courses" }),
    `The ${o.course.title} is now in your Labb account. Sign in at ${absoluteUrl("/learn")} with username ${m.username}.`,
  );
  return { created, invited: false, link: null, sent, already: false };
}
