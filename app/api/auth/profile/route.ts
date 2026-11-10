import { checkPassword, currentMember, EMAIL_RE, logEvent, sameOrigin, startSession, USERNAME_RE } from "@/lib/auth";
import { sql } from "@/lib/db";
import { emailLayout, sendMail } from "@/lib/mail";
import { field, go } from "@/lib/http";

const BACK = "/members/account";
const STATES = /^[A-Z]{2}$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const PHONE = /^[0-9+().\-\s]{7,25}$/;

export async function POST(req: Request) {
  if (!(await sameOrigin())) return go(req, `${BACK}?perr=1`);
  const m = await currentMember();
  if (!m) return go(req, `/login?next=${BACK}`);
  const fd = await req.formData();

  const name = field(fd, "name", 120);
  const clinic = field(fd, "clinic", 160) || null;
  const phone = field(fd, "phone", 60) || null;
  const address_line1 = field(fd, "address_line1", 160) || null;
  const address_line2 = field(fd, "address_line2", 160) || null;
  const city = field(fd, "city", 80) || null;
  const state = field(fd, "state", 40).toUpperCase() || null;
  const postal_code = field(fd, "postal_code", 40) || null;
  const email = field(fd, "email", 200).toLowerCase();
  const username = field(fd, "username", 40).toLowerCase();
  const current = String(fd.get("current") ?? "");

  if (!name) return go(req, `${BACK}?perr=name`);
  if (phone && !PHONE.test(phone)) return go(req, `${BACK}?perr=phone`);
  if (state && !STATES.test(state)) return go(req, `${BACK}?perr=state`);
  if (postal_code && !ZIP.test(postal_code)) return go(req, `${BACK}?perr=zip`);
  if (!EMAIL_RE.test(email)) return go(req, `${BACK}?perr=email`);
  if (!USERNAME_RE.test(username)) return go(req, `${BACK}?perr=username`);

  // Sign-in details (email, username) need the current password.
  const emailChanged = email !== m.email.toLowerCase();
  const usernameChanged = username !== m.username.toLowerCase();
  if (emailChanged || usernameChanged) {
    const [row] = await sql()<{ password_hash: string }[]>`select password_hash from members where id = ${m.id}`;
    if (!(await checkPassword(current, row.password_hash))) return go(req, `${BACK}?perr=current`);
    const taken = await sql()<{ email: string; username: string }[]>`
      select email, username from members
      where id <> ${m.id} and (lower(email) = ${email} or lower(username) = ${username})`;
    if (taken.some((t) => t.email.toLowerCase() === email)) return go(req, `${BACK}?perr=email_taken`);
    if (taken.some((t) => t.username.toLowerCase() === username)) return go(req, `${BACK}?perr=username_taken`);
  }

  let updated;
  try {
    [updated] = await sql()<{ id: string; role: "member" | "admin"; session_version: number; email: string }[]>`
      update members set
        name = ${name}, clinic = ${clinic}, phone = ${phone},
        address_line1 = ${address_line1}, address_line2 = ${address_line2},
        city = ${city}, state = ${state}, postal_code = ${postal_code},
        email = ${email}, username = ${username}, updated_at = now()
      where id = ${m.id}
      returning id, role, session_version, email`;
  } catch (e) {
    // Unique index race: someone took the email or username between the check and the update.
    console.error("[profile] update failed", e);
    return go(req, `${BACK}?perr=1`);
  }

  const changed: string[] = [];
  if (name !== m.name) changed.push("name");
  if (clinic !== m.clinic) changed.push("clinic");
  if (phone !== m.phone) changed.push("phone");
  if ([address_line1, address_line2, city, state, postal_code].join("|") !== [m.address_line1, m.address_line2, m.city, m.state, m.postal_code].join("|")) changed.push("address");
  if (emailChanged) changed.push(`email ${m.email} -> ${email}`);
  if (usernameChanged) changed.push(`username ${m.username} -> ${username}`);
  if (changed.length) await logEvent(m.id, "profile_updated", changed.join("; "));

  if (emailChanged) {
    // Tell the old address, so a hijacked account doesn't go unnoticed.
    const body = `<p>The email address on your Labb CPP member account was changed to <strong>${email}</strong>.</p><p>If you made this change, no action is needed. If you didn't, contact info@labb.com right away.</p>`;
    await sendMail(m.email, "Your Labb account email was changed", emailLayout("Your account email was changed", body),
      `The email address on your Labb CPP member account was changed to ${email}. If you didn't make this change, contact info@labb.com right away.`);
    await startSession(updated); // cookie carries the email
  }
  return go(req, `${BACK}?saved=1`);
}
