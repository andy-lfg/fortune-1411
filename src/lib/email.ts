// src/lib/email.ts
import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendMail(to: string, subject: string, html: string) {
  // Optional: guard, damit dev nicht crasht wenn Key fehlt
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY fehlt – Mail wird nicht gesendet.");
    return;
  }
  await resend.emails.send({
    from: "Fortune 1411 <noreply@fortune1411.com>",
    to,
    subject,
    html,
  });
}
