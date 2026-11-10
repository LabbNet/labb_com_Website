import { Alert } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";

const errs: Record<string, string> = {
  current: "Your current password isn't right. Try again.",
  weak: "Use at least 10 characters, with at least one letter and one number.",
  match: "The two new passwords don't match.",
  "1": "Something went wrong. Try again.",
};

const perrs: Record<string, string> = {
  name: "Enter your name.",
  phone: "Enter a valid phone number.",
  state: "Use the two-letter state code, for example VA.",
  zip: "Enter a 5-digit ZIP code (or ZIP+4).",
  email: "Enter a valid email address.",
  username: "Usernames are 3 to 40 characters: lowercase letters, numbers, dots, dashes or underscores.",
  current: "To change your email or username, enter your current password correctly.",
  email_taken: "Another account already uses that email.",
  username_taken: "That username is taken. Pick another.",
  "1": "Something went wrong. Your details were not saved. Try again.",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string; saved?: string; perr?: string }> }) {
  const { error, changed, saved, perr } = await searchParams;
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap split" style={{ alignItems: "start" }}>
        <div className="hero-card">
          <h1 className="form-title" style={{ fontSize: "2rem" }}>My account</h1>
          <p className="form-sub">Keep your contact details current so we can reach you about your CPP membership.</p>
          {saved && <Alert kind="ok">Your details have been saved.</Alert>}
          {perr && <Alert>{perrs[perr] || perrs["1"]}</Alert>}
          <form action="/api/auth/profile" method="post">
            <div className="fields" style={{ marginTop: 12 }}>
              <div className="field"><label htmlFor="p-name">Name<span className="req">*</span></label><input id="p-name" name="name" required maxLength={120} defaultValue={m.name} autoComplete="name" /></div>
              <div className="field"><label htmlFor="p-clinic">Clinic or company</label><input id="p-clinic" name="clinic" maxLength={160} defaultValue={m.clinic ?? ""} autoComplete="organization" /></div>
              <div className="field"><label htmlFor="p-phone">Phone</label><input id="p-phone" name="phone" type="tel" maxLength={25} defaultValue={m.phone ?? ""} autoComplete="tel" /></div>
              <div className="field"><label htmlFor="p-a1">Street address</label><input id="p-a1" name="address_line1" maxLength={160} defaultValue={m.address_line1 ?? ""} autoComplete="address-line1" /></div>
              <div className="field full"><label htmlFor="p-a2">Suite, unit (optional)</label><input id="p-a2" name="address_line2" maxLength={160} defaultValue={m.address_line2 ?? ""} autoComplete="address-line2" /></div>
              <div className="field"><label htmlFor="p-city">City</label><input id="p-city" name="city" maxLength={80} defaultValue={m.city ?? ""} autoComplete="address-level2" /></div>
              <div className="fields" style={{ gap: 12 }}>
                <div className="field"><label htmlFor="p-state">State</label><input id="p-state" name="state" maxLength={2} defaultValue={m.state ?? ""} autoComplete="address-level1" placeholder="VA" style={{ textTransform: "uppercase" }} /></div>
                <div className="field"><label htmlFor="p-zip">ZIP</label><input id="p-zip" name="postal_code" maxLength={10} defaultValue={m.postal_code ?? ""} autoComplete="postal-code" inputMode="numeric" /></div>
              </div>
            </div>
            <h2 style={{ fontSize: "1.1rem", margin: "26px 0 4px" }}>Sign-in details</h2>
            <p className="form-sub">Changing your email or username requires your current password. We notify your old email address when the email changes.</p>
            <div className="fields" style={{ marginTop: 12 }}>
              <div className="field"><label htmlFor="p-email">Email<span className="req">*</span></label><input id="p-email" name="email" type="email" required maxLength={200} defaultValue={m.email} autoComplete="email" /></div>
              <div className="field"><label htmlFor="p-user">Username<span className="req">*</span></label><input id="p-user" name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._\-]{3,40}" defaultValue={m.username} autoComplete="username" /></div>
              <div className="field full"><label htmlFor="p-cur">Current password (only if changing email or username)</label><input id="p-cur" name="current" type="password" autoComplete="current-password" /></div>
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} type="submit">Save details</button>
          </form>
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
