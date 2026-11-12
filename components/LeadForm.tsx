"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCTS, SEGMENTS, VOLUME, type Segment } from "@/lib/segments";

type Variant = "quote" | "sample" | "handbook" | "clinic" | "certification-waitlist" | "contact" | "early-access" | "demo";

type Props = {
  variant: Variant;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  resource?: string; // resource slug for gated downloads
  industry?: string;
  compact?: boolean;
  defaultMessage?: string;
  segment?: Segment; // set on segment pages so the visitor isn't asked again
  products?: string[]; // products pre-checked on product pages
  topic?: string; // the detail the visitor opened before asking to connect (slide-in form)
};

const INDUSTRY = ["Construction", "Manufacturing", "Logistics and warehousing", "Staffing", "Healthcare", "Other"];

// Consultation forms ask about the visitor's program first, then where testing happens, then contact details.
const IMPROVE = ["Lower cost per test", "Faster results", "Fewer errors and disputed results", "Less paperwork", "Easier lab confirmations", "Compliance and documentation", "Grow my testing business", "Something else"];
const LOCATION = ["At a clinic or collection site", "In-house, at our location", "Both", "Not sure yet"];
const CONSULT: Variant[] = ["demo", "quote", "contact", "early-access", "clinic"];

export function LeadForm({ variant, title, subtitle, submitLabel, resource, industry, compact, defaultMessage, segment: fixedSegment, products: preChecked = [], topic }: Props) {
  const router = useRouter();
  const started = useRef(Date.now());
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [download, setDownload] = useState<string>();
  const [utm, setUtm] = useState<Record<string, string>>({});
  const isClinicVariant = variant === "clinic";
  const [segment, setSegment] = useState<string>(fixedSegment || (isClinicVariant ? "collection-site" : industry ? "employer" : ""));

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

  const isHandbook = variant === "handbook";
  const isWaitlist = variant === "certification-waitlist";
  const isClinic = variant === "clinic";
  const consult = CONSULT.includes(variant) && !compact;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setError("");
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    body.newsletter = fd.get("newsletter") === "on";
    body.products = fd.getAll("products").length ? fd.getAll("products").map(String) : preChecked;
    body.segment = segment || undefined;
    const details: Record<string, string> = {};
    if (topic) details.topic = topic;
    if (consult) {
      for (const k of ["currentProgram", "costPerTest", "testingLocation"]) {
        const v = String(fd.get(k) || "").trim();
        if (v) details[k] = v;
      }
      const imp = fd.getAll("improve").map(String);
      if (imp.length) details.improve = imp.join(", ");
    }
    if (Object.keys(details).length) body.details = details;
    body.type = variant;
    body.resource = resource;
    body.page = window.location.pathname;
    body.referrer = document.referrer;
    body.utm = utm;
    body.elapsed = Date.now() - started.current;
    if (industry && !body.industry) body.industry = industry;

    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 422) {
        setErrors(data.errors || {});
        setState("idle");
        return;
      }
      if (!res.ok) throw new Error(data.error);
      // Analytics hook: fires only after a successful submission.
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "generate_lead", lead_type: variant, resource });
      if (isHandbook && data.download) {
        setDownload(data.download);
        setState("done");
      } else if (isWaitlist) {
        setState("done");
      } else {
        router.push(`/thank-you?type=${variant}`);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please call (877) 868-9967.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="done" role="status">
        <div className="ok" aria-hidden="true">✓</div>
        {isHandbook ? (
          <>
            <h2 className="form-title">Your handbook is ready</h2>
            <p className="form-sub">Thanks for your interest. A Labb specialist may reach out to help with your program.</p>
            <a className="btn btn-primary btn-block" href={download} target="_blank" rel="noopener">Open the handbook (PDF)</a>
          </>
        ) : (
          <>
            <h2 className="form-title">You&apos;re on the list</h2>
            <p className="form-sub">We&apos;ll email you when enrollment opens.</p>
          </>
        )}
        <p className="fine">Questions? Call (877) 868-9967 or email info@labb.com.</p>
      </div>
    );
  }

  const f = (name: string, label: string, opts: { type?: string; required?: boolean; auto?: string; full?: boolean; placeholder?: string } = {}) => (
    <div className={`field${opts.full ? " full" : ""}`} data-error={errors[name] ? "" : undefined}>
      <label htmlFor={`f-${name}`}>
        {label}
        {opts.required && <span className="req" aria-hidden="true">*</span>}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={opts.type || "text"}
        required={opts.required}
        autoComplete={opts.auto}
        placeholder={opts.placeholder}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `e-${name}` : undefined}
      />
      {errors[name] && <span className="err" id={`e-${name}`}>{errors[name]}</span>}
    </div>
  );

  const select = (name: string, label: string, options: string[], required = false) => (
    <div className="field">
      <label htmlFor={`f-${name}`}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      <select id={`f-${name}`} name={name} required={required} defaultValue="">
        <option value="" disabled>Select one</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate={false} aria-label={title || "Contact form"}>
      {title && <h2 className="form-title">{title}</h2>}
      {subtitle && <p className="form-sub">{subtitle}</p>}
      <div className="fields">
        {consult ? (
          <>
            <h3 className="form-group full">Your current program</h3>
            {!fixedSegment && !isClinic && !industry && (
              <div className="field full" data-error={errors.segment ? "" : undefined}>
                <label htmlFor="f-segment">I am a<span className="req" aria-hidden="true">*</span></label>
                <select id="f-segment" name="segment" required value={segment} onChange={(e) => setSegment(e.target.value)}>
                  <option value="" disabled>Select one</option>
                  {SEGMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.segment && <span className="err">{errors.segment}</span>}
              </div>
            )}
            {!isWaitlist && !industry && !isClinic && !compact && segment === "employer" && select("industry", "Industry", INDUSTRY)}
            <div className="field full">
              <label htmlFor="f-currentProgram">How do you test today?</label>
              <textarea id="f-currentProgram" name="currentProgram" placeholder={isClinic ? "Kits you use, how you read them, how you confirm" : "Who collects, which tests you use, how results reach you"} />
            </div>
            <fieldset className="field full check-grid">
              <legend>What would you like to improve?</legend>
              {IMPROVE.map((o) => <label key={o}><input type="checkbox" name="improve" value={o} /> {o}</label>)}
            </fieldset>
            <div className="field">
              <label htmlFor="f-costPerTest">Current cost per test</label>
              <input id="f-costPerTest" name="costPerTest" inputMode="decimal" placeholder="$45 or not sure" />
            </div>
            {select("volume", isClinic ? "Tests per month at your site" : segment === "corrections" ? "Offenders tested per month" : "Tests per month", VOLUME, true)}
            {!isClinic && (
              <>
                <h3 className="form-group full">Where will testing happen?</h3>
                <fieldset className="field full radios">
                  <legend className="visually-hidden">Where will testing happen?</legend>
                  {LOCATION.map((o, i) => <label key={o}><input type="radio" name="testingLocation" value={o} required={i === 0} /> {o}</label>)}
                </fieldset>
              </>
            )}
            <h3 className="form-group full">About you</h3>
            {f("firstName", "First name", { required: true, auto: "given-name" })}
            {f("lastName", "Last name", { required: true, auto: "family-name" })}
            {f("email", "Work email", { type: "email", required: true, auto: "email" })}
            {f("phone", "Phone", { type: "tel", required: true, auto: "tel-national" })}
            {f("company", isClinic ? "Clinic name" : "Company", { required: true, auto: "organization" })}
            {f("state", "State", { auto: "address-level1" })}
          </>
        ) : (
          <>
        {f("firstName", "First name", { required: true, auto: "given-name" })}
        {f("lastName", "Last name", { required: true, auto: "family-name" })}
        {f("email", "Work email", { type: "email", required: true, auto: "email" })}
        {!isWaitlist && f("phone", "Phone", { type: "tel", required: true, auto: "tel-national" })}
        {!isWaitlist && f("company", isClinic ? "Clinic name" : "Company", { required: true, auto: "organization", full: compact })}
        {!compact && !isWaitlist && f("state", "State", { auto: "address-level1" })}
        {!fixedSegment && !isClinic && !industry && (
          <div className="field full" data-error={errors.segment ? "" : undefined}>
            <label htmlFor="f-segment">I am a<span className="req" aria-hidden="true">*</span></label>
            <select id="f-segment" name="segment" required value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="" disabled>Select one</option>
              {SEGMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.segment && <span className="err">{errors.segment}</span>}
          </div>
        )}
        {!isWaitlist && !industry && !isClinic && !compact && segment === "employer" && select("industry", "Industry", INDUSTRY)}
        {!isWaitlist && select("volume", isClinic ? "Tests per month at your site" : segment === "corrections" ? "Offenders tested per month" : "Tests per month", VOLUME, true)}
        {variant === "sample" && !compact && (
          <div className="field full">
            <label htmlFor="f-message">How can we help?</label>
            <textarea id="f-message" name="message" defaultValue={defaultMessage} />
          </div>
        )}
          </>
        )}
        <label className="check full"><input type="checkbox" name="newsletter" defaultChecked /> Send me the Labb newsletter</label>
        <div className="hp" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 22 }} disabled={state === "sending"}>
        {state === "sending" ? "Sending..." : submitLabel || (consult ? "Request a consultation" : "Get a Quote")}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="fine">
        We use your details to respond and follow up about your program. See our <a href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
