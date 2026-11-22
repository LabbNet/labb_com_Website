import { SlotPicker } from "@/components/SlotPicker";
import { openSlots, SLOT_MIN } from "@/lib/meetings";

const MSG: Record<string, string> = {
  taken: "Sorry, that time was just taken. Please choose another.",
  pick: "Choose a time first.",
  invalid: "Please enter your name, a valid work email and your organization.",
};

// Public "Schedule a call with Labb" page, for links Labb team members put in their own emails.
export async function ScheduleForm({ host, m }: { host: { id: string; name: string } | null; m?: string }) {
  const slots = await openSlots(host?.id ?? null);
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap" style={{ maxWidth: 820 }}>
        <span className="eyebrow">Labb</span>
        <h1 style={{ fontSize: "2rem", margin: "6px 0 10px" }}>Schedule a call with {host ? host.name : "Labb"}</h1>
        <p style={{ marginTop: 0 }}>Pick a time for a {SLOT_MIN} minute video call{host ? "" : " with a member of the Labb team"} to go over all of Labb&apos;s programs and find the right fit for your organization. You&apos;ll get a video meeting link by email as soon as you book.</p>
        {m && MSG[m] && <p className="form-error" role="alert">{MSG[m]}</p>}
        {!slots.length ? (
          <div className="hero-card" style={{ marginTop: 20 }}>
            <p style={{ margin: 0 }}>There are no open times right now. Email <a href="mailto:info@labb.com">info@labb.com</a> and we&apos;ll find a time with you.</p>
          </div>
        ) : (
          <form action="/api/schedule" method="post" style={{ marginTop: 20 }}>
            <input type="hidden" name="with" value={host ? host.name.split(" ")[0].toLowerCase() : ""} />
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <SlotPicker slots={slots.map((x) => x.start.toISOString())} submitLabel="Book my call">
              <div className="fields sp-fields">
                <div className="field"><label htmlFor="sc-fn">First name<span className="req">*</span></label><input id="sc-fn" name="first_name" required maxLength={80} autoComplete="given-name" /></div>
                <div className="field"><label htmlFor="sc-ln">Last name</label><input id="sc-ln" name="last_name" maxLength={80} autoComplete="family-name" /></div>
                <div className="field"><label htmlFor="sc-em">Work email<span className="req">*</span></label><input id="sc-em" name="email" type="email" required maxLength={200} autoComplete="email" /></div>
                <div className="field"><label htmlFor="sc-co">Organization<span className="req">*</span></label><input id="sc-co" name="company" required maxLength={160} autoComplete="organization" /></div>
                <div className="field"><label htmlFor="sc-ph">Phone (optional)</label><input id="sc-ph" name="phone" type="tel" maxLength={40} autoComplete="tel" /></div>
                <div className="field"><label htmlFor="sc-nt">Anything we should know? (optional)</label><input id="sc-nt" name="notes" maxLength={1000} placeholder="Locations, number of employees, current program" /></div>
              </div>
            </SlotPicker>
            <p className="fine" style={{ textAlign: "left", marginTop: 10 }}>By booking you agree to be contacted about your request. See our <a href="/privacy">Privacy Policy</a>.</p>
          </form>
        )}
      </div>
    </section>
  );
}
