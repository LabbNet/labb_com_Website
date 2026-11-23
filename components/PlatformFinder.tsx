"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finderGroups } from "@/lib/platforms";
import { VOLUME } from "@/lib/segments";

const LOCATIONS = ["1", "2 to 5", "6 to 20", "More than 20"];
const all = finderGroups.flatMap((g) => g.items);

// Clinic platform finder: check the features you want, see which platform fits, then ask for a quote.
// The checked features travel with the quote request as the lead's details.
export function PlatformFinder() {
  const router = useRouter();
  const started = useRef(Date.now());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [state, setState] = useState<"idle" | "sending">("idle");
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

  const chosen = all.filter((f) => picked.has(f.id));
  const hrNeeds = chosen.filter((f) => f.tier === "hr");
  const rec = !chosen.length ? null : hrNeeds.length ? "LabbHR" : "Labb Station";
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const groupState = useMemo(() => Object.fromEntries(finderGroups.map((g) => [g.group, g.items.every((i) => picked.has(i.id))])), [picked]);
  const toggleGroup = (g: (typeof finderGroups)[number]) => setPicked((s) => {
    const n = new Set(s);
    const on = g.items.every((i) => n.has(i.id));
    g.items.forEach((i) => (on ? n.delete(i.id) : n.add(i.id)));
    return n;
  });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const errs: Record<string, string> = {};
    if (!chosen.length) errs.features = "Check at least one feature above so we can quote the right platform.";
    if (!String(fd.get("company") || "").trim()) errs.company = "Enter your clinic name.";
    if (Object.keys(errs).length) { setErrors(errs); document.getElementById(errs.features ? "pf-features" : "pf-company")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setState("sending");
    const body = {
      type: "software-quote",
      segment: "collection-site",
      products: [rec],
      firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email"), phone: fd.get("phone"),
      company: fd.get("company"), city: fd.get("city"), state: fd.get("state"), volume: fd.get("volume"),
      message: fd.get("message"),
      website: fd.get("website"),
      details: {
        recommended: rec,
        features: chosen.map((f) => f.label).join(", "),
        locations: String(fd.get("locations") || ""),
      },
      page: window.location.pathname, referrer: document.referrer, utm, elapsed: Date.now() - started.current,
    };
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 422) { setErrors(data.errors || {}); setState("idle"); return; }
      if (!res.ok) throw new Error(data.error);
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "generate_lead", lead_type: "software-quote", platform: rec });
      router.push("/thank-you?type=quote");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please call (877) 868-9967.");
      setState("idle");
    }
  }

  const err = (k: string) => errors[k] ? <span className="err" id={`pf-${k}-err`}>{errors[k]}</span> : null;
  const input = (name: string, label: string, opts: { type?: string; auto?: string; req?: boolean } = {}) => (
    <div className="field">
      <label htmlFor={`pf-${name}`}>{label}{opts.req && <span className="req">*</span>}</label>
      <input id={`pf-${name}`} name={name} type={opts.type || "text"} autoComplete={opts.auto} required={opts.req} maxLength={160} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `pf-${name}-err` : undefined} />
      {err(name)}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate={false} className="pf">
      <div className="pf-layout">
        <div id="pf-features">
          {finderGroups.map((g) => (
            <fieldset key={g.group} className="pf-group">
              <legend>
                <span><span className="pf-gtitle">{g.group}</span><span className="pf-gblurb">{g.blurb}</span></span>
                {g.items.length > 1 && <button type="button" className="linkish pf-all" onClick={() => toggleGroup(g)}>{groupState[g.group] ? "Clear these" : "Select all"}</button>}
              </legend>
              <div className="pf-items">
                {g.items.map((f) => (
                  <label key={f.id} className={`pf-item${picked.has(f.id) ? " on" : ""}`}>
                    <input type="checkbox" checked={picked.has(f.id)} onChange={() => toggle(f.id)} />
                    <span>
                      <strong>{f.label}</strong>
                      {f.help && <small>{f.help}</small>}
                    </span>
                    {f.tier === "hr" && <em className="pf-tag">LabbHR</em>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {err("features")}
        </div>

        <aside className="pf-result" aria-live="polite">
          <span className="pf-rlabel">Your best fit</span>
          {!rec ? (
            <>
              <strong className="pf-rname muted">Check the features you want</strong>
              <p>We&apos;ll match you to the platform that covers all of them.</p>
            </>
          ) : (
            <>
              <strong className="pf-rname">{rec}</strong>
              <p>{rec === "LabbHR"
                ? "Runs your whole testing business, and includes everything in Labb Station plus discounted lab testing rates."
                : "Runs every test objectively and documents every collection. Add business tools any time by moving to LabbHR."}</p>
              <p className="pf-count">{chosen.length} of {all.length} features selected</p>
              {rec === "LabbHR" && <p className="pf-why">LabbHR is needed for: {hrNeeds.map((f) => f.label.toLowerCase()).join(", ")}.</p>}
              {rec === "Labb Station" && <p className="pf-why">Want discounted lab testing rates? They come with LabbHR.</p>}
              <a href="#pf-quote" className="btn btn-primary">Get a quote for {rec}</a>
            </>
          )}
        </aside>
      </div>

      <div className="pf-quote" id="pf-quote">
        <h2>Get a quote{rec ? ` for ${rec}` : ""}</h2>
        <p>Your checked features are sent with your request, so your quote covers exactly what you need.</p>
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <div className="fields">
          {input("firstName", "First name", { auto: "given-name", req: true })}
          {input("lastName", "Last name", { auto: "family-name", req: true })}
          {input("email", "Work email", { type: "email", auto: "email", req: true })}
          {input("phone", "Phone", { type: "tel", auto: "tel-national" })}
          {input("company", "Clinic name", { auto: "organization", req: true })}
          {input("city", "City", { auto: "address-level2" })}
          {input("state", "State", { auto: "address-level1" })}
          <div className="field">
            <label htmlFor="pf-locations">Number of locations</label>
            <select id="pf-locations" name="locations" defaultValue=""><option value="">Choose</option>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="pf-volume">Tests per month</label>
            <select id="pf-volume" name="volume" defaultValue=""><option value="">Choose</option>{VOLUME.map((v) => <option key={v}>{v}</option>)}</select>
          </div>
          <div className="field full">
            <label htmlFor="pf-message">Anything else we should know? (optional)</label>
            <textarea id="pf-message" name="message" maxLength={3000} rows={3} />
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={state === "sending"} style={{ marginTop: 16 }}>
          {state === "sending" ? "Sending..." : rec ? `Request my ${rec} quote` : "Request my quote"}
        </button>
        <p className="fine" style={{ textAlign: "left", marginTop: 10 }}>We&apos;ll reply within one business day. See our <a href="/privacy">Privacy Policy</a>.</p>
      </div>
    </form>
  );
}
