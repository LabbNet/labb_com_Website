import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { go } from "@/lib/http";

// Saves the contact block a CPP member wants printed on downloaded brochures and booklets.
export async function POST(req: Request) {
  const back = "/members#your-details";
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members");
  if (!(await sameOrigin())) return go(req, back);
  const fd = await req.formData();
  const text = String(fd.get("marketing_contact") ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[^\S\n]+/g, " ").trim()).join("\n").trim();
  const lines = text ? text.split("\n").filter((l, i, a) => l || (i > 0 && a[i - 1])) : [];
  if (lines.length > 6 || lines.some((l) => l.length > 70)) {
    await setFlash("Keep it to 6 lines of up to 70 characters each, so it fits the partner box on the brochures.", "error", undefined, "/members");
    return go(req, back);
  }
  await sql()`update members set marketing_contact = ${lines.join("\n") || null}, updated_at = now() where id = ${m.id}`;
  await setFlash(lines.length ? "Saved. Brochures and booklets you download now show your details." : "Cleared. Brochures and booklets download without partner details.", "ok", undefined, "/members");
  return go(req, back);
}
