import type { Metadata } from "next";
import { isOpen, markViewed, requestByToken } from "@/lib/contracts";
import { cppEmail } from "@/lib/site";

export const metadata: Metadata = { title: "Sign your CPP agreement", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "Enter your full name, the business name and the state of incorporation.",
  consent: "Check both boxes to sign.",
  signature: "Type your full name in the signature box exactly as you entered it above.",
  session: "Your session expired. Please try again.",
  failed: "Something went wrong while signing. Please try again, or email " + cppEmail + ".",
};

export default async function SignContract({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ e?: string; signed?: string }> }) {
  const { token } = await params;
  const { e, signed } = await searchParams;
  const r = await requestByToken(token);

  if (r && (signed || r.status === "signed")) {
    return (
      <Shell>
        <h1>Thank you. Your agreement is signed.</h1>
        <p className="lede">A copy of the {r.title} with your signature is on its way to {r.sent_to}. Labb will countersign it and email you the fully executed agreement.</p>
        <p>Questions? Email <a href={`mailto:${cppEmail}`}>{cppEmail}</a>.</p>
      </Shell>
    );
  }
  if (!r || !isOpen(r)) {
    return (
      <Shell>
        <h1>This signing link is no longer active.</h1>
        <p className="lede">It may have expired, or Labb sent you a newer link. Check your email for the latest one.</p>
        <p>Need a new link? Email <a href={`mailto:${cppEmail}`}>{cppEmail}</a>.</p>
      </Shell>
    );
  }
  await markViewed(r);
  const pdf = `/api/contract/${token}/pdf`;

  return (
    <Shell wide>
      <span className="eyebrow">Labb Channel Partner Program</span>
      <h1 style={{ marginBottom: 8 }}>Review and sign your agreement</h1>
      <p className="lede" style={{ marginTop: 0 }}>{r.title}, version {r.version}, for {(r.legal_name || r.clinic || r.name).replace(/\.$/, "")}.</p>
      <div className="sign-doc">
        <iframe src={`${pdf}#view=FitH`} title={`${r.title} PDF`} />
        <p className="fine" style={{ textAlign: "left" }}>
          Can&apos;t see the agreement? <a href={pdf} target="_blank" rel="noopener">Open the PDF in a new tab</a>.
        </p>
      </div>
      <form className="hero-card sign-form" action={`/api/contract/${token}`} method="post">
        <h2 className="form-title">Sign</h2>
        {e && ERRORS[e] && <div className="form-error" role="alert" style={{ marginBottom: 16 }}>{ERRORS[e]}</div>}
        <div className="fields">
          <div className="field">
            <label htmlFor="s-company">Legal business name</label>
            <input id="s-company" name="company" defaultValue={r.legal_name || r.clinic || ""} required maxLength={200} autoComplete="organization" />
          </div>
          <div className="field">
            <label htmlFor="s-state">State of incorporation</label>
            <input id="s-state" name="state" placeholder="For example: Virginia" required maxLength={60} autoComplete="address-level1" />
          </div>
          <div className="field">
            <label htmlFor="s-name">Your full name</label>
            <input id="s-name" name="name" defaultValue={r.name} required maxLength={120} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="s-title">Your title</label>
            <input id="s-title" name="title" placeholder="For example: Owner" maxLength={120} autoComplete="organization-title" />
          </div>
        </div>
        <label className="check" style={{ marginTop: 18 }}>
          <input type="checkbox" name="consent" value="yes" required />
          <span>I agree to sign and receive this agreement and related records electronically. I can get a paper copy by emailing {cppEmail}.</span>
        </label>
        <label className="check">
          <input type="checkbox" name="agree" value="yes" required />
          <span>I have read the agreement, I am authorized to sign it for the business named above, and I agree to its terms.</span>
        </label>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="s-sig">Type your full name to sign</label>
          <input id="s-sig" name="signature" className="sig-input" required maxLength={120} autoComplete="off" />
        </div>
        <button className="btn btn-primary" type="submit" style={{ marginTop: 16 }}>Sign agreement</button>
        <p className="fine" style={{ textAlign: "left", marginTop: 12 }}>
          Signing records your name, the date and time, your IP address and device, and a fingerprint of the agreement. You&apos;ll get the signed copy by email.
        </p>
      </form>
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: wide ? 980 : 680 }}>{children}</div>
    </section>
  );
}
