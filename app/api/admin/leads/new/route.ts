import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { admins, isStage, keyHref, upsertPerson } from "@/lib/crm";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent, saveLead } from "@/lib/leads";
import { isSegment, LEAD_SOURCES } from "@/lib/segments";

// Labb admin adds a lead by hand. Saved like a website lead (type "manual"), no emails go out.
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  if (!(await sameOrigin())) return go(req, "/admin/leads/new");
  const fd = await req.formData();
  const flash = (m: string, k: "ok" | "error" = "ok", link?: string) => setFlash(m, k, link, "/admin");
  const email = field(fd, "email", 254).toLowerCase();
  const segment = field(fd, "segment", 40);
  const source = field(fd, "source", 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await flash("Enter a valid email address.", "error"); return go(req, "/admin/leads/new"); }
  if (!isSegment(segment) || !LEAD_SOURCES.includes(source)) { await flash("Choose the type of business and where the lead came from.", "error"); return go(req, "/admin/leads/new"); }

  const [dup] = await sql()<{ n: number }[]>`select count(*)::int as n from leads where lower(email) = ${email}`;
  const id = await saveLead({
    type: "manual", segment, email,
    firstName: field(fd, "firstName", 80), lastName: field(fd, "lastName", 80),
    phone: field(fd, "phone", 40) || undefined, company: field(fd, "company", 160) || undefined,
    city: field(fd, "city", 80) || undefined, state: field(fd, "state", 40) || undefined,
    products: field(fd, "products", 300) || undefined, volume: field(fd, "volume", 80) || undefined,
    message: String(fd.get("message") ?? "").slice(0, 5000).trim() || undefined,
    details: { source },
    submittedAt: new Date().toISOString(),
  });
  await sql()`update leads set notified = true where id = ${id}`;
  await logLeadEvent(id, "received", `Added by hand by ${me.name}. Source: ${source}`, { id: me.id, name: me.name });

  const ownerRaw = field(fd, "owner", 40);
  const team = await admins();
  const owner = team.some((t) => t.id === ownerRaw) ? ownerRaw : null;
  const stage = field(fd, "stage", 20);
  const follow = field(fd, "followUp", 10);
  await upsertPerson(email, {
    owner_id: owner,
    ...(isStage(stage) && stage !== "new" ? { stage } : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(follow) ? { follow_up_at: follow } : {}),
  });

  await flash(dup.n ? `Lead added. This email already had ${dup.n} other ${dup.n === 1 ? "lead" : "leads"}; merge them from the lead page if they're the same request.` : "Lead added.", "ok", keyHref(email));
  return go(req, `/admin/leads/${id}`);
}
