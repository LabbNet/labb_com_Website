"use client";
import { useState } from "react";
import { fitPost, SOCIAL_RULES, type SocialNetwork } from "@/lib/socialFormat";

// Article distribution: pick outlets (or All outlets), edit the post text, send now or schedule.
export function SendPanel({ id, channels, defaultMessage, live, socialReady, hasImage, articleUrl }: {
  id: string; channels: { id: string; label: string }[]; defaultMessage: string; live: boolean; socialReady: boolean; hasImage: boolean; articleUrl: string;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState(defaultMessage);
  const networks = picked.filter((c): c is SocialNetwork => c in SOCIAL_RULES);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const all = picked.length === channels.length;
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <form action="/api/admin/articles" method="post" className="send-panel">
      <input type="hidden" name="action" value="send" />
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend>Send to</legend>
        <div className="send-outlets">
          <label className={`outlet all${all ? " on" : ""}`}>
            <input type="checkbox" name="all" value="yes" checked={all} onChange={() => setPicked(all ? [] : channels.map((c) => c.id))} />
            All outlets
          </label>
          {channels.map((c) => (
            <label key={c.id} className={`outlet${picked.includes(c.id) ? " on" : ""}`}>
              <input type="checkbox" name="channel" value={c.id} checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      {!socialReady && <p className="fine" style={{ textAlign: "left", color: "#9a4f1f" }}>Social posting isn&apos;t connected yet (SOCIAL_WEBHOOK_URL). The newsletter works now.</p>}
      <div className="field">
        <label htmlFor="sp-msg">Post text</label>
        <textarea id="sp-msg" name="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} rows={5} />
        <span className="fine" style={{ textAlign: "left" }}>Write it once. Each network gets its own version sized to its rules, with the link and a cover image cropped to its shape.</span>
      </div>
      {networks.length > 0 && (
        <div className="send-previews">
          {networks.map((n) => {
            const f = fitPost(n, { message, title: "", summary: "", url: articleUrl, hasImage });
            const over = f.chars > f.max;
            return (
              <div key={n} className={`send-preview${f.skip ? " skip" : ""}`}>
                <div className="send-preview-head">
                  <strong>{SOCIAL_RULES[n].label}</strong>
                  <span className={over ? "over" : ""}>{f.chars.toLocaleString()} / {f.max.toLocaleString()}</span>
                </div>
                {f.skip ? <p className="send-preview-warn">Won&apos;t send: {f.skip}</p> : <pre className="send-preview-text">{f.text}</pre>}
                {f.notes.map((note) => <p key={note} className="fine" style={{ textAlign: "left", margin: "4px 0 0" }}>{note}</p>)}
              </div>
            );
          })}
        </div>
      )}
      <div className="send-when">
        <label><input type="radio" name="when" value="now" checked={when === "now"} onChange={() => setWhen("now")} /> Send now</label>
        <label><input type="radio" name="when" value="schedule" checked={when === "schedule"} onChange={() => setWhen("schedule")} /> Schedule</label>
        {when === "schedule" && <input type="datetime-local" name="send_at" required aria-label="Send at (Eastern time)" />}
        {when === "schedule" && <span className="fine">Eastern time</span>}
      </div>
      <button className="btn btn-primary" type="submit" disabled={!picked.length}>{when === "now" ? "Send" : "Schedule"}</button>
      {!live && <p className="fine" style={{ textAlign: "left" }}>The article isn&apos;t live yet. Posts wait and go out when it is.</p>}
    </form>
  );
}
