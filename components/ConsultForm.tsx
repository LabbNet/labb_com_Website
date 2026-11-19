"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FORM_SEGMENTS, VOLUME, type Segment } from "@/lib/segments";

// Two-step consultation form.
// Step 1 (contact details) is saved as a lead as soon as the visitor clicks Continue.
// Step 2 (program details) is optional and is added to the same lead.
// Nothing is saved from fields the visitor typed in but didn't submit.

export type ConsultVariant = "quote" | "contact" | "early-access" | "demo" | "clinic";

const INDUSTRY = ["Construction", "Manufacturing", "Logistics and warehousing", "Staffing", "Healthcare", "Hospitality", "Other"];
const IMPROVE = ["Lower cost per test", "Faster results", "Fewer errors and disputed results", "Less paperwork", "Easier lab confirmations", "Compliance and documentation", "Grow my testing business", "Something else"];
const GROW_SEGMENTS = ["tpa", "collection-site"];
const LOCATION = ["At a clinic or collection site", "In-house, at our location", "Both", "Not sure yet"];
const BACKGROUND = ["We use a background screening provider today", "We need background screening", "We want it combined with drug testing", "Not needed right now"];
const BACKGROUND_CLINIC = ["We offer background checks today", "We want to start offering background checks", "Not right now"];

type Props = {
  variant: ConsultVariant;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  industry?: string;
  segment?: Segment;
  products?: string[];
  topic?: string;
};

const track = (event: string, extra: Record<string, unknown> = {}) =>
  (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event, ...extra });

