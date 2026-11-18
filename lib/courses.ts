import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "@/lib/db";
import type { Member } from "@/lib/auth";

// Online courses hosted on labb.com. The course file is a self-contained player; the site
// gates it, stores progress per learner and records completion.
export type Course = {
  slug: string;
  title: string;
  short: string;
  priceCents: number;
  file: string; // in private/courses
  storageKey: string; // localStorage key the player uses for its state
  chapters: number;
  cppIncluded: boolean;
  version: string;
};

export const COURSES: Course[] = [
  {
    slug: "clinic-owners",
    title: "LabbHR Clinic Owners Course",
    short: "Clinic Owner certification",
    priceCents: 19900,
    file: "labbhr-clinic-owners-course-v4.0.0.html",
    storageKey: "labbhr-clinic-course-v2",
    chapters: 11,
    cppIncluded: true,
    version: "4.0.0",
  },
];
export const getCourse = (slug: string) => COURSES.find((c) => c.slug === slug);

export type Enrollment = {
  id: string; member_id: string; course: string; source: string; chapters_done: number; started_at: Date | null;
  completed_at: Date | null; cert_id: string | null; cert_name: string | null; created_at: Date; updated_at: Date;
};

// Access: an enrollment, or an active CPP member for courses included with the program (enrolled on first open), or a Labb admin.
export async function courseAccess(m: Member, c: Course): Promise<Enrollment | null> {
  const db = sql();
  const [e] = await db<Enrollment[]>`select * from course_enrollments where member_id = ${m.id} and course = ${c.slug}`;
  if (e) return e;
  const [row] = await db<{ cpp_status: string | null }[]>`select cpp_status from members where id = ${m.id}`;
  const cpp = m.role === "member" && row?.cpp_status === "active";
  if ((cpp && c.cppIncluded) || m.role === "admin") {
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
