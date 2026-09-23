import { emailOTP } from "better-auth/plugins/email-otp";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { waitUntil } from "@vercel/functions";
import { getPool } from "./db";
import { sendAccountEmail, sendAccountOTP } from "./email";
import { authOrigins } from "./auth-origins";
import { provesSignup, signupProof, signupProofCookie } from "./signup-proof";

const verificationLinkSeconds = 3600;

export function authConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    authOrigins().baseURL &&
    (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32 &&
    ((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) ||
      (process.env.NODE_ENV !== "production" &&
        process.env.EMAIL_MODE === "console")),
  );
}
export function authOptions() {
  return {
    appName: "Luz en claro",
    baseURL: authOrigins().baseURL,
    database: getPool(),
    advanced: process.env.VERCEL
      ? {
          backgroundTasks: { handler: waitUntil },
          ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
        }
      : undefined,
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          await sendAccountOTP(email, otp, type);
        },
      }),
    ],
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
      expiresIn: verificationLinkSeconds,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAccountEmail(user.email, url, false);
      },
      // Whoever set the password may not own the mailbox. Keep it only when
      // the link opens in the browser that proved the password.
      beforeEmailVerification: async (user, request): Promise<void> => {
        const { internalAdapter } = await getAuth().$context;
        await internalAdapter.deleteUserSessions(user.id);
        if (provesSignup(request?.headers.get("cookie") ?? null, user.id))
          return;
        for (const account of await internalAdapter.findAccounts(user.id))
          await internalAdapter.deleteAccount(account.id);
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx): Promise<void> => {
        const cookie = {
          httpOnly: true,
          sameSite: "lax",
          secure: ctx.context.baseURL.startsWith("https://"),
          path: new URL(ctx.context.baseURL).pathname,
        } as const;
        if (ctx.path === "/verify-email") {
          ctx.setCookie(signupProofCookie, "", { ...cookie, maxAge: 0 });
          return;
        }
        const returned = ctx.context.returned;
        let userId: string | undefined;
        if (ctx.path === "/sign-up/email" && !isAPIError(returned))
          userId = (returned as { user?: { id: string } } | undefined)?.user
            ?.id;
        // This error is only raised after the password has been checked.
        else if (
          ctx.path === "/sign-in/email" &&
          isAPIError(returned) &&
          returned.body?.code === "EMAIL_NOT_VERIFIED"
        )
          userId = (
            await ctx.context.internalAdapter.findUserByEmail(ctx.body.email)
          )?.user.id;
        if (userId)
          ctx.setCookie(signupProofCookie, signupProof(userId), {
            ...cookie,
            maxAge: verificationLinkSeconds,
          });
      }),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Reads may see a revoked session for up to this long; saves always check the database.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
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
        "/email-otp/send-verification-otp": { window: 60, max: 3 },
        "/sign-in/email-otp": { window: 60, max: 5 },
      },
    },
  } satisfies BetterAuthOptions;
}
function createAuth() {
  return betterAuth(authOptions());
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
