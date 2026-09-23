import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, newTariff } from "../src/lib/domain";
import { carryFinalists } from "../src/lib/finalist-selection";
import { recordCurrent } from "../src/lib/tariff-periods";
import { removeTariff } from "../src/lib/workspace-actions";

const workspace = () => {
  const current = { ...newTariff(), name: "Contrato", energyPeak: "0.2" };
  const offer = { ...newTariff(), name: "Oferta", energyPeak: "0.15" };
  const other = { ...newTariff(), name: "Otra", energyPeak: "0.18" };
  return {
    w: {
      ...emptyWorkspace(),
      tariffs: [current, offer, other],
      currentId: current.id,
      currentSince: "2025-01-01",
    },
    current,
    offer,
    other,
  };
};

test("promoting a selected offer to current contract keeps it among the finalists", () => {
  const { w, offer, other } = workspace();
  const after = recordCurrent(w, offer, "2025-06-01");
  assert.deepEqual(carryFinalists([offer.id, other.id], w, after), [
    after.currentId!,
    other.id,
  ]);
});

test("a selected former contract and promoted offer collapse into one finalist", () => {
  const { w, current, offer } = workspace();
  const after = recordCurrent(w, offer, "2025-06-01");
  assert.deepEqual(carryFinalists([current.id, offer.id], w, after), [
    after.currentId!,
  ]);
});

test("a price change keeps the current contract selected", () => {
  const { w, current, other } = workspace();
  const after = recordCurrent(
    w,
    { ...current, energyPeak: "0.25" },
    "2025-06-01",
  );
  assert.deepEqual(carryFinalists([current.id, other.id], w, after), [
    after.currentId!,
    other.id,
  ]);
});

test("removing an offer still drops it from the finalists", () => {
  const { w, current, offer } = workspace();
  const after = removeTariff(w, offer.id);
  assert.deepEqual(carryFinalists([current.id, offer.id], w, after), [
    current.id,
  ]);
});
