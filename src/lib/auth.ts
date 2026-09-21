import { betterAuth } from "better-auth";
import { waitUntil } from "@vercel/functions";
import { getPool } from "./db";
import { sendAccountEmail } from "./email";

export function authConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_URL &&
    (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32 &&
    ((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) ||
      (process.env.NODE_ENV !== "production" &&
        process.env.EMAIL_MODE === "console")),
  );
}
function createAuth() {
  return betterAuth({
    appName: "Luz en claro",
    database: getPool(),
    advanced: process.env.VERCEL
      ? {
          backgroundTasks: { handler: waitUntil },
          ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
        }
      : undefined,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 1800,
      sendResetPassword: async ({ user, url }) => {
        await sendAccountEmail(user.email, url, true);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAccountEmail(user.email, url, false);
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
