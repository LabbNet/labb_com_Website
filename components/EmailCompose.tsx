import { AUDIENCES, type Audience, type Campaign } from "@/lib/broadcast";

// Compose / edit form for an email broadcast (server component; plain form post).
export function EmailCompose({ c, counts }: { c?: Campaign; counts: Record<Audience, number> }) {
  return (
    <form action="/api/admin/email" method="post" encType="multipart/form-data" className="email-compose">
      <input type="hidden" name="action" value="save" />
      {c && <input type="hidden" name="id" value={c.id} />}
      <fieldset className="aud-pick">
        <legend>Send to</legend>
        {(Object.keys(AUDIENCES) as Audience[]).map((a) => (
          <label key={a} className="aud-opt">
            <input type="radio" name="audience" value={a} defaultChecked={(c?.audience ?? "cpp") === a} required />
            <span><strong>{AUDIENCES[a].label}</strong><em>{counts[a]} {counts[a] === 1 ? "person" : "people"}</em></span>
          </label>
        ))}
      </fieldset>
      <div className="fields">
        <div className="field full"><label htmlFor="em-subject">Subject line</label><input id="em-subject" name="subject" required maxLength={200} defaultValue={c?.subject} /></div>
        <div className="field full"><label htmlFor="em-pre">Preview text (optional)</label><input id="em-pre" name="preheader" maxLength={200} defaultValue={c?.preheader} placeholder="The short line inboxes show after the subject" /></div>
        <div className="field full">
          <label htmlFor="em-html">Email HTML</label>
          <textarea id="em-html" name="html" rows={14} spellCheck={false} className="code" defaultValue={c?.html} placeholder="Paste your HTML here, or upload an .html file below." />
        </div>
        <div className="field"><label htmlFor="em-file">Or upload an .html file</label><input id="em-file" name="file" type="file" accept=".html,.htm,text/html" /><span className="hint">Replaces whatever is in the box above.</span></div>
        <label className="check"><input type="checkbox" name="wrap" defaultChecked={c?.wrap ?? true} /> Put it inside the Labb email frame (logo header). Skipped automatically for a complete HTML email design.</label>
      </div>
      <p className="fine">Every email gets a footer with the Labb address and an unsubscribe link. Scripts are removed. Host images online (full https:// links); don&apos;t embed them.</p>
      <button className="btn btn-primary" type="submit">{c ? "Save draft" : "Save and preview"}</button>
    </form>
  );
}
