import Link from "next/link";
import type { Metadata } from "next";
import { Alert, AuthCard } from "@/components/AuthCard";

export const metadata: Metadata = { title: "Reset Your Password", robots: { index: false, follow: false } };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <AuthCard title="Reset your password">
      {sent ? (
        <>
          <Alert kind="ok">If that account exists, we&apos;ve emailed a link to reset the password. The link expires in 1 hour.</Alert>
          <p className="fine"><Link href="/login">Back to sign in</Link></p>
        </>
      ) : (
        <>
          <p className="form-sub">Enter your username or email and we&apos;ll email you a link to choose a new password.</p>
          <form action="/api/auth/forgot" method="post">
            <div className="field">
              <label htmlFor="u">Username or email</label>
              <input id="u" name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} type="submit">Email me a reset link</button>
          </form>
          <p className="fine"><Link href="/login">Back to sign in</Link></p>
        </>
      )}
    </AuthCard>
  );
}
