"use client";
import { useState } from "react";

type Book = { slug: string; title: string; blurb: string; cover: string; for: ("clinic" | "employer")[] };

// Clinic or employer, then the guidebooks for them, then the form. The link arrives by email.
export function GuidebookPicker({ books, note }: { books: Book[]; note: string }) {
  const [who, setWho] = useState<"clinic" | "employer" | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const list = who ? books.filter((b) => b.for.includes(who)) : [];
  const choose = (w: "clinic" | "employer") => { setWho(w); setPicked(books.filter((b) => b.for.includes(w)).slice(0, 1).map((b) => b.slug)); setErrors({}); };
  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending"); setErrors({});
    const body = { ...Object.fromEntries(fd.entries()), audience: who, guidebooks: picked };
    const r = await fetch("/api/guidebooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setEmail(String(fd.get("email") || "")); setState("sent"); return; }
    setErrors(j.errors || { form: j.error || "Something went wrong. Please try again." });
    setState("idle");
  };

  if (state === "sent") return (
    <div className="gb-done hero-card">
      <h2>Check your email</h2>
      <p>We sent a link to <strong>{email}</strong>. It opens your {picked.length === 1 ? "guidebook" : "guidebooks"} on labb.com.</p>
      <p className="gb-note">{note}</p>
    </div>
  );

  return (
    <div className="gb">
      <div className="gb-step">
        <span className="gb-n">1</span>
        <h2>Are you a clinic or an employer?</h2>
        <div className="gb-who">
          <button type="button" className={`gb-choice${who === "clinic" ? " on" : ""}`} onClick={() => choose("clinic")} aria-pressed={who === "clinic"}>
            <strong>Clinic or collection site</strong><span>Run drug testing for employers and the public</span>
          </button>
          <button type="button" className={`gb-choice${who === "employer" ? " on" : ""}`} onClick={() => choose("employer")} aria-pressed={who === "employer"}>
            <strong>Employer</strong><span>Test your own employees and applicants</span>
          </button>
        </div>
      </div>

      {who && (
        <div className="gb-step">
          <span className="gb-n">2</span>
          <h2>Choose your guidebooks</h2>
          <div className="gb-books">
            {list.map((b) => (
              <label key={b.slug} className={`gb-book${picked.includes(b.slug) ? " on" : ""}`}>
                <input type="checkbox" checked={picked.includes(b.slug)} onChange={() => toggle(b.slug)} />
                <img src={b.cover} alt="" loading="lazy" />
                <span><strong>{b.title}</strong><small>{b.blurb}</small></span>
              </label>
            ))}
          </div>
          {errors.guidebooks && <p className="form-error">{errors.guidebooks}</p>}
        </div>
      )}

      {who && (
        <div className="gb-step">
          <span className="gb-n">3</span>
          <h2>Where should we send your link?</h2>
          <form onSubmit={submit} className="gb-form" noValidate>
            <div className="field"><label htmlFor="gb-fn">First name<span className="req">*</span></label><input id="gb-fn" name="firstName" autoComplete="given-name" maxLength={80} />{errors.firstName && <span className="form-error">{errors.firstName}</span>}</div>
            <div className="field"><label htmlFor="gb-ln">Last name<span className="req">*</span></label><input id="gb-ln" name="lastName" autoComplete="family-name" maxLength={80} />{errors.lastName && <span className="form-error">{errors.lastName}</span>}</div>
            <div className="field"><label htmlFor="gb-em">Work email<span className="req">*</span></label><input id="gb-em" name="email" type="email" autoComplete="email" maxLength={160} />{errors.email && <span className="form-error">{errors.email}</span>}</div>
            <div className="field"><label htmlFor="gb-co">{who === "clinic" ? "Clinic name" : "Company"}<span className="req">*</span></label><input id="gb-co" name="company" autoComplete="organization" maxLength={160} />{errors.company && <span className="form-error">{errors.company}</span>}</div>
            <div className="field"><label htmlFor="gb-ph">Phone</label><input id="gb-ph" name="phone" type="tel" autoComplete="tel" maxLength={40} /></div>
            <div className="field"><label htmlFor="gb-st">State</label><input id="gb-st" name="state" autoComplete="address-level1" maxLength={40} /></div>
            <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <p className="gb-note gb-wide">{note}</p>
            {errors.form && <p className="form-error gb-wide">{errors.form}</p>}
            <div className="gb-wide"><button className="btn btn-primary btn-lg" type="submit" disabled={state === "sending" || !picked.length}>{state === "sending" ? "Sending…" : `Email me the ${picked.length === 1 ? "guidebook" : `${picked.length} guidebooks`}`}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
