import "server-only";
import { createToken } from "@/lib/auth";
import { emailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

// Creates a 7-day setup link and emails it. Returns the link so an admin can share it by hand
// if email isn't configured yet.
import { cppEmail } from "@/lib/site";
export async function sendInvite(m: { id: string; email: string; name: string; username: string; role?: string }, courseTitle?: string) {
  const token = await createToken(m.id, "invite");
  const link = absoluteUrl(`/account/setup?token=${token}`);
  if (m.role === "learner") {
    const sent = await sendMail(
      m.email,
      `Your ${courseTitle || "Labb course"} account`,
      emailLayout(
        "Your Labb course account is ready",
        `<p>Hi ${m.name.split(" ")[0]},</p>
         <p>You're enrolled in the <strong>${courseTitle || "Labb course"}</strong>. Your progress saves to your account, so you can stop and pick up where you left off on any device.</p>
         <p>Your username is <strong>${m.username}</strong>. Use the button below to choose your password. The link works once and expires in 7 days.</p>`,
        { href: link, label: "Set up my account" },
      ),
      `You're enrolled in the ${courseTitle || "Labb course"}.\nYour username is ${m.username}.\nSet your password here (expires in 7 days): ${link}`,
    );
    return { link, sent };
  }
  const sent = await sendMail(
    m.email,
    "Your Labb CPP member account",
    emailLayout(
      "Your Labb member account is ready",
      `<p>Hi ${m.name.split(" ")[0]},</p>
       <p>Welcome to the Labb Channel Partner Program. Your member account gives you the Clinic Owners Guidebook, industry guidebooks, data sheets and member resources.</p>
       <p>Your username is <strong>${m.username}</strong>. Use the button below to choose your password. The link works once and expires in 7 days.</p>
       <p>Questions? Reply to this email or write to <a href="mailto:${cppEmail}">${cppEmail}</a>.</p>`,
      { href: link, label: "Set up my account" },
    ),
    `Welcome to the Labb Channel Partner Program.\nYour username is ${m.username}.\nSet your password here (expires in 7 days): ${link}\nQuestions? Email ${cppEmail}.`,
    { replyTo: cppEmail },
  );
  return { link, sent };
}
