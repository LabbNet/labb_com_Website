"use client";

import { useRef, useState } from "react";

export function Newsletter() {
  const started = useRef(Date.now());
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "newsletter", email: fd.get("email"), website: fd.get("website"), newsletter: true, page: window.location.pathname, elapsed: Date.now() - started.current }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <p className="nl-done">Thanks. You&apos;re on the list.</p>;
  return (
    <form className="nl" onSubmit={onSubmit}>
      <label htmlFor="nl-email">Email address</label>
      <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="btn btn-primary" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending..." : "Subscribe"}</button>
      {state === "error" && <p className="nl-err" role="alert">That didn&apos;t go through. Check the email address and try again.</p>}
    </form>
  );
}
