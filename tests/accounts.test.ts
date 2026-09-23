import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { emptyWorkspace, newTariff } from "../src/lib/domain";
// Explicit opt-in to a disposable local database. Never run against a production URL.
test(
  "Postgres: verification, account isolation, persistence, conflicting writes, reset and revocation",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const testUrl = new URL(process.env.TEST_DATABASE_URL!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(testUrl.hostname) &&
        testUrl.pathname.endsWith("_test"),
      "Use a local disposable *_test database",
    );
    process.env.DATABASE_URL = testUrl.toString();
    process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64");
    const preview = process.env.TEST_VERCEL_PREVIEW;
    process.env.BETTER_AUTH_URL = preview
      ? "https://comparador-luz-gilt.vercel.app"
      : "http://localhost:3000";
    // Simulate Preview inheriting Production's canonical URL.
    process.env.VERCEL_ENV = preview ? "preview" : "development";
    process.env.VERCEL_URL = "comparador-deployment-test.vercel.app";
    process.env.VERCEL_BRANCH_URL = "comparador-branch-test.vercel.app";
    delete process.env.VERCEL;
    process.env.EMAIL_MODE = "console";
    const { getAuth } = await import("../src/lib/auth");
    const { getPool } = await import("../src/lib/db");
    const { GET, PUT } = await import("../src/app/api/workspace/route");
    // The guarded disposable database also stores rate limits between test runs.
    await getPool().query('DELETE FROM "rateLimit"');
    const auth = getAuth();
    const base = preview
      ? `https://${preview === "branch" ? process.env.VERCEL_BRANCH_URL : process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const emails: string[] = [];
    const originalLog = console.info;
    console.info = (...args: unknown[]) => {
      const message = String(args[0]);
      if (message.includes("[Development email]")) emails.push(message);
      else originalLog(...args);
    };
    const users: string[] = [];
    const password = "Local-test-password-234!";
    const request = (path: string, body?: unknown, cookie = "") =>
      new Request(`${base}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { origin: base, "content-type": "application/json", cookie },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const cookieOf = (r: Response) =>
      r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
    const withoutCookieCache = (cookie: string) =>
      cookie
        .split("; ")
        .filter((c) => !c.includes("session_data"))
        .join("; ");
    const emailURL = () => {
      assert.ok(emails.length);
      return emails.at(-1)!.match(/https?:\/\/\S+/)![0];
    };
    try {
      const foreignOrigin = await auth.handler(
        new Request(`${base}/api/auth/sign-out`, {
          method: "POST",
          headers: {
            origin: "https://unrelated-preview.vercel.app",
            "content-type": "application/json",
            cookie: "unrelated=1",
          },
          body: "{}",
        }),
      );
      assert.equal(foreignOrigin.status, 403);
      assert.equal((await foreignOrigin.json()).code, "INVALID_ORIGIN");
      assert.equal((await GET(request("/api/workspace"))).status, 401);
      let aliceCookie = "";
      let bobCookie = "";
      for (const name of ["Alice", "Bob"]) {
        const email = `${name.toLowerCase()}-${randomBytes(4).toString("hex")}@example.com`;
        users.push(email);
        const signup = await auth.handler(
          request("/api/auth/sign-up/email", {
            name,
            email,
            password,
            callbackURL: `${base}/`,
          }),
        );
        if (signup.status !== 200) {
          assert.fail(`Signup failed: ${signup.status} ${await signup.text()}`);
        }
        assert.equal(signup.status, 200);
        assert.equal(new URL(emailURL()).origin, base);
        assert.ok(!cookieOf(signup).includes("session_token"));
        assert.ok(cookieOf(signup).includes("luz_signup_proof"));
        const unverified = await auth.handler(
          request("/api/auth/sign-in/email", { email, password }),
        );
        assert.equal(unverified.status, 403);
        assert.equal((await unverified.json()).code, "EMAIL_NOT_VERIFIED");
        const verified = await auth.handler(
          new Request(emailURL(), {
            headers: { origin: base, cookie: cookieOf(signup) },
          }),
        );
        assert.equal(verified.status, 302);
        assert.ok(cookieOf(verified).includes("session_token"));
        const signedIn = await auth.handler(
          request("/api/auth/sign-in/email", { email, password }),
        );
        assert.equal(signedIn.status, 200);
        if (name === "Alice") aliceCookie = cookieOf(signedIn);
        else bobCookie = cookieOf(signedIn);
      }
      const w = emptyWorkspace();
      const tariff = { ...newTariff(), name: "Private tariff" };
      w.tariffs.push(tariff);
      w.currentId = tariff.id;
      w.currentSince = "2026-01-01";
      w.bills.push({
        id: crypto.randomUUID(),
        month: "2026-01",
        periodStart: "",
        periodEnd: "",
        provider: "Private provider",
        paid: "65,42",
        credit: "0",
        kwh: "300",
        notes: "",
        tariff: structuredClone(tariff),
        profile: null,
        breakdown: null,
      });
      const put = (cookie: string, version: number, origin = base) =>
        PUT(
          new Request(`${base}/api/workspace`, {
            method: "PUT",
            headers: { origin, cookie, "content-type": "application/json" },
            body: JSON.stringify({ data: w, version }),
          }),
        );
      assert.equal(
        (await put(aliceCookie, 0, "https://evil.example")).status,
        403,
      );
      assert.equal((await put(aliceCookie, 0)).status, 200);
      assert.equal((await put(aliceCookie, 0)).status, 409);
      const saved = await (
        await GET(request("/api/workspace", undefined, aliceCookie))
      ).json();
      const recached = await GET(
        request("/api/workspace", undefined, withoutCookieCache(aliceCookie)),
      );
      assert.ok(cookieOf(recached).includes("session_data"));
      assert.equal(saved.data.tariffs[0].name, "Private tariff");
      assert.equal(saved.data.bills[0].paid, "65.42");
      assert.equal(saved.version, 1);
      const bobs = await (
        await GET(request("/api/workspace", undefined, bobCookie))
      ).json();
      assert.equal(bobs.version, 0);
      assert.deepEqual(bobs.data.tariffs, []);
      assert.equal((await put(bobCookie, 1)).status, 409);
      assert.equal((await put(aliceCookie, 1)).status, 200);
      const malformed = await PUT(
        new Request(`${base}/api/workspace`, {
          method: "PUT",
          headers: {
            origin: base,
            cookie: aliceCookie,
            "content-type": "application/json",
          },
          body: "{oops",
        }),
      );
      assert.equal(malformed.status, 400);
      const reset = await auth.handler(
        request("/api/auth/request-password-reset", {
          email: users[0],
          redirectTo: `${base}/cuenta?mode=reset`,
        }),
      );
      assert.equal(reset.status, 200);
      const url = new URL(emailURL());
      assert.equal(url.origin, base);
      const token = url.pathname.split("/").at(-1)!;
      const changed = await auth.handler(
        request("/api/auth/reset-password", {
          token,
          newPassword: "A-new-local-password-345!",
        }),
      );
      assert.equal(changed.status, 200);
      // The cookie cache may serve reads for a few minutes; saves check the database.
      assert.equal(
        (await GET(request("/api/workspace", undefined, aliceCookie))).status,
        200,
      );
      assert.equal((await put(aliceCookie, 2)).status, 401);
      assert.equal(
        (
          await GET(
            request(
              "/api/workspace",
              undefined,
              withoutCookieCache(aliceCookie),
            ),
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await auth.handler(
            request("/api/auth/reset-password", {
              token,
              newPassword: "One-more-local-password-456!",
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        (await auth.handler(request("/api/auth/sign-out", {}, bobCookie)))
          .status,
        200,
      );
      assert.equal((await put(bobCookie, 0)).status, 401);
      assert.equal(
        (
          await GET(
            request("/api/workspace", undefined, withoutCookieCache(bobCookie)),
          )
        ).status,
        401,
      );
      // Someone pre-registers the owner's email with their own password.
      // When the owner opens the link elsewhere, that password and every earlier session stop working.
      await getPool().query('DELETE FROM "rateLimit"');
      const victim = `victim-${randomBytes(4).toString("hex")}@example.com`;
      users.push(victim);
      const attackerSignup = await auth.handler(
        request("/api/auth/sign-up/email", {
          name: "Attacker",
          email: victim,
          password,
          callbackURL: `${base}/`,
        }),
      );
      assert.equal(attackerSignup.status, 200);
      const victimLink = emailURL();
      const { rows: victimRows } = await getPool().query(
        'SELECT id FROM "user" WHERE email = $1',
        [victim],
      );
      const { internalAdapter } = await auth.$context;
      const earlier = await internalAdapter.createSession(victimRows[0].id);
      const ownerClick = await auth.handler(
        new Request(victimLink, { headers: { origin: base } }),
      );
      assert.equal(ownerClick.status, 302);
      assert.equal(
        (
          await getPool().query("SELECT 1 FROM session WHERE token = $1", [
            earlier.token,
          ])
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await auth.handler(
            request("/api/auth/sign-in/email", { email: victim, password }),
          )
        ).status,
        401,
      );
      assert.equal(
        (await GET(request("/api/workspace", undefined, cookieOf(ownerClick))))
          .status,
        200,
      );
      // Email codes create verified sessions, cannot be reused, and retain an existing account's workspace.
      await getPool().query('DELETE FROM "rateLimit"');
      const otpEmail = `otp-${randomBytes(4).toString("hex")}@example.com`;
      users.push(otpEmail);
      const sendCode = async (email: string) => {
        const sent = await auth.handler(
          request("/api/auth/email-otp/send-verification-otp", {
            email,
            type: "sign-in",
          }),
        );
        assert.equal(sent.status, 200);
        const code = emails
          .at(-1)
          ?.match(/^\[Development email\] (\d{6})\b/)?.[1];
        assert.ok(code, "Email delivery contains a six-digit code");
        return code;
      };
      const code = await sendCode(otpEmail);
      const records = await getPool().query(
        "SELECT value FROM verification WHERE identifier LIKE $1",
        [`%${otpEmail}%`],
      );
      assert.ok(records.rows.length);
      assert.ok(
        records.rows.every(
          (row: { value: string }) => !row.value.includes(code),
        ),
        "OTP must be hashed in storage",
      );
      const wrongCode = code === "000000" ? "111111" : "000000";
      assert.equal(
        (
          await auth.handler(
            request("/api/auth/sign-in/email-otp", {
              email: otpEmail,
              otp: wrongCode,
            }),
          )
        ).status,
        400,
      );
      const otpSession = await auth.handler(
        request("/api/auth/sign-in/email-otp", {
          email: otpEmail,
          otp: code,
          name: "OTP account",
        }),
      );
      assert.equal(otpSession.status, 200);
      assert.equal((await otpSession.json()).user.emailVerified, true);
      assert.equal(
        (await GET(request("/api/workspace", undefined, cookieOf(otpSession))))
          .status,
        200,
      );
      assert.equal(
        (
          await auth.handler(
            request("/api/auth/sign-in/email-otp", {
              email: otpEmail,
              otp: code,
            }),
          )
        ).status,
        400,
      );
      const aliceCode = await sendCode(users[0]);
      const aliceOTP = await auth.handler(
        request("/api/auth/sign-in/email-otp", {
          email: users[0],
          otp: aliceCode,
        }),
      );
      assert.equal(aliceOTP.status, 200);
      const retained = await (
        await GET(request("/api/workspace", undefined, cookieOf(aliceOTP)))
      ).json();
      assert.equal(retained.data.bills[0].paid, "65.42");
    } finally {
      console.info = originalLog;
      await getPool().query('DELETE FROM "user" WHERE email = ANY($1)', [
        users,
      ]);
      await getPool().end();
    }
  },
);
