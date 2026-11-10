import Link from "next/link";
import type { Metadata } from "next";
import { Alert, AuthCard, SetPasswordForm } from "@/components/AuthCard";
import { findToken } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "Choose a New Password", robots: { index: false, follow: false }, referrer: "same-origin" };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  const m = dbConfigured && token ? await findToken(token, "reset") : null;
  return (
    <AuthCard title="Choose a new password">
      {m ? (
        <>
          <p className="form-sub">Account: <strong>{m.username}</strong></p>
          <SetPasswordForm token={token} purpose="reset" error={error} />
        </>
      ) : (
        <>
          <Alert>This reset link has expired or was already used.</Alert>
          <p className="fine"><Link href="/forgot-password">Send a new reset link</Link></p>
        </>
      )}
    </AuthCard>
  );
}
