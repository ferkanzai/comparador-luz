import {
  accountLinkEmail,
  accountOtpEmail,
  type AccountEmail,
} from "./email-templates";
import type { AccountLinkKind } from "../emails/account-email";

export async function sendAccountEmail(
  to: string,
  url: string,
  kind: AccountLinkKind,
) {
  return deliverEmail(to, await accountLinkEmail(url, kind));
}
export async function sendAccountOTP(to: string, otp: string, type: string) {
  return deliverEmail(to, await accountOtpEmail(otp, type));
}
async function deliverEmail(to: string, { subject, text, html }: AccountEmail) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.EMAIL_MODE === "console"
  ) {
    console.info(`[Development email] ${subject}\n${text}`);
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Email delivery failed (${response.status}).`);
}
