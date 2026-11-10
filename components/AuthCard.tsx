export function AuthCard({ eyebrow = "Labb Channel Partner Program", title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="section auth">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <div className="hero-card">
          <span className="eyebrow">{eyebrow}</span>
          <h1 style={{ fontSize: "2rem" }}>{title}</h1>
          {children}
        </div>
      </div>
    </section>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p className={kind === "error" ? "form-error" : "form-ok"} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function SetPasswordForm({ token, purpose, error }: { token: string; purpose: "invite" | "reset"; error?: string }) {
  const msg: Record<string, string> = {
    weak: "Use at least 10 characters, with at least one letter and one number.",
    match: "The two passwords don't match. Type them again.",
  };
  return (
    <form action={purpose === "reset" ? "/api/auth/reset" : "/api/auth/setup"} method="post">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="purpose" value={purpose} />
      {error && msg[error] && <Alert>{msg[error]}</Alert>}
      <div className="fields" style={{ gridTemplateColumns: "1fr", marginTop: 16 }}>
        <div className="field">
          <label htmlFor="pw">New password</label>
          <input id="pw" name="password" type="password" required minLength={10} autoComplete="new-password" aria-describedby="pw-hint" />
          <span id="pw-hint" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>At least 10 characters, with a letter and a number.</span>
        </div>
        <div className="field">
          <label htmlFor="pw2">Confirm password</label>
          <input id="pw2" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
        </div>
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} type="submit">
        {purpose === "reset" ? "Save new password" : "Create my account"}
      </button>
    </form>
  );
}
