import { Alert } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";

const errs: Record<string, string> = {
  current: "Your current password isn't right. Try again.",
  weak: "Use at least 10 characters, with at least one letter and one number.",
  match: "The two new passwords don't match.",
  "1": "Something went wrong. Try again.",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string }> }) {
  const { error, changed } = await searchParams;
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap split" style={{ alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: "2.2rem" }}>My account</h1>
          <dl className="facts" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div><dt>Name</dt><dd>{m.name}</dd></div>
            <div><dt>Username</dt><dd>{m.username}</dd></div>
            <div><dt>Email</dt><dd>{m.email}</dd></div>
            <div><dt>Clinic</dt><dd>{m.clinic || "Not set"}</dd></div>
          </dl>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>To change your name, email or clinic, email info@labb.com.</p>
        </div>
        <div className="hero-card">
          <h2 className="form-title">Change password</h2>
          <p className="form-sub">Changing your password signs you out on other devices.</p>
          {changed && <Alert kind="ok">Your password has been changed.</Alert>}
          {error && <Alert>{errs[error] || errs["1"]}</Alert>}
          <form action="/api/auth/change-password" method="post">
            <div className="fields" style={{ gridTemplateColumns: "1fr", marginTop: 12 }}>
              <div className="field"><label htmlFor="c">Current password</label><input id="c" name="current" type="password" required autoComplete="current-password" /></div>
              <div className="field"><label htmlFor="n">New password</label><input id="n" name="password" type="password" required minLength={10} autoComplete="new-password" /></div>
              <div className="field"><label htmlFor="n2">Confirm new password</label><input id="n2" name="confirm" type="password" required minLength={10} autoComplete="new-password" /></div>
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} type="submit">Change password</button>
          </form>
        </div>
      </div>
    </section>
  );
}
