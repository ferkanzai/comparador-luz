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
        const unverified = await auth.handler(
          request("/api/auth/sign-in/email", { email, password }),
        );
        assert.equal(unverified.status, 403);
        const verified = await auth.handler(
          new Request(emailURL(), { headers: { origin: base } }),
        );
        assert.equal(verified.status, 302);
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
        provider: "Private provider",
        paid: "65,42",
        kwh: "300",
        notes: "",
        tariff: structuredClone(tariff),
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
      assert.equal(saved.data.tariffs[0].name, "Private tariff");
      assert.equal(saved.data.bills[0].paid, "65,42");
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
      assert.equal(
        (await GET(request("/api/workspace", undefined, aliceCookie))).status,
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
      assert.equal(
        (await GET(request("/api/workspace", undefined, bobCookie))).status,
        401,
      );
    } finally {
      console.info = originalLog;
      await getPool().query('DELETE FROM "user" WHERE email = ANY($1)', [
        users,
      ]);
      await getPool().end();
    }
  },
);
