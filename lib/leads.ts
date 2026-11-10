// Lead delivery. Primary: email to the sales inbox via Resend (https://resend.com).
// Optional: POST the same JSON to LEAD_WEBHOOK_URL (CRM, Zapier, Make, Slack, Google Sheets).
// Configure SPF/DKIM for the sending domain in Resend so leads stop landing in spam.

export type Lead = {
  type: string; // quote | sample | handbook | clinic | certification-waitlist | contact
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  audience?: string;
  industry?: string;
  volume?: string;
  interest?: string;
  message?: string;
  resource?: string;
  legalName?: string;
  signer?: string;
  services?: string;
  affiliation?: string;
  wantsAgreement?: boolean;
  newsletter?: boolean;
  page?: string;
  referrer?: string;
  utm?: Record<string, string>;
  submittedAt: string;
  ip?: string;
};

const esc = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function render(lead: Lead) {
  const rows: [string, string | undefined][] = [
    ["Lead type", lead.type],
    ["Name", `${lead.firstName} ${lead.lastName}`],
    ["Company", lead.company],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["City / State", [lead.city, lead.state].filter(Boolean).join(", ")],
    ["I am", lead.audience],
    ["Industry", lead.industry],
    ["Monthly volume", lead.volume],
    ["Interest level", lead.interest],
    ["Resource", lead.resource],
    ["Legal business name", lead.legalName],
    ["Agreement signer", lead.signer],
    ["Services offered", lead.services],
    ["Affiliation", lead.affiliation],
    ["Send CPP agreement", lead.type === "cpp-application" ? (lead.wantsAgreement ? "YES, send the agreement" : "No, wants a call first") : undefined],
    ["Newsletter", lead.newsletter ? "Yes" : "No"],
    ["Message", lead.message],
    ["Page", lead.page],
    ["Referrer", lead.referrer],
    ["UTM", lead.utm && Object.keys(lead.utm).length ? Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" ") : undefined],
    ["Submitted", lead.submittedAt],
  ];
  const html = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;color:#404951;border-collapse:collapse">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="font-weight:bold;border-bottom:1px solid #dfe5e5">${esc(k)}</td><td style="border-bottom:1px solid #dfe5e5">${esc(v)}</td></tr>`)
    .join("")}</table>`;
  const text = rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  return { html, text };
}

export async function deliverLead(lead: Lead) {
  const results: string[] = [];
  // CPP applications can go to a different inbox (CPP_LEAD_TO_EMAIL); everything else uses LEAD_TO_EMAIL.
  const toList = (lead.type === "cpp-application" && process.env.CPP_LEAD_TO_EMAIL) || process.env.LEAD_TO_EMAIL || "kelly.ramsey@labb.com";
  const to = toList.split(",").map((s) => s.trim());
  const from = process.env.LEAD_FROM_EMAIL || "Labb Website <leads@labb.com>";

  if (process.env.RESEND_API_KEY) {
    const { html, text } = render(lead);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: lead.email,
        subject:
          lead.type === "cpp-application"
            ? `CPP application${lead.wantsAgreement ? " (SEND AGREEMENT)" : ""}: ${lead.company} (${[lead.city, lead.state].filter(Boolean).join(", ")})`
            : `New ${lead.type} lead: ${lead.company || `${lead.firstName} ${lead.lastName}`}`,
        html,
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    results.push("email");
  }

  if (process.env.LEAD_WEBHOOK_URL) {
    const res = await fetch(process.env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    if (!res.ok) throw new Error(`Webhook error ${res.status}`);
    results.push("webhook");
  }

  if (!results.length) {
    // Nothing configured (local dev). Log so the lead is not silently lost.
    console.warn("[lead] No RESEND_API_KEY or LEAD_WEBHOOK_URL set. Lead:", JSON.stringify(lead));
    if (process.env.NODE_ENV === "production") throw new Error("No lead delivery configured");
  }
  return results;
}
