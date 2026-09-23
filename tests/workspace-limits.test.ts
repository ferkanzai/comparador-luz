import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  maxWorkspaceRequestBytes,
  newTariff,
  workspaceSchema,
} from "../src/lib/domain";
import { normalizeWorkspaceStorage } from "../src/lib/workspace-records";
import { maxCountWorkspace } from "./fixtures/max-workspace";

test("a workspace at every list maximum fits the save request limit", () => {
  const workspace = maxCountWorkspace();
  assert.equal(workspaceSchema.safeParse(workspace).success, true);
  const bytes = Buffer.byteLength(JSON.stringify({ data: workspace, version: 1 }));
  assert.ok(
    bytes < maxWorkspaceRequestBytes * 0.75,
    `${bytes} bytes leaves too little margin under ${maxWorkspaceRequestBytes}`,
  );
});

test("storage normalization keeps a validated workspace valid", () => {
  const tariff = {
    ...newTariff(),
    id: crypto.randomUUID().toUpperCase(),
    name: "Comas",
    energyPeak: "0,1234",
    powerPeak: "007",
    meterDay: "0",
  };
  const input = workspaceSchema.parse({
    ...emptyWorkspace(),
    tariffs: [tariff],
    currentId: tariff.id,
  });
  const normalized = normalizeWorkspaceStorage(input);
  assert.equal(normalized.tariffs[0].energyPeak, "0.1234");
  assert.equal(normalized.tariffs[0].powerPeak, "7");
  assert.equal(normalized.currentId, tariff.id.toLowerCase());
  assert.deepEqual(workspaceSchema.parse(normalized), normalized);
});
