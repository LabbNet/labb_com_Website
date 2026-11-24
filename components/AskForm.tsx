// Question form for Ask an Expert (posts to /api/ask; works without JavaScript).
export function AskForm({ question = "", compact = false }: { question?: string; compact?: boolean }) {
  return (
    <form action="/api/ask" method="post" className={`ask-form${compact ? " compact" : ""}`}>
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label htmlFor="ask-q" className="ask-label">Your question</label>
      <textarea id="ask-q" name="question" required minLength={8} maxLength={1000} rows={compact ? 3 : 4} defaultValue={question}
        placeholder="For example: Which of your kits test for fentanyl, xylazine and buprenorphine? Or: Do I need a written policy before testing employees in Virginia?" />
      <div className="fields ask-fields">
        <div className="field"><label htmlFor="ask-name">Name</label><input id="ask-name" name="name" maxLength={120} autoComplete="name" /></div>
        <div className="field"><label htmlFor="ask-email">Email<span className="req">*</span></label><input id="ask-email" name="email" type="email" required maxLength={200} autoComplete="email" /></div>
        <div className="field"><label htmlFor="ask-co">Organization</label><input id="ask-co" name="company" maxLength={160} autoComplete="organization" /></div>
      </div>
      <button className="btn btn-primary" type="submit">Ask the experts</button>
      <p className="fine" style={{ textAlign: "left", margin: "8px 0 0" }}>If we&apos;ve already answered your question, you&apos;ll see it right away. New questions are answered by the Labb team, usually within one business day, and emailed to you. See our <a href="/privacy">Privacy Policy</a>.</p>
    </form>
  );
}
