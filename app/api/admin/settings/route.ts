import { currentMember, EMAIL_RE, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { field, go } from "@/lib/http";
import { notifyAddresses, setSetting } from "@/lib/leads";
import { emailLayout, sendMail } from "@/lib/mail";

export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/settings");
  if (!(await sameOrigin())) return go(req, "/admin/settings");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");

  if (action === "notify") {
    const list = field(fd, "emails", 600).split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const bad = list.filter((e) => !EMAIL_RE.test(e));
    if (!list.length || bad.length) {
      await flash(bad.length ? `Not a valid email: ${bad.join(", ")}` : "Enter at least one email address.", "error");
    } else {
      await setSetting("lead_notify_emails", [...new Set(list)].join(", "), admin.id);
      await flash(`New leads will be emailed to ${list.join(", ")}.`);
    }
  } else if (action === "test") {
    const to = await notifyAddresses();
    const ok = await sendMail(to, "Test: Labb website lead notification",
      emailLayout("Test notification", `<p>This is a test from the labb.com admin area, sent by ${admin.name}. New website leads will arrive at this address.</p>`),
      `This is a test from the labb.com admin area, sent by ${admin.name}.`);
    await flash(ok ? `Test email sent to ${to.join(", ")}.` : "The test email could not be sent. Check the email settings on Render.", ok ? "ok" : "error");
  }
  return go(req, "/admin/settings");
}
