import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert, AuthCard } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "Labb Team Sign In", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  "1": "That username or password didn't work. Check them and try again.",
  locked: "Too many sign-in attempts. Wait 15 minutes, then try again, or reset your password.",
};

// One sign-in for the Labb team. Each account lands in the area it has access to.
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const m = dbConfigured ? await currentMember() : null;
  if (m) redirect(m.role === "admin" ? "/admin/crm" : m.role === "reader" ? "/reads" : m.role === "learner" ? "/learn" : "/members");
  return (
    <AuthCard title="Labb team sign in">
      <p className="form-sub">For Labb team members. CPP members sign in at <Link href="/login">CPP member login</Link>.</p>
      {error && <Alert>{errors[error] || errors["1"]}</Alert>}
      <form action="/api/auth/login" method="post">
        <input type="hidden" name="from" value="team" />
        <input type="hidden" name="next" value="/admin/crm" />
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
      <p className="fine"><Link href="/forgot-password">Forgot your password?</Link></p>
    </AuthCard>
  );
}
