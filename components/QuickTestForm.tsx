"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PANELS, canAdd, drugCatalog, money, presetDrugs, quote, specimenOf } from "@/lib/quickTest";

// Quick Test checkout for individuals, in four steps: where, your test, your details, review and pay.
// The order is saved, then the buyer pays on Stripe Checkout. Same price at home or at a clinic.
const WHERE = [
  { v: "At home", t: "At home", b: "We overnight the kit to you. A Labb proctor runs the test with you by video." },
  { v: "At a clinic", t: "At a clinic", b: "We send the rapid test to a clinic near you. You test there." },
];
const TEST_TYPES = ["Oral fluid (mouth swab)", "Urine (cup)", "Help me choose"];
const OBSERVATION = ["Observed (a Labb proctor watches by video)", "Non-observed"];
const REASONS = ["Personal or family", "Employer or job requirement", "Court, probation or legal", "Other"];
const REPORT_TO = ["Only me", "Me and someone else (employer, attorney, court)"];
const STEPS = ["Where", "Your test", "Your details", "Review"];

type F = Record<string, string>;

export function QuickTestForm({ checkout }: { checkout: boolean }) {
  const router = useRouter();
  const started = useRef(Date.now());
  const [step, setStep] = useState(0);
  const [f, setF] = useState<F>({ panel: "Help me choose", reportTo: REPORT_TO[0] });
  const [errors, setErrors] = useState<F>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [custom, setCustom] = useState<string[]>([]);
  const home = f.fulfillment === "At home";
  const specimen = specimenOf(f.testType);
  const q = quote(f.testType, f.panel, custom);
  const price = money(q.cents);
  const toggleDrug = (code: string) => {
    setCustom((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
    setErrors((e) => ({ ...e, panel: "" }));
  };
  const set = (k: string, v: string) => {
    // A new test type changes which drugs exist, so start the drug choice over.
    if (k === "testType") {
      setCustom([]);
      setF((x) => ({ ...x, testType: v, panel: specimenOf(v) ? x.panel : "Help me choose" }));
      setErrors((e) => ({ ...e, testType: "", panel: "" }));
      return;
    }
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  function check(n: number): F {
    const e: F = {};
    if (n === 0 && !f.fulfillment) e.fulfillment = "Choose at home or at a clinic.";
    if (n === 1) {
      if (!f.testType) e.testType = "Choose a test type.";
      if (home && !f.observation) e.observation = "Choose observed or non-observed.";
      if (!f.reason) e.reason = "Choose the reason for the test.";
      if (q.error) e.panel = q.error;
    }
    if (n === 2) {
      if (!f.firstName) e.firstName = "Enter your first name.";
      if (!f.lastName) e.lastName = "Enter your last name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email || "")) e.email = "Enter a valid email address.";
      if ((f.phone || "").replace(/\D/g, "").length < 10) e.phone = "Enter a 10 digit phone number.";
      if (home) {
        if (!f.address1) e.address1 = "Enter your street address.";
        if (!f.city) e.city = "Enter your city.";
        if (!f.state) e.state = "Enter your state.";
        if (!/^\d{5}$/.test(f.zip || "")) e.zip = "Enter a 5 digit ZIP code.";
      } else if (!/^\d{5}$/.test(f.clinicZip || "")) e.clinicZip = "Enter a 5 digit ZIP code.";
    }
    return e;
  }
  function next() {
    const e = check(step);
    setErrors(e);
    if (!Object.values(e).some(Boolean)) setStep(step + 1);
  }

  async function submit() {
    setSending(true);
    setError("");
    const body = {
      type: "quick-test",
      segment: "individual",
      firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone,
      state: home ? f.state : "", city: home ? f.city : "", message: f.message || "",
      website: f.website || "", page: window.location.pathname, referrer: document.referrer,
      elapsed: Date.now() - started.current,
      details: {
        fulfillment: f.fulfillment, testType: f.testType, observation: home ? f.observation : "", reason: f.reason, panel: f.panel,
        reportTo: f.reportTo, reportEmail: f.reportTo !== REPORT_TO[0] ? f.reportEmail || "" : "",
        address1: home ? f.address1 : "", address2: home ? f.address2 || "" : "", city: home ? f.city : "", state: home ? f.state : "", zip: home ? f.zip : "",
        clinicZip: home ? "" : f.clinicZip, clinicName: home ? "" : f.clinicName || "",
        customDrugs: f.panel === "Custom panel" ? custom : [],
      },
    };
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 422) {
        setErrors(data.errors || {});
        setError("Please check the highlighted fields.");
        setSending(false);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      if (data.errors) setErrors(data.errors);
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "begin_checkout", item: "quick-test", fulfillment: f.fulfillment });
      if (data.checkout) window.location.href = data.checkout;
      else router.push("/thank-you?type=quick-test");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please call (877) 868-9967.");
      setSending(false);
    }
  }

  const err = (k: string) => errors[k] && <span className="err">{errors[k]}</span>;
  const input = (k: string, label: string, o: { type?: string; auto?: string; full?: boolean; optional?: boolean; inputMode?: "numeric" } = {}) => (
    <div className={`field${o.full ? " full" : ""}`} data-error={errors[k] ? "" : undefined}>
      <label htmlFor={`q-${k}`}>{label}{!o.optional && <span className="req" aria-hidden="true">*</span>}</label>
      <input id={`q-${k}`} type={o.type || "text"} autoComplete={o.auto} inputMode={o.inputMode} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />
      {err(k)}
    </div>
  );
  const radios = (k: string, legend: string, options: string[]) => (
    <fieldset className="field full radios" data-error={errors[k] ? "" : undefined}>
      <legend>{legend}<span className="req" aria-hidden="true">*</span></legend>
      {options.map((o) => (
        <label key={o}><input type="radio" name={`q-${k}`} value={o} checked={f[k] === o} onChange={() => set(k, o)} /> {o}</label>
      ))}
      {err(k)}
    </fieldset>
  );

  return (
    <div className="qt">
      <ol className="qt-steps" aria-label="Checkout steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "on" : i < step ? "done" : undefined} aria-current={i === step ? "step" : undefined}>
            <span>{i + 1}</span>{s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div>
          <h2 className="form-title">Where do you want to test?</h2>
          <p className="form-sub">Same price either way. The price depends only on the drugs you choose.</p>
          <div className="qt-where" role="radiogroup" aria-label="Where do you want to test?">
            {WHERE.map((w) => (
              <button key={w.v} type="button" role="radio" aria-checked={f.fulfillment === w.v} className={`qt-card${f.fulfillment === w.v ? " on" : ""}`} onClick={() => set("fulfillment", w.v)}>
                <strong>{w.t}</strong>
                <span>{w.b}</span>
              </button>
            ))}
          </div>
          {err("fulfillment")}
        </div>
      )}

      {step === 1 && (
        <div className="fields">
          {radios("testType", "Test type", TEST_TYPES)}
          {home && radios("observation", "Collection", OBSERVATION)}
          {radios("reason", "Reason for the test", REASONS)}
          {radios("panel", "Drugs to test", (specimen ? PANELS : PANELS.filter((p) => p === "Help me choose")) as unknown as string[])}
          {specimen && (f.panel === "Standard panel" || f.panel === "Expanded panel") && (
            <p className="fine full" style={{ margin: 0 }}>Tests for: {presetDrugs(specimen, f.panel).join(", ")}</p>
          )}
          {specimen && f.panel === "Custom panel" && (
            <fieldset className="field full drug-pick">
              <legend>Add drugs ({custom.length} selected)</legend>
              <div>
                {drugCatalog(specimen).map((d) => {
                  const on = custom.includes(d.code);
                  const ok = on || canAdd(specimen, custom, d.code);
                  return (
                    <button key={d.code} type="button" className={`drug${on ? " on" : ""}`} aria-pressed={on} disabled={!ok} onClick={() => toggleDrug(d.code)} title={ok ? d.name : "Can't be combined with your other picks in one test"}>
                      <b>{d.code}</b> {d.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          {f.panel === "Help me choose" && <p className="fine full" style={{ margin: 0 }}>A Labb specialist will recommend the right drugs before your test is sent.</p>}
          <div className="qt-total full" aria-live="polite"><span>Your price</span><strong>{price}</strong></div>
          {radios("reportTo", "Who gets the report", REPORT_TO)}
          {f.reportTo !== REPORT_TO[0] && input("reportEmail", "Their email", { type: "email", full: true, optional: true })}
        </div>
      )}

      {step === 2 && (
        <div className="fields">
          {input("firstName", "First name", { auto: "given-name" })}
          {input("lastName", "Last name", { auto: "family-name" })}
          {input("email", "Email", { type: "email", auto: "email" })}
          {input("phone", "Mobile phone", { type: "tel", auto: "tel-national" })}
          {home ? (
            <>
              <h3 className="form-group full">Ship my kit to</h3>
              {input("address1", "Street address", { auto: "address-line1", full: true })}
              {input("address2", "Apartment, suite", { auto: "address-line2", full: true, optional: true })}
              {input("city", "City", { auto: "address-level2" })}
              {input("state", "State", { auto: "address-level1" })}
              {input("zip", "ZIP", { auto: "postal-code", inputMode: "numeric" })}
            </>
          ) : (
            <>
              <h3 className="form-group full">Find a clinic near</h3>
              {input("clinicZip", "Your ZIP code", { auto: "postal-code", inputMode: "numeric" })}
              {input("clinicName", "Preferred clinic, if you have one", { optional: true })}
              <p className="fine full" style={{ margin: 0 }}>We send your rapid test to a clinic near this ZIP and email you where to go.</p>
            </>
          )}
          <div className="field full">
            <label htmlFor="q-message">Anything we should know?</label>
            <textarea id="q-message" value={f.message || ""} onChange={(e) => set("message", e.target.value)} />
          </div>
          <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website || ""} onChange={(e) => set("website", e.target.value)} /></label></div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="form-title">Review your order</h2>
          <table className="lead-facts" style={{ marginTop: 10 }}>
            <tbody>
              {([
                ["Where", f.fulfillment],
                ["Test", f.testType],
                ["Collection", home ? f.observation : "At the clinic"],
                ["Reason", f.reason],
                ["Drugs", q.drugs.length ? `${f.panel}: ${q.drugs.join(", ")}` : f.panel],
                ["Report to", f.reportTo],
                ["Name", `${f.firstName} ${f.lastName}`],
                ["Email", f.email],
                [home ? "Ship to" : "Clinic near", home ? `${f.address1}${f.address2 ? `, ${f.address2}` : ""}, ${f.city}, ${f.state} ${f.zip}` : `ZIP ${f.clinicZip}${f.clinicName ? ` (${f.clinicName})` : ""}`],
                ["Total", price],
              ] as [string, string][]).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
            </tbody>
          </table>
          <p className="fine">{checkout ? "You'll pay securely on the next page." : "Online payment is coming soon. A Labb specialist will contact you to confirm and take payment."} By ordering you agree to our <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="qt-nav">
        {step > 0 && <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 && <button type="button" className="btn btn-primary" onClick={next}>Continue</button>}
        {step === 3 && <button type="button" className="btn btn-primary" onClick={submit} disabled={sending}>{sending ? "One moment..." : checkout ? `Pay ${price} and order` : "Place my order"}</button>}
      </div>
    </div>
  );
}
