import "server-only";
import { createToken } from "@/lib/auth";
import { emailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

// Creates a 7-day setup link and emails it. Returns the link so an admin can share it by hand
// if email isn't configured yet.
export async function sendInvite(m: { id: string; email: string; name: string; username: string }) {
  const token = await createToken(m.id, "invite");
  const link = absoluteUrl(`/account/setup?token=${token}`);
  const sent = await sendMail(
    m.email,
    "Your Labb CPP member account",
    emailLayout(
      "Your Labb member account is ready",
      `<p>Hi ${m.name.split(" ")[0]},</p>
       <p>Welcome to the Labb Channel Partner Program. Your member account gives you the Clinic Owners Handbook, guidebooks, data sheets and member resources.</p>
       <p>Your username is <strong>${m.username}</strong>. Use the button below to choose your password. The link works once and expires in 7 days.</p>`,
      { href: link, label: "Set up my account" },
    ),
    `Welcome to the Labb Channel Partner Program.\nYour username is ${m.username}.\nSet your password here (expires in 7 days): ${link}`,
  );
  return { link, sent };
}
