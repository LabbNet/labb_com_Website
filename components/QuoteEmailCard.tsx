// The email that goes out with the quote link: shown in full and editable before sending.
export function QuoteEmailCard({ action, quoteId, draft, resend, extra }: { action: string; quoteId: string; draft: { to: string; subject: string; message: string }; resend: boolean; extra?: React.ReactNode }) {
  return (
    <div className="hero-card qe-card" id="send">
      <h2>{resend ? "Send the quote again" : "Email to your client"}</h2>
      <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>This is the email that goes out with the quote link. Edit anything you like; the &ldquo;Open your quote&rdquo; button is added below your message. Replies come to you.</p>
      <form action={action} method="post" className="qe-form">
        <input type="hidden" name="action" value="send" /><input type="hidden" name="quote" value={quoteId} />
        <div className="field"><label>To</label><input value={draft.to} readOnly aria-readonly="true" className="qe-to" /></div>
        <div className="field"><label htmlFor="qe-sub">Subject</label><input id="qe-sub" name="subject" defaultValue={draft.subject} maxLength={200} required /></div>
        <div className="field"><label htmlFor="qe-msg">Message</label><textarea id="qe-msg" name="message" rows={12} defaultValue={draft.message} maxLength={5000} required /></div>
        <div className="qe-cta" aria-hidden="true"><span>Open your quote</span> button with the link goes here</div>
        <div className="btn-row" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn-primary" type="submit">{resend ? "Send again" : "Approve and send"}</button>
          {extra}
        </div>
      </form>
    </div>
  );
}
