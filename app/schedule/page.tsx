import type { Metadata } from "next";
import { ScheduleForm } from "@/components/ScheduleForm";

export const metadata: Metadata = { title: "Schedule a call with Labb", description: "Book a 30 minute video call with the Labb team.", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function Schedule({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <ScheduleForm host={null} m={m} />;
}
