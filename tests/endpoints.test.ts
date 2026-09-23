import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  appSchemaHeader,
  appSchemaVersion,
  newTariff,
  type Bill,
  type Tariff,
  type Workspace,
} from "../src/lib/domain";

// Explicit opt-in to a disposable local database. Never run against a production URL.
test(
  "Postgres: save endpoints apply one action each and enforce the workspace rules",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
        url.pathname.endsWith("_test"),
      "Use a local disposable *_test database",
    );
    process.env.DATABASE_URL = url.toString();
    process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64");
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.EMAIL_MODE = "console";
    const base = "http://localhost:3000";
    const { getAuth } = await import("../src/lib/auth");
    const { getPool } = await import("../src/lib/db");
    const { withAccount } = await import("../src/db");
    const { ensureWorkspace, readWorkspace, writeChanges } =
      await import("../src/db/workspace");
    const workspaceRoute = await import("../src/app/api/workspace/route");
    const profile = await import("../src/app/api/profile/route");
    const offers = await import("../src/app/api/offers/[id]/route");
    const current = await import("../src/app/api/contract/current/route");
    const periods = await import("../src/app/api/contract/periods/route");
    const period = await import("../src/app/api/contract/periods/[id]/route");
    const bills = await import("../src/app/api/bills/[id]/route");
    await getPool().query('DELETE FROM "rateLimit"');
    const originalLog = console.info;
    console.info = () => {};
    const email = `endpoints-${randomBytes(4).toString("hex")}@example.com`;
    try {
      const auth = getAuth();
      const post = (path: string, body: unknown) =>
        auth.handler(
          new Request(`${base}${path}`, {
            method: "POST",
            headers: { origin: base, "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        );
      const password = "Local-test-password-234!";
      await post("/api/auth/sign-up/email", { name: "E", email, password });
      await getPool().query(
        'UPDATE "user" SET "emailVerified" = true WHERE email = $1',
        [email],
      );
      const signedIn = await post("/api/auth/sign-in/email", {
        email,
        password,
      });
      const cookie = signedIn.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      const { rows } = await getPool().query(
        'SELECT id FROM "user" WHERE email = $1',
        [email],
      );
      const userId: string = rows[0].id;

      type Handler = (
        request: Request,
        context?: { params: Promise<{ id: string }> },
      ) => Promise<Response>;
      const call = async (
        route: (...args: never[]) => Promise<Response>,
        method: string,
        body?: unknown,
        id = "",
      ) => {
        const handler = route as unknown as Handler;
        const response = await handler(
          new Request(`${base}/api/x`, {
            method,
            headers: {
              origin: base,
              cookie,
              "content-type": "application/json",
              [appSchemaHeader]: String(appSchemaVersion),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          }),
          { params: Promise.resolve({ id }) },
        );
        return {
          status: response.status,
          error: ((await response.json()) as { error?: string }).error,
        };
      };
      const read = async (): Promise<Workspace> =>
        (
          await (
            await workspaceRoute.GET(
              new Request(`${base}/api/workspace`, { headers: { cookie } }),
            )
          ).json()
        ).data;
      const offer = (name: string): Tariff => ({
        ...newTariff(),
        name,
        energyPeak: "0.12",
        powerPeak: "0.1",
        powerValley: "0.05",
      });

      // Profile: only the fields sent change.
      assert.equal(
        (await call(profile.PATCH, "PATCH", { days: "30" })).status,
        200,
      );
      assert.equal(
        (await call(profile.PATCH, "PATCH", { peakKwh: "5" })).status,
        200,
      );
      assert.equal((await read()).profile.days, "30");
      assert.equal(
        (await call(profile.PATCH, "PATCH", { days: "abc" })).status,
        400,
      );

      // Offers.
      const a = offer("A");
      assert.equal((await call(offers.PUT, "PUT", a, a.id)).status, 200);
      assert.equal(
        (await call(offers.PUT, "PUT", a, crypto.randomUUID())).status,
        422,
      );
      assert.equal(
        (await call(offers.PUT, "PUT", { ...a, name: "A2" }, a.id)).status,
        200,
      );
      assert.deepEqual(
        (await read()).tariffs.map((t) => t.name),
        ["A2"],
      );

      // The current tariff, then a real price change that keeps the old period.
      assert.equal(
        (await call(current.POST, "POST", { tariff: a, since: "2025-01-01" }))
          .status,
        200,
      );
      let w = await read();
      const currentId = w.currentId!;
      assert.equal(w.currentSince, "2025-01-01");
      const refused = await call(offers.PUT, "PUT", w.tariffs[0], currentId);
      assert.equal(refused.status, 422);
      assert.equal(
        refused.error,
        "El contrato actual se corrige desde su registro.",
      );
      assert.equal(
        (await call(offers.DELETE, "DELETE", undefined, currentId)).status,
        422,
      );
      assert.equal(
        (
          await call(current.POST, "POST", {
            tariff: offer("B"),
            since: "2025-06-01",
          })
        ).status,
        200,
      );
      w = await read();
      assert.deepEqual(
        w.history.map((h) => [h.tariff.name, h.start, h.end]),
        [["A", "2025-01-01", "2025-06-01"]],
      );

      // Periods may not overlap.
      const overlap = await call(periods.POST, "POST", {
        tariff: offer("C"),
        start: "2025-03-01",
        end: "2025-04-01",
      });
      assert.equal(overlap.status, 422);
      assert.match(overlap.error!, /se solapa/);
      assert.equal(
        (
          await call(periods.POST, "POST", {
            tariff: offer("C"),
            start: "2024-01-01",
            end: "2024-06-01",
          })
        ).status,
        200,
      );
      w = await read();
      const old = w.history.find((h) => h.tariff.name === "C")!;
      assert.equal(
        (
          await call(
            period.PUT,
            "PUT",
            {
              tariff: { ...old.tariff, name: "C corregida" },
              start: old.start,
              end: old.end,
            },
            old.id,
          )
        ).status,
        200,
      );
      assert.ok(
        (await read()).history.some((h) => h.tariff.name === "C corregida"),
      );
      assert.equal(
        (await call(period.DELETE, "DELETE", undefined, old.id)).status,
        200,
      );
      assert.equal(
        (await call(period.DELETE, "DELETE", undefined, old.id)).status,
        200,
      );
      assert.equal((await read()).history.length, 1);

      // Bills, optionally creating an offer from their prices.
      const fromBill = offer("De la factura");
      const bill: Bill = {
        id: crypto.randomUUID(),
        month: "2025-07",
        periodStart: "2025-07-01",
        periodEnd: "2025-08-01",
        provider: "Comercializadora",
        paid: "65,42",
        credit: "0",
        kwh: "300",
        consumption: { peakKwh: "100", flatKwh: "100", valleyKwh: "100" },
        notes: "",
        tariff: fromBill,
        profile: null,
        breakdown: {
          energy: "60",
          power: "5.42",
          social: "0",
          snoee: "0",
          meter: "0",
          services: "0",
          electricityTax: "0",
          vat: "0",
          servicesVat: "0",
        },
      };
      assert.equal(
        (await call(bills.PUT, "PUT", { bill, newOffer: fromBill }, bill.id))
          .status,
        200,
      );
      w = await read();
      assert.equal(w.bills[0].paid, "65.42");
      assert.equal(w.bills[0].tariff?.name, "De la factura");
      assert.ok(w.tariffs.some((t) => t.id === fromBill.id));
      assert.equal(
        (
          await call(
            bills.PUT,
            "PUT",
            { bill: { ...bill, paid: "70" } },
            bill.id,
          )
        ).status,
        400,
        "a breakdown that doesn't add up to the total is refused",
      );
      assert.equal(
        (await call(bills.DELETE, "DELETE", undefined, bill.id)).status,
        200,
      );
      assert.equal(
        (await call(bills.DELETE, "DELETE", undefined, bill.id)).status,
        200,
      );
      assert.deepEqual((await read()).bills, []);

      // The offer limit holds across saves.
      await withAccount(userId, "write", async (tx) => {
        await ensureWorkspace(tx, userId);
        const before = await readWorkspace(tx, userId);
        const extra = Array.from(
          { length: 100 - before.tariffs.length },
          (_, i) => offer(`Oferta ${i}`),
        );
        await writeChanges(tx, userId, before, {
          ...before,
          tariffs: [...before.tariffs, ...extra],
        });
      });
      const oneMore = offer("101");
      const tooMany = await call(offers.PUT, "PUT", oneMore, oneMore.id);
      assert.equal(tooMany.status, 422);
      assert.match(tooMany.error!, /hasta 100 tarifas/);
    } finally {
      console.info = originalLog;
      await getPool().query('DELETE FROM "user" WHERE email = $1', [email]);
      await getPool().end();
    }
  },
);
