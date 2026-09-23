import { test } from "node:test";
import assert from "node:assert/strict";
import { accountLinkEmail, accountOtpEmail } from "../src/lib/email-templates";
import { sendAccountEmail, sendAccountOTP } from "../src/lib/email";

test("OTP emails keep the code intact in the subject and both bodies for every purpose", async () => {
  for (const [type, action] of [
    ["sign-in", "entrar en Luz en claro"],
    ["email-verification", "verificar tu correo"],
    ["forget-password", "cambiar tu contraseña"],
  ]) {
    const email = await accountOtpEmail("012345", type);
    assert.ok(email.subject.startsWith("012345 · "));
    assert.ok(email.text.includes("\n\n012345\n\n"));
    assert.ok(email.html.includes(">012345</p>"));
    for (const body of [email.text, email.html]) {
      assert.ok(body.includes(action));
      assert.ok(body.includes("10 minutos"));
      assert.ok(body.includes("una vez"));
    }
    assert.equal(email.html.includes("<script"), false);
    assert.equal(email.html.includes("<img"), false);
  }
});

test("account buttons and fallback links preserve and escape the full authentication URL", async () => {
  const url =
    'https://luz.example/api/auth/verify-email?token=abc&callbackURL=%2F&label="<example>"';
  const escaped =
    "https://luz.example/api/auth/verify-email?token=abc&amp;callbackURL=%2F&amp;label=&quot;&lt;example&gt;&quot;";
  for (const [kind, action] of [
    ["verification", "Confirmar mi correo"],
    ["reset", "Cambiar contraseña"],
    ["delete", "Eliminar mi cuenta"],
  ] as const) {
    const email = await accountLinkEmail(url, kind);
    assert.ok(email.text.includes(url));
    assert.equal(email.html.split(`href="${escaped}"`).length - 1, 2);
    assert.ok(email.html.includes(`>${escaped}</a>`));
    assert.ok(email.html.includes(action));
    assert.equal(email.html.includes(url), false);
  }
  const maliciousCode = await accountOtpEmail('<img src="x">', "sign-in");
  assert.equal(maliciousCode.html.includes("<img"), false);
});

test("email delivery sends matching HTML and plain text through the existing Resend endpoint", async (t) => {
  const previous = {
    EMAIL_MODE: process.env.EMAIL_MODE,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  process.env.EMAIL_MODE = "resend";
  process.env.RESEND_API_KEY = "test-key-not-valid";
  process.env.EMAIL_FROM = "Luz en claro <cuenta@luz.example>";
  const requests: { url: unknown; body: Record<string, unknown> }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, options: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(options.body)) });
      return new Response('{"id":"test-email"}', { status: 200 });
    },
  );

  await sendAccountOTP("person@example.com", "012345", "sign-in");
  await sendAccountEmail(
    "person@example.com",
    "https://luz.example/verify",
    "verification",
  );
  await sendAccountEmail(
    "person@example.com",
    "https://luz.example/reset",
    "reset",
  );
  const expected = await Promise.all([
    accountOtpEmail("012345", "sign-in"),
    accountLinkEmail("https://luz.example/verify", "verification"),
    accountLinkEmail("https://luz.example/reset", "reset"),
  ]);
  assert.equal(requests.length, 3);
  requests.forEach((request, index) => {
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.deepEqual(request.body, {
      from: process.env.EMAIL_FROM,
      to: ["person@example.com"],
      ...expected[index],
    });
  });
});
