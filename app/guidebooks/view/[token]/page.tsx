import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { GUIDEBOOKS, GUIDEBOOKS_LIVE, LATEST_NOTE } from "@/lib/guidebooks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Labb guidebooks", robots: { index: false, follow: false } };

// The page an emailed guidebook link opens: read online (recommended), or download.
export default async function GuidebookView({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ g?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  if (!GUIDEBOOKS_LIVE && (await currentMember())?.role !== "admin") notFound();
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const db = sql();
  const [a] = await db<{ slugs: string[]; audience: string; email: string }[]>`select slugs, audience, email from guidebook_access where token = ${token}`;
  if (!a) notFound();
  await db`update guidebook_access set views = views + 1, last_viewed_at = now() where token = ${token}`;
  const books = GUIDEBOOKS.filter((g) => a.slugs.includes(g.slug));
  const open = books.find((g) => g.slug === sp.g) ?? books[0];
  const file = (slug: string, download = false) => `/api/guidebooks/file/${slug}?t=${token}${download ? "&download=1" : ""}`;
  return (
    <section className="section gb-page">
      <div className="wrap" style={{ maxWidth: 1100 }}>
        {!GUIDEBOOKS_LIVE && <p className="qp-staff qp-preview"><strong>Preview.</strong> This page isn&apos;t live. Only signed-in Labb admins can see it.</p>}
        <span className="eyebrow">Your Labb guidebooks</span>
        <h1>{books.length === 1 ? books[0].title : "Your guidebooks"}</h1>
        <div className="gb-latest"><strong>Read it here, and come back for updates.</strong> {LATEST_NOTE} Bookmark this page: it always opens the newest edition.</div>
        {books.length > 1 && (
          <nav className="gb-tabs" aria-label="Your guidebooks">
            {books.map((g) => <Link key={g.slug} href={`/guidebooks/view/${token}?g=${g.slug}`} className={g.slug === open.slug ? "on" : ""}>{g.title}</Link>)}
          </nav>
        )}
        {open && (
          <div className="gb-reader">
            <div className="gb-reader-bar">
              <strong>{open.title}</strong>
              <span>
                <a className="btn btn-primary btn-sm" href={file(open.slug)} target="_blank" rel="noreferrer">Open full screen</a>
                <a className="btn btn-outline-dark btn-sm" href={file(open.slug, true)}>Download (not recommended)</a>
              </span>
            </div>
            <iframe src={file(open.slug)} title={open.title} className="gb-frame" />
          </div>
        )}
        <p className="fine" style={{ textAlign: "left", marginTop: 14 }}>Questions about your program? Call (877) 868-9967 or email info@labb.com. Want other guidebooks? <Link href="/guidebooks">See all guidebooks</Link>.</p>
      </div>
    </section>
  );
}
