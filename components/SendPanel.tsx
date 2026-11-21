"use client";
import { useState } from "react";

// Article distribution: pick outlets (or All outlets), edit the post text, send now or schedule.
export function SendPanel({ id, channels, defaultMessage, live, socialReady }: {
  id: string; channels: { id: string; label: string }[]; defaultMessage: string; live: boolean; socialReady: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
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
        <textarea id="sp-msg" name="message" defaultValue={defaultMessage} maxLength={2800} rows={5} />
        <span className="fine" style={{ textAlign: "left" }}>The article link and cover image are added automatically. X allows 280 characters including the link.</span>
      </div>
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
