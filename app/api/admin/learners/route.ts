import { currentMember, EMAIL_RE, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { getCourse, grantCourse } from "@/lib/courses";
import { field, go } from "@/lib/http";

// Labb admins enroll someone in a course by hand (invoiced sales, comps, before Stripe is live).
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/learners");
  if (!(await sameOrigin())) return go(req, "/admin/learners");
  const fd = await req.formData();
  const c = getCourse(field(fd, "course", 40));
  const name = field(fd, "name", 120);
  const email = field(fd, "email", 160).toLowerCase();
  if (!c || !name || !EMAIL_RE.test(email)) {
    await setFlash(`Enter a name and a valid email (received "${email || "blank"}").`, "error", undefined, "/admin");
    return go(req, "/admin/learners");
  }
  const r = await grantCourse({ email, name, course: c, source: "admin", by: admin.id });
  await setFlash(
    r.invited
      ? r.sent ? `Enrolled ${name} in the ${c.title} and emailed a setup link to ${email}.` : `Enrolled ${name}. Email isn't working, so send them this setup link (expires in 7 days):`
      : r.sent ? `Enrolled ${name}. They already have an account and were emailed.` : `Enrolled ${name}. They already have an account; let them know it's under My courses.`,
    r.sent || !r.invited ? "ok" : "error",
    r.sent ? undefined : r.link ?? undefined,
    "/admin",
  );
  return go(req, "/admin/learners");
}