export function ConsultForm({ variant, title, subtitle, submitLabel, industry, segment: fixedSegment, products = [], topic }: Props) {
  const router = useRouter();
  const started = useRef(Date.now());
  const isClinic = variant === "clinic";
  const [step, setStep] = useState<1 | 2>(1);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [segment, setSegment] = useState<string>(fixedSegment || (isClinic ? "collection-site" : industry ? "employer" : ""));
  const [lead, setLead] = useState<{ id: string; token: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [improveOther, setImproveOther] = useState(false);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"].forEach((k) => {
      const v = p.get(k) || sessionStorage.getItem(k);
      if (v) {
        u[k] = v;
        try { sessionStorage.setItem(k, v); } catch {}
      }
    });
    setUtm(u);
  }, []);

  const finish = () => router.push(`/thank-you?type=${variant}`);

  async function submitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setError("");
    setSending(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      step: "contact",
      type: variant,
      segment: segment || undefined,
      products,
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      company: fd.get("company"),
      state: fd.get("state"),
      newsletter: fd.get("newsletter") === "on",
      website: fd.get("website"),
      industry: industry || undefined,
      details: topic ? { topic } : undefined,
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
      track("generate_lead", { lead_type: variant, lead_step: 1 });
      setFirstName(String(fd.get("firstName") || ""));
      if (data.lead && data.token) {
        setLead({ id: data.lead, token: data.token });
        setStep(2);
        setSending(false);
        setTimeout(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      } else {
        finish();
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please call (877) 868-9967.");
      setSending(false);
    }
  }

  async function submitDetails(e: React.FormEvent<HTMLFormElement>, skip = false) {
    e.preventDefault();
    if (!lead) return finish();
    setSending(true);
    const fd = new FormData(e.currentTarget);
    const details: Record<string, string> = {};
    for (const k of ["currentProgram", "costPerTest", "testingLocation", "backgroundScreening"]) {
      const v = String(fd.get(k) || "").trim();
      if (v) details[k] = v;
    }
    const other = String(fd.get("improveOther") || "").trim();
    const imp = fd.getAll("improve").map(String).map((o) => (o === "Something else" && other ? `Something else: ${other}` : o));
    if (imp.length) details.improve = imp.join(", ");
    try {
      await fetch("/api/lead/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: lead.id, token: lead.token, skip, details, industry: fd.get("industry") || undefined, volume: fd.get("volume") || undefined }),
      });
      track(skip ? "lead_step2_skipped" : "lead_step2_completed", { lead_type: variant });
    } catch {
      // Step 1 is already saved; don't block the visitor on step 2.
    }
    finish();
  }

  const field = (name: string, label: string, o: { type?: string; required?: boolean; auto?: string; full?: boolean; hint?: string } = {}) => (
    <div className={`field${o.full ? " full" : ""}`} data-error={errors[name] ? "" : undefined}>
      <label htmlFor={`cf-${name}`}>
        {label}
        {o.required ? <span className="req" aria-hidden="true">*</span> : <span className="opt"> (optional)</span>}
      </label>
      <input id={`cf-${name}`} name={name} type={o.type || "text"} required={o.required} autoComplete={o.auto}
        aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `cfe-${name}` : undefined} />
      {errors[name] && <span className="err" id={`cfe-${name}`}>{errors[name]}</span>}
    </div>
  );
  const select = (name: string, label: string, options: string[], full = false) => (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={`cf-${name}`}>{label}</label>
      <select id={`cf-${name}`} name={name} defaultValue="">
        <option value="">Select one</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div ref={top} className="consult" style={{ scrollMarginTop: 130 }}>
      <ol className="steps" aria-label="Form progress">
        <li aria-current={step === 1 ? "step" : undefined} className={step > 1 ? "done" : undefined}><span>1</span> Your contact details</li>
        <li aria-current={step === 2 ? "step" : undefined}><span>2</span> Your program</li>
      </ol>

      {step === 1 ? (
        <form onSubmit={submitContact} aria-label={title || "Contact details"}>
          {title && <h2 className="form-title">{title}</h2>}
          {subtitle && <p className="form-sub">{subtitle}</p>}
          <div className="fields">
            {field("firstName", "First name", { required: true, auto: "given-name" })}
            {field("lastName", "Last name", { required: true, auto: "family-name" })}
            {field("email", "Work email", { type: "email", required: true, auto: "email", full: true })}
            {field("company", isClinic ? "Clinic name" : "Company", { required: true, auto: "organization" })}
            {field("phone", "Phone", { type: "tel", auto: "tel-national" })}
            {field("state", "State", { auto: "address-level1" })}
            {!fixedSegment && !isClinic && !industry && (
              <div className="field" data-error={errors.segment ? "" : undefined}>
                <label htmlFor="cf-segment">I am a<span className="req" aria-hidden="true">*</span></label>
                <select id="cf-segment" name="segment" required value={segment} onChange={(e) => setSegment(e.target.value)}>
                  <option value="" disabled>Select one</option>
                  {FORM_SEGMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.segment && <span className="err">{errors.segment}</span>}
              </div>
            )}
            <label className="check full"><input type="checkbox" name="newsletter" defaultChecked /> Send me the Labb newsletter</label>
            <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }} disabled={sending}>{sending ? "Saving..." : "Continue"}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="fine">We&apos;ll use these details to contact you about your program. See our <a href="/privacy">privacy policy</a>.</p>
        </form>
      ) : (
        <form onSubmit={(e) => submitDetails(e)} aria-label="Your program">
          <h2 className="form-title">Thanks{firstName ? `, ${firstName}` : ""}. We have your details.</h2>
          <p className="form-sub">A few questions about your program help us come prepared. Everything here is optional.</p>
          <div className="fields">
            {!isClinic && !industry && segment === "employer" && select("industry", "Industry", INDUSTRY)}
            {select("volume", isClinic ? "Tests per month at your site" : "Tests per month", VOLUME)}
            <div className="field full">
              <label htmlFor="cf-currentProgram">How do you test today?</label>
              <textarea id="cf-currentProgram" name="currentProgram" maxLength={2000} placeholder={isClinic ? "Kits you use, how you read them, how you confirm" : "Who collects, which tests you use, how results reach you"} />
            </div>
            <fieldset className="field full check-grid">
              <legend>What would you like to improve?</legend>
              {IMPROVE.filter((o) => o !== "Grow my testing business" || GROW_SEGMENTS.includes(segment)).map((o) => (
                <label key={o}><input type="checkbox" name="improve" value={o} onChange={o === "Something else" ? (e) => setImproveOther(e.target.checked) : undefined} /> {o}</label>
              ))}
            </fieldset>
            {improveOther && (
              <div className="field full">
                <label htmlFor="cf-improveOther">What else would you like to improve?</label>
                <input id="cf-improveOther" name="improveOther" maxLength={300} autoFocus />
              </div>
            )}
            <div className="field">
              <label htmlFor="cf-costPerTest">Current cost per test</label>
              <input id="cf-costPerTest" name="costPerTest" inputMode="decimal" placeholder="$45 or not sure" maxLength={40} />
            </div>
            {select("backgroundScreening", isClinic ? "Do you offer background screening?" : "Do you use or need background screening?", isClinic ? BACKGROUND_CLINIC : BACKGROUND)}
            {!isClinic && (
              <fieldset className="field full radios">
                <legend>Where will testing happen?</legend>
                {LOCATION.map((o) => <label key={o}><input type="radio" name="testingLocation" value={o} /> {o}</label>)}
              </fieldset>
            )}
          </div>
          <div className="step2-actions">
            <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? "Sending..." : submitLabel || "Send details"}</button>
            <button type="button" className="linkish" disabled={sending} onClick={(e) => submitDetails({ preventDefault() {}, currentTarget: (e.currentTarget.form as HTMLFormElement) } as unknown as React.FormEvent<HTMLFormElement>, true)}>Skip for now</button>
          </div>
        </form>
      )}
    </div>
  );
}
