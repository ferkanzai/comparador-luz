import { createHmac, timingSafeEqual } from "node:crypto";

export const signupProofCookie = "luz_signup_proof";

function signature(userId: string) {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update(`signup-proof:${userId}`)
    .digest("base64url");
}

export function signupProof(userId: string) {
  return `${userId}.${signature(userId)}`;
}

export function provesSignup(cookieHeader: string | null, userId: string) {
  const value = cookieHeader
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${signupProofCookie}=`))
    ?.slice(signupProofCookie.length + 1);
  if (!value) return false;
  const expected = Buffer.from(signupProof(userId));
  const actual = Buffer.from(decodeURIComponent(value));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
