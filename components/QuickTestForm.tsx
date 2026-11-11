"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Quick Test order request for individuals. Saved as a lead (segment "individual"); payment is added later with Stripe.
const TEST_TYPES = ["Oral fluid (mouth swab)", "Urine (cup)", "Help me choose"];
const OBSERVATION = ["Observed (a Labb proctor watches by video)", "Non-observed"];
const REASONS = ["Personal or family", "Employer or job requirement", "Court, probation or legal", "Other"];
const PANELS = ["Help me choose", "Standard panel (6 drugs)", "Expanded panel (10 or more drugs)", "Include alcohol"];
const REPORT_TO = ["Only me", "Me and someone else (employer, attorney, court)"];

export function QuickTestForm() {
  const router = useRouter();
  const started = useRef(Date.now());
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [reportTo, setReportTo] = useState(REPORT_TO[0]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setErrors({});
    setError("");
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) || "");
    const body = {
      type: "quick-test",
      segment: "individual",
      products: [],
      firstName: g("firstName"),
      lastName: g("lastName"),
      email: g("email"),
      phone: g("phone"),
      state: g("state"),
      message: g("message"),
      website: g("website"),
      page: window.location.pathname,
      referrer: document.referrer,
      elapsed: Date.now() - started.current,
      details: {
        testType: g("testType"),
        observation: g("observation"),
        reason: g("reason"),
        panel: g("panel"),
        reportTo,
        reportEmail: g("reportEmail"),
        address1: g("address1"),
        address2: g("address2"),
        city: g("city"),
        state: g("state"),
        zip: g("zip"),
        deliverBy: g("deliverBy"),
      },
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
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "generate_lead", lead_type: "quick-test" });
      router.push("/thank-you?type=quick-test");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please call (877) 868-9967.");
      setSending(false);
    }
  }

  const input = (name: string, label: string, o: { type?: string; required?: boolean; auto?: string; full?: boolean } = {}) => (
    <div className={`field${o.full ? " full" : ""}`} data-error={errors[name] ? "" : undefined}>
      <label htmlFor={`q-${name}`}>{label}{o.required && <span className="req" aria-hidden="true">*</span>}</label>
      <input id={`q-${name}`} name={name} type={o.type || "text"} required={o.required} autoComplete={o.auto} />
      {errors[name] && <span className="err">{errors[name]}</span>}
    </div>
  );
  const radios = (name: string, legend: string, options: string[], controlled?: { value: string; set: (v: string) => void }) => (
    <fieldset className="field full radios" data-error={errors[name] ? "" : undefined}>
      <legend>{legend}<span className="req" aria-hidden="true">*</span></legend>
      {options.map((o, i) => (
        <label key={o}>
          {controlled ? (
            <input type="radio" name={name} value={o} checked={controlled.value === o} onChange={() => controlled.set(o)} />
          ) : (
            <input type="radio" name={name} value={o} required defaultChecked={name === "panel" && i === 0} />
          )}{" "}
          {o}
        </label>
      ))}
      {errors[name] && <span className="err">{errors[name]}</span>}
    </fieldset>
  );

  return (
    <form onSubmit={onSubmit} aria-label="Order a Quick Test">
      <h2 className="form-title">Order a Quick Test</h2>
      <p className="form-sub">We overnight the test to you and a Labb proctor walks you through it by video.</p>
      <div className="fields">
        <h3 className="form-group full">Your test</h3>
        {radios("testType", "Test type", TEST_TYPES)}
        {radios("observation", "Collection", OBSERVATION)}
        {radios("reason", "Reason for the test", REASONS)}
        {radios("panel", "Drugs to test", PANELS)}
        {radios("reportTo", "Who gets the report", REPORT_TO, { value: reportTo, set: setReportTo })}
        {reportTo !== REPORT_TO[0] && input("reportEmail", "Their email (if you have it)", { type: "email", full: true })}

        <h3 className="form-group full">About you</h3>
        {input("firstName", "First name", { required: true, auto: "given-name" })}
        {input("lastName", "Last name", { required: true, auto: "family-name" })}
        {input("email", "Email", { type: "email", required: true, auto: "email" })}
        {input("phone", "Mobile phone", { type: "tel", required: true, auto: "tel-national" })}

        <h3 className="form-group full">Ship to</h3>
        {input("address1", "Street address", { required: true, auto: "address-line1", full: true })}
        {input("address2", "Apartment, suite (optional)", { auto: "address-line2", full: true })}
        {input("city", "City", { required: true, auto: "address-level2" })}
        {input("state", "State", { required: true, auto: "address-level1" })}
        {input("zip", "ZIP", { required: true, auto: "postal-code" })}
        {input("deliverBy", "Need results by (optional)", { type: "date" })}
        <div className="field full">
          <label htmlFor="q-message">Anything we should know?</label>
          <textarea id="q-message" name="message" />
        </div>
        <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      </div>
      <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 22 }} disabled={sending}>{sending ? "Sending..." : "Request my test"}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="fine">A Labb specialist confirms your order, price and who can receive the report before anything ships. See our <a href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
