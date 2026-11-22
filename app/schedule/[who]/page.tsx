import type { Metadata } from "next";
import { ScheduleForm } from "@/components/ScheduleForm";
import { hostBySlug } from "@/lib/meetings";

export const metadata: Metadata = { title: "Schedule a call with Labb", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

// Personal scheduling link: /schedule/james books with that team member. Unknown names fall back to anyone available.
export default async function ScheduleWith({ params, searchParams }: { params: Promise<{ who: string }>; searchParams: Promise<{ m?: string }> }) {
  const [{ who }, { m }] = await Promise.all([params, searchParams]);
  const host = /^[a-z]{1,30}$/i.test(who) ? await hostBySlug(who) : null;
  return <ScheduleForm host={host && host.hours ? host : null} m={m} />;
}
