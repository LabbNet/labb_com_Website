import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert, AuthCard } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "CPP Member Sign In", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  "1": "That username or password didn't work. Check them and try again.",
  locked: "Too many sign-in attempts. Wait 15 minutes, then try again, or reset your password.",
  unavailable: "Member sign-in isn't available yet. Email info@labb.com for help.",
  expired: "That link has expired or was already used. Ask Labb for a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; signed_out?: string }> }) {
  const { next = "/members", error, signed_out } = await searchParams;
  if (dbConfigured && (await currentMember())) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/members");
  return (
    <AuthCard title="Member sign in">
      <p className="form-sub">Sign in to your CPP member account for handbooks, guidebooks, data sheets and member resources.</p>
      {signed_out && <Alert kind="ok">You&apos;re signed out.</Alert>}
      {error && <Alert>{errors[error] || errors["1"]}</Alert>}
      <form action="/api/auth/login" method="post">
        <input type="hidden" name="next" value={next} />
        <div className="fields" style={{ gridTemplateColumns: "1fr", marginTop: 16 }}>
          <div className="field">
            <label htmlFor="u">Username or email</label>
            <input id="u" name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="p">Password</label>
            <input id="p" name="password" type="password" required autoComplete="current-password" />
          </div>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} type="submit">Sign in</button>
      </form>
      <p className="fine">
        <Link href="/forgot-password">Forgot your password?</Link>
        <br />
        Not a member yet? <Link href="/channel-partner-program">Apply to the Channel Partner Program</Link>.
      </p>
    </AuthCard>
  );
}
