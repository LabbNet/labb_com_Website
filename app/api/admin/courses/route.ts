import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { COURSE_FILES, COURSE_TYPES, getCourse, type CourseStatus, type CourseType } from "@/lib/courses";
import { field, go } from "@/lib/http";

// Admin edits to a course's catalog listing: name, overview, price, pages, CPP access and status.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/courses");
  if (!(await sameOrigin())) return go(req, "/admin/courses");
  const fd = await req.formData();
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const c = await getCourse(field(fd, "slug", 60));
  if (!c) return go(req, "/admin/courses");
  const back = `/admin/courses#${c.slug}`;

  const title = field(fd, "title", 160);
  const short = field(fd, "short", 80);
  const type = field(fd, "type", 20) as CourseType;
  const status = field(fd, "status", 10) as CourseStatus;
  const overview = field(fd, "overview", 600);
  const forWho = field(fd, "for_who", 200);
  const priceRaw = field(fd, "price", 20).replace(/[$,\s]/g, "");
  const pagesRaw = field(fd, "pages", 6);
  const sortRaw = field(fd, "sort", 6) || String(c.sort);
  const cpp = fd.get("cpp_included") === "on";

  const price = priceRaw === "" ? null : /^\d+(\.\d{1,2})?$/.test(priceRaw) ? Math.round(Number(priceRaw) * 100) : NaN;
  const pages = pagesRaw === "" ? null : /^\d{1,5}$/.test(pagesRaw) && Number(pagesRaw) > 0 ? Number(pagesRaw) : NaN;
  const sort = /^-?\d{1,5}$/.test(sortRaw) ? Number(sortRaw) : NaN;

  const err =
    !title || !short ? "Enter a course name and a short name."
    : !(type in COURSE_TYPES) ? "Choose a course type."
    : !["live", "coming", "draft"].includes(status) ? "Choose a status."
    : Number.isNaN(price) ? "Enter the price as a number, for example 199 or 199.00."
    : Number.isNaN(pages) ? "Enter pages as a whole number, or leave it blank."
    : Number.isNaN(sort) ? "Enter the list order as a whole number."
    : status === "live" && !COURSE_FILES[c.slug] ? "This course has no course file on the site yet, so it can't go live. Use Coming soon."
    : status === "live" && price === null ? "Set a price before making the course live."
    : !overview ? "Enter a short overview."
    : null;
  if (err) {
    await flash(`${c.short}: ${err}`, "error");
    return go(req, back);
  }

  await sql()`update courses set title = ${title}, short = ${short}, type = ${type}, status = ${status}, overview = ${overview},
    for_who = ${forWho}, price_cents = ${price}, pages = ${pages}, sort = ${sort}, cpp_included = ${cpp},
    updated_by = ${admin.id}, updated_at = now() where slug = ${c.slug}`;
  const label = status === "live" ? "live and for sale" : status === "coming" ? "listed as coming soon" : "a hidden draft";
  await flash(`Saved ${short}. It is ${label}.`);
  return go(req, back);
}
