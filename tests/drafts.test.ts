import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, newTariff } from "../src/lib/domain";
import {
  mergeGuestComparison,
  readGuestDraft,
  writeGuestDraft,
} from "../src/lib/workspace-draft";

const memory = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => {
      entries.set(k, v);
    },
    removeItem: (k: string) => {
      entries.delete(k);
    },
  };
};
test("a guest's browser copy keeps unfinished inputs", () => {
  const storage = memory();
  const data = emptyWorkspace();
  data.profile.peakKwh = "1,";
  assert.equal(writeGuestDraft(storage, data), true);
  assert.deepEqual(readGuestDraft(storage), data);
  assert.equal(readGuestDraft(memory()), null);
});
test("signing in carries guest consumption and offers without replacing the account contract or history", () => {
  const account = emptyWorkspace();
  const current = { ...newTariff(), name: "Saved contract" };
  account.tariffs = [current];
  account.currentId = current.id;
  account.currentSince = "2026-01-01";
  const guest = emptyWorkspace();
  const offer = { ...newTariff(), name: "Draft offer" };
  guest.tariffs = [offer];
  guest.currentId = offer.id;
  guest.profile.days = "29";
  const merged = mergeGuestComparison(account, guest);
  assert.equal(merged.currentId, current.id);
  assert.equal(merged.profile.days, "29");
  assert.deepEqual(merged.tariffs, [current, offer]);
  assert.deepEqual(merged.history, account.history);
  assert.deepEqual(merged.bills, account.bills);
  assert.deepEqual(mergeGuestComparison(merged, guest), merged);
  assert.equal(
    mergeGuestComparison(emptyWorkspace(), guest).currentId,
    offer.id,
  );
});
test("storage failure is reported instead of claiming a draft is saved", () => {
  const storage = {
    ...memory(),
    setItem: () => {
      throw new Error("quota");
    },
  };
  assert.equal(writeGuestDraft(storage, emptyWorkspace()), false);
});

test("legacy drafts discard invoices with tramos and retain ordinary invoices", () => {
  const storage = memory();
  const bill = {
    id: crypto.randomUUID(),
    month: "2026-09",
    provider: "Supplier",
    paid: "10",
    credit: "0",
    kwh: "",
    notes: "Keep me",
    tariff: null,
  };
  storage.setItem(
    "luz:comparison-draft:v1:guest",
    JSON.stringify({
      data: {
        ...emptyWorkspace(),
        bills: [
          bill,
          { ...bill, id: crypto.randomUUID(), priceLines: [] },
          { id: "retired", priceLines: [{ amount: "invalid" }] },
        ],
      },
      version: 8,
    }),
  );
  const draft = readGuestDraft(storage);
  assert.equal(draft?.bills.length, 2);
  assert.ok(draft?.bills.every((b) => !("priceLines" in b)));
  assert.equal(draft?.bills[0].notes, "Keep me");
});
