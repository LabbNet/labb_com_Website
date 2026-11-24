import "server-only";

// Microsoft 365 (Graph) connection: creates Microsoft Teams meetings in the host's Outlook calendar, moves and
// cancels them, and reads busy times. Turned on by three settings in Render:
// MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET (an Entra app with the Calendars.ReadWrite application permission).
export const graphOn = () => !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);

let cached: { token: string; exp: number } | null = null;
async function token() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID!, client_secret: process.env.MS_CLIENT_SECRET!, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(15000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !j.access_token) throw new Error(`Microsoft sign-in failed: ${(j.error_description || res.status).toString().split("\r")[0]}`);
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3000) * 1000 };
  return cached.token;
}

async function graph<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method, headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  if (res.status === 202 || res.status === 204) return undefined as T;
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Microsoft 365: ${(j as { error?: { message?: string } }).error?.message || res.status}`);
  return j as T;
}

const mbox = (email: string) => `/users/${encodeURIComponent(email)}`;
const when = (d: Date) => ({ dateTime: new Date(d).toISOString().replace("Z", ""), timeZone: "UTC" });

type Ev = { id: string; onlineMeeting?: { joinUrl?: string } | null };

// New Teams meeting in the host's calendar. Outlook emails the invitation to the prospect from the host.
export async function createTeamsMeeting(hostEmail: string, o: { subject: string; start: Date; end: Date; html: string; attendee: { email: string; name: string } }) {
  const ev = await graph<Ev>("POST", `${mbox(hostEmail)}/events`, {
    subject: o.subject,
    body: { contentType: "HTML", content: o.html },
    start: when(o.start), end: when(o.end),
    attendees: [{ emailAddress: { address: o.attendee.email, name: o.attendee.name }, type: "required" }],
    isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness",
    allowNewTimeProposals: false, responseRequested: true, reminderMinutesBeforeStart: 15, isReminderOn: true,
  });
  let joinUrl = ev.onlineMeeting?.joinUrl;
  for (let i = 0; !joinUrl && i < 3; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    joinUrl = (await graph<Ev>("GET", `${mbox(hostEmail)}/events/${ev.id}?$select=onlineMeeting`)).onlineMeeting?.joinUrl;
  }
  return { eventId: ev.id, joinUrl: joinUrl || "" };
}

// Move it; Outlook sends the prospect the updated invitation.
export async function moveTeamsMeeting(hostEmail: string, eventId: string, start: Date, end: Date, subject?: string) {
  await graph("PATCH", `${mbox(hostEmail)}/events/${eventId}`, { start: when(start), end: when(end), ...(subject ? { subject } : {}) });
}

// Cancel it; Outlook sends the prospect the cancellation.
export async function cancelTeamsMeeting(hostEmail: string, eventId: string, comment: string) {
  await graph("POST", `${mbox(hostEmail)}/events/${eventId}/cancel`, { comment });
}

// Busy times from the host's Outlook calendar (anything not marked Free).
export async function busyTimes(hostEmail: string, from: Date, to: Date) {
  const out: { start: Date; end: Date }[] = [];
  let next: string | null = `${mbox(hostEmail)}/calendarView?startDateTime=${from.toISOString()}&endDateTime=${to.toISOString()}&$select=start,end,showAs,isCancelled&$top=250`;
  for (let page = 0; next && page < 20; page++) {
    const r: { value: { start: { dateTime: string }; end: { dateTime: string }; showAs: string; isCancelled: boolean }[]; "@odata.nextLink"?: string } =
      await graph("GET", next, undefined, { Prefer: 'outlook.timezone="UTC"' });
    for (const e of r.value) {
      if (e.isCancelled || e.showAs === "free" || e.showAs === "workingElsewhere") continue;
      out.push({ start: new Date(`${e.start.dateTime.replace(/Z$/, "")}Z`), end: new Date(`${e.end.dateTime.replace(/Z$/, "")}Z`) });
    }
    const link: string | undefined = r["@odata.nextLink"];
    next = link ? link.replace("https://graph.microsoft.com/v1.0", "") : null;
  }
  return out;
}
