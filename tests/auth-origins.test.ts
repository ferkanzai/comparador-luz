import { test } from "node:test";
import assert from "node:assert/strict";
import { authOrigins } from "../src/lib/auth-origins";

const production = "https://comparador-luz-gilt.vercel.app";
const deployment = "comparador-deployment-test.vercel.app";
const branch = "comparador-branch-test.vercel.app";

test("Preview overrides an inherited production URL with exact deployment and branch hosts", () => {
  const config = authOrigins({
    VERCEL_ENV: "preview",
    VERCEL_URL: deployment,
    VERCEL_BRANCH_URL: branch,
    BETTER_AUTH_URL: production,
  });
  assert.deepEqual(config.origins, [
    `https://${deployment}`,
    `https://${branch}`,
  ]);
  assert.deepEqual(config.baseURL, {
    allowedHosts: [deployment, branch],
    protocol: "https",
    fallback: `https://${deployment}`,
  });
});

test("Production and local development retain their configured canonical origin", () => {
  for (const [VERCEL_ENV, BETTER_AUTH_URL] of [
    ["production", production],
    ["development", "http://localhost:3100"],
  ]) {
    assert.deepEqual(
      authOrigins({ VERCEL_ENV, BETTER_AUTH_URL, VERCEL_URL: deployment }),
      {
        baseURL: BETTER_AUTH_URL,
        origins: [BETTER_AUTH_URL],
      },
    );
  }
});

test("Preview supports a branch URL alone and falls back when system URLs are absent", () => {
  assert.deepEqual(
    authOrigins({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: branch }).origins,
    [`https://${branch}`],
  );
  assert.deepEqual(
    authOrigins({ VERCEL_ENV: "preview", BETTER_AUTH_URL: production }).origins,
    [production],
  );
  assert.deepEqual(authOrigins({}).origins, []);
});

test("Preview never expands a wildcard or malformed system URL into trusted origins", () => {
  for (const host of [
    "*.vercel.app",
    "https://example.vercel.app",
    "example.vercel.app/other",
    "example.vercel.app.evil.test",
  ]) {
    assert.deepEqual(
      authOrigins({ VERCEL_ENV: "preview", VERCEL_URL: host }).origins,
      [],
    );
  }
});
