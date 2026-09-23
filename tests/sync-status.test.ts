import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  newTariff,
  workspaceSchema,
  type Workspace,
} from "../src/lib/domain";
import {
  describeWorkspaceIssue,
  saveStatusLabel,
  type SaveStatus,
} from "../src/lib/sync-status";

const statuses: SaveStatus[] = [
  "local",
  "saved",
  "saving",
  "invalid",
  "error",
  "outdated",
];

test("every save status has its own label", () => {
  const labels = statuses.map(saveStatusLabel);
  assert.equal(new Set(labels).size, statuses.length);
  assert.equal(saveStatusLabel("saved"), "Guardado en tu cuenta");
  assert.equal(saveStatusLabel("local"), "Guardado en este dispositivo");
});

const issueFor = (data: Workspace) =>
  describeWorkspaceIssue(
    data,
    workspaceSchema.safeParse(data).error?.issues[0],
  );

test("invalid workspaces name the record to fix", () => {
  const tariff = { ...newTariff(), name: "Luz Fija", energyPeak: "abc" };
  assert.equal(
    issueFor({ ...emptyWorkspace(), tariffs: [tariff] }),
    "Revisa la tarifa «Luz Fija».",
  );
  assert.equal(
    issueFor({ ...emptyWorkspace(), tariffs: [newTariff()] }),
    "Revisa la tarifa sin nombre.",
  );
  assert.equal(
    issueFor({
      ...emptyWorkspace(),
      profile: { ...emptyWorkspace().profile, days: "999" },
    }),
    "Revisa el perfil de consumo.",
  );
  const tooMany = Array.from({ length: 101 }, (_, i) => ({
    ...newTariff(),
    name: `T${i}`,
  }));
  assert.equal(
    issueFor({ ...emptyWorkspace(), tariffs: tooMany }),
    "Hay demasiadas tarifas (máximo 100). Elimina alguna para volver a sincronizar.",
  );
  assert.equal(
    issueFor({ ...emptyWorkspace(), currentId: crypto.randomUUID() }),
    "La tarifa actual no existe.",
  );
  assert.equal(describeWorkspaceIssue(emptyWorkspace(), undefined), "");
});
