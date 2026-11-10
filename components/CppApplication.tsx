"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SERVICES = ["Rapid drug testing", "Lab-based drug testing", "DOT collections", "Background checks", "Occupational health", "Mobile or on-site collections"];
const VOLUME = ["Under 50 tests a month", "50 to 200", "200 to 500", "500+"];
const TYPES = ["Independent clinic or collection site", "Franchise location", "Occupational health provider", "Mobile collection company", "Third party administrator (TPA)", "Other"];

export function CppApplication() {
  const router = useRouter();
  const started = useRef(Date.now());
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [utm, setUtm] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"].forEach((k) => {
      const v = p.get(k) || sessionStorage.getItem(k);
      if (v) u[k] = v;
    });
    setUtm(u);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setError("");
    setSending(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      type: "cpp-application",
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      company: fd.get("company"),
      legalName: fd.get("legalName"),
      signer: fd.get("signer"),
      city: fd.get("city"),
      state: fd.get("state"),
      audience: fd.get("clinicType"),
      volume: fd.get("volume"),
      services: fd.getAll("services").join(", "),
      affiliation: fd.get("affiliation"),
      message: fd.get("message"),
      wantsAgreement: fd.get("wantsAgreement") === "on",
      newsletter: fd.get("newsletter") === "on",
      website: fd.get("website"),
      page: window.location.pathname,
      referrer: document.referrer,
      utm,
      elapsed: Date.now() - started.current,
    };
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 422) {
        setErrors(data.errors || {});
        setSending(false);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "generate_lead", lead_type: "cpp-application" });
      router.push(`/thank-you?type=cpp${body.wantsAgreement ? "&agreement=1" : ""}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please call (877) 868-9967.");
      setSending(false);
    }
  }

  const input = (name: string, label: string, o: { type?: string; required?: boolean; auto?: string; full?: boolean; hint?: string } = {}) => (
    <div className={`field${o.full ? " full" : ""}`} data-error={errors[name] ? "" : undefined}>
      <label htmlFor={`c-${name}`}>
        {label}
        {o.required && <span className="req" aria-hidden="true">*</span>}
      </label>
      <input id={`c-${name}`} name={name} type={o.type || "text"} required={o.required} autoComplete={o.auto} aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `ce-${name}` : o.hint ? `ch-${name}` : undefined} />
      {o.hint && !errors[name] && <span id={`ch-${name}`} style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{o.hint}</span>}
      {errors[name] && <span className="err" id={`ce-${name}`}>{errors[name]}</span>}
    </div>
  );

  const select = (name: string, label: string, options: string[], required = false) => (
    <div className="field">
      <label htmlFor={`c-${name}`}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      <select id={`c-${name}`} name={name} required={required} defaultValue="">
        <option value="" disabled>Select one</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={onSubmit} aria-label="Channel Partner Program application">
      <h2 className="form-title">Apply to join the CPP</h2>
      <p className="form-sub">Takes about two minutes. We review every application and reply by email.</p>

      <p className="eyebrow" style={{ marginTop: 8 }}>Your clinic</p>
      <div className="fields">
        {input("company", "Clinic or business name", { required: true, auto: "organization", full: true })}
        {input("legalName", "Legal business name (for the agreement)", { required: true, full: true, hint: "As registered with your state, for example Acme Testing LLC" })}
        {input("city", "City", { required: true, auto: "address-level2" })}
        {input("state", "State", { required: true, auto: "address-level1" })}
        {select("clinicType", "Type of business", TYPES, true)}
        {select("volume", "Current tests per month", VOLUME, true)}
        <fieldset className="field full radios" style={{ flexDirection: "row", flexWrap: "wrap", gap: "8px 20px" }}>
          <legend style={{ width: "100%", marginBottom: 6 }}>Services you offer today</legend>
          {SERVICES.map((s) => (
            <label key={s}><input type="checkbox" name="services" value={s} /> {s}</label>
          ))}
        </fieldset>
        {input("affiliation", "Franchise or network affiliation, if any", { full: true })}
      </div>

      <p className="eyebrow" style={{ marginTop: 26 }}>Your contact details</p>
      <div className="fields">
        {input("firstName", "First name", { required: true, auto: "given-name" })}
        {input("lastName", "Last name", { required: true, auto: "family-name" })}
        {input("email", "Email", { type: "email", required: true, auto: "email" })}
        {input("phone", "Phone", { type: "tel", required: true, auto: "tel-national" })}
        {input("signer", "Who will sign the agreement? Name and title", { full: true, hint: "Leave blank if it's you" })}
        <div className="field full">
          <label htmlFor="c-message">Anything we should know?</label>
          <textarea id="c-message" name="message" />
        </div>
        <label className="check full" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" name="wantsAgreement" defaultChecked style={{ marginTop: 3 }} />
          <span>Send me the Channel Partner Program Agreement to review and sign.</span>
        </label>
        <label className="check full"><input type="checkbox" name="newsletter" defaultChecked /> Send me the Labb newsletter</label>
        <div className="hp" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 22 }} disabled={sending}>
        {sending ? "Sending..." : "Submit Application"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="fine">
        Submitting an application doesn&apos;t commit you to anything. Membership starts only when both parties sign the agreement. See our{" "}
        <a href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
