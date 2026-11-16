import { currentMember, logEvent, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";

// CPP program record for a member: start date, active/inactive, and signed contract files.
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function sniff(ext: string, b: Uint8Array) {
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (ext === "pdf") return starts(0x25, 0x50, 0x44, 0x46); // %PDF
  if (ext === "docx") return starts(0x50, 0x4b, 0x03, 0x04); // zip
  if (ext === "doc") return starts(0xd0, 0xcf, 0x11, 0xe0);
  if (ext === "png") return starts(0x89, 0x50, 0x4e, 0x47);
  if (ext === "jpg" || ext === "jpeg") return starts(0xff, 0xd8, 0xff);
  return false;
}

export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/members");
  if (!(await sameOrigin())) return go(req, "/admin/members");
  const fd = await req.formData();
  const id = field(fd, "id", 40);
  const action = field(fd, "action", 20);
  const back = `/admin/members/${id}`;
  const db = sql();
  const [m] = await db<{ id: string; name: string; cpp_status: string; cpp_start_date: string | null }[]>`
    select id, name, cpp_status, to_char(cpp_start_date, 'YYYY-MM-DD') as cpp_start_date from members where id = ${id}`;
  if (!m) return go(req, "/admin/members");
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, "/admin");

  if (action === "program") {
    const start = field(fd, "start", 10);
    const status = fd.get("cpp_status") === "inactive" ? "inactive" : "active";
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      await flash("Enter the start date as a full date.", "error");
      return go(req, back);
    }
    const startVal = start || null;
    await db`
      update members set cpp_start_date = ${startVal}, cpp_status = ${status},
        cpp_status_changed_at = case when cpp_status <> ${status} then now() else cpp_status_changed_at end,
        updated_at = now()
      where id = ${m.id}`;
    if ((m.cpp_start_date || null) !== startVal) await logEvent(m.id, "cpp_start_date", startVal ?? "cleared", admin.id);
    if (m.cpp_status !== status) await logEvent(m.id, status === "active" ? "cpp_active" : "cpp_inactive", undefined, admin.id);
    await flash(`Saved the CPP record for ${m.name}.`);
    return go(req, back);
  }

  if (action === "upload") {
    const file = fd.get("contract");
    if (!(file instanceof File) || !file.size) {
      await flash("Choose a contract file to upload.", "error");
      return go(req, back);
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!TYPES[ext]) {
      await flash("Contracts can be PDF, Word, PNG or JPG files.", "error");
      return go(req, back);
    }
    if (file.size > MAX_BYTES) {
      await flash("That file is over 15 MB. Upload a smaller copy.", "error");
      return go(req, back);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!sniff(ext, bytes)) {
      await flash(`That file doesn't look like a real .${ext} file.`, "error");
      return go(req, back);
    }
    const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 160);
    const note = field(fd, "note", 300) || null;
    await db`
      insert into member_contracts (member_id, filename, content_type, size_bytes, data, note, uploaded_by)
      values (${m.id}, ${name}, ${TYPES[ext]}, ${bytes.length}, ${Buffer.from(bytes)}, ${note}, ${admin.id})`;
    await logEvent(m.id, "contract_uploaded", name, admin.id);
    await flash(`Contract uploaded for ${m.name}.`);
    return go(req, back);
  }

  if (action === "delete-contract") {
    const cid = field(fd, "cid", 20);
    if (/^\d+$/.test(cid)) {
      const [c] = await db<{ filename: string }[]>`delete from member_contracts where id = ${cid} and member_id = ${m.id} returning filename`;
      if (c) {
        await logEvent(m.id, "contract_deleted", c.filename, admin.id);
        await flash(`Deleted ${c.filename}.`);
      }
    }
    return go(req, back);
  }

  return go(req, back);
}
