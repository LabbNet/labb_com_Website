import { SignaturePad } from "@/components/SignaturePad";

// The saved countersignature form, shared by the admin and CPP member account pages.
export function SignatureSettings({ back, sig }: { back: string; sig: { signature_png: string | null; signature_name: string | null; signature_title: string | null; signature_at: Date | null; name: string; clinic?: string | null } }) {
  return (
    <div className="sig-settings" id="signature">
      {sig.signature_png ? (
        <div className="sig-current">
          <span className="fine">Your saved signature{sig.signature_at ? `, saved ${new Date(sig.signature_at).toLocaleDateString("en-US")}` : ""}</span>
          <img src={sig.signature_png} alt="Your saved signature" />
          <strong>{sig.signature_name}</strong>{sig.signature_title && <span>{sig.signature_title}</span>}
        </div>
      ) : <p className="fine" style={{ textAlign: "left" }}>No signature saved yet. Until you add one, agreements on your quotes wait for a countersignature.</p>}
      <form action="/api/account/signature" method="post" className="sig-form">
        <input type="hidden" name="back" value={back} />
        <div className="field"><label htmlFor="sig-name">Full name<span className="req">*</span></label><input id="sig-name" name="sig_name" required maxLength={120} defaultValue={sig.signature_name || sig.name} /></div>
        <div className="field"><label htmlFor="sig-title">Title</label><input id="sig-title" name="sig_title" maxLength={120} defaultValue={sig.signature_title || ""} placeholder={sig.clinic ? `Owner, ${sig.clinic}` : "President"} /></div>
        <div className="field sig-wide"><label>{sig.signature_png ? "Draw a new signature (leave blank to keep the current one)" : "Draw your signature"}</label><SignaturePad /></div>
        <div className="sig-wide btn-row" style={{ justifyContent: "flex-start" }}><button className="btn btn-primary" type="submit">Save signature</button></div>
      </form>
      {sig.signature_png && <form action="/api/account/signature" method="post"><input type="hidden" name="back" value={back} /><input type="hidden" name="remove" value="1" /><button className="linkish" type="submit">Remove my signature</button></form>}
    </div>
  );
}
