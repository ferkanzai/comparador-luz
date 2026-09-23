import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { accountLinkEmail, accountOtpEmail } from "../src/lib/email-templates";

// Synthetic credentials only. This script renders files and never sends mail.
const previews = [
  ["otp-sign-in", accountOtpEmail("482916", "sign-in")],
  ["otp-verification", accountOtpEmail("482916", "email-verification")],
  ["otp-reset", accountOtpEmail("482916", "forget-password")],
  [
    "verification",
    accountLinkEmail(
      "https://luz.example/api/auth/verify-email?token=preview-only&callbackURL=%2F",
      "verification",
    ),
  ],
  [
    "password-reset",
    accountLinkEmail(
      "https://luz.example/cuenta?token=preview-only&mode=reset",
      "reset",
    ),
  ],
  [
    "delete-account",
    accountLinkEmail(
      "https://luz.example/api/auth/delete-user/callback?token=preview-only&callbackURL=%2F",
      "delete",
    ),
  ],
] as const;

const directory = resolve("output/emails");
await mkdir(directory, { recursive: true });
await Promise.all(
  previews.map(async ([name, pendingEmail]) => {
    const email = await pendingEmail;
    await writeFile(resolve(directory, `${name}.html`), email.html);
    await writeFile(
      resolve(directory, `${name}.txt`),
      `Subject: ${email.subject}\n\n${email.text}\n`,
    );
  }),
);
console.info(`Email previews written to ${directory}`);
