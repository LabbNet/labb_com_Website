import type { Metadata } from "next";
import { Alert, AuthCard, SetPasswordForm } from "@/components/AuthCard";
import { findToken } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "Set Up Your Member Account", robots: { index: false, follow: false }, referrer: "same-origin" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  const m = dbConfigured && token ? await findToken(token, "invite") : null;
  return (
    <AuthCard title="Set up your account">
      {m ? (
        <>
          <p className="form-sub">
            Welcome to the Labb Channel Partner Program, {m.name.split(" ")[0]}. Your username is <strong>{m.username}</strong>. Choose a
            password to finish setting up your account.
          </p>
          <SetPasswordForm token={token} purpose="invite" error={error} />
        </>
      ) : (
        <Alert>This setup link has expired or was already used. Email info@labb.com and we&apos;ll send a new one.</Alert>
      )}
    </AuthCard>
  );
}
