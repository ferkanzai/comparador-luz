import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  newTariff,
  workspaceSchema,
  type Workspace,
} from "../src/lib/domain";
import { describeWorkspaceIssue, syncStatusLabel } from "../src/lib/sync-status";
import { WorkspaceSync, type SyncSnapshot } from "../src/lib/workspace-sync";

const statuses: SyncSnapshot["status"][] = [
  "local",
  "saved",
  "pending",
  "saving",
  "invalid",
  "error",
  "conflict",
];

test("every sync status has its own label", () => {
  const labels = statuses.map((status) => syncStatusLabel(status, true));
  assert.deepEqual(labels, [
    "Guardado en este dispositivo",
    "Guardado en tu cuenta",
    "Guardado aquí · se enviará a tu cuenta",
    "Sincronizando…",
    "Guardado aquí · no se puede sincronizar",
    "Guardado aquí · sin sincronizar",
    "Guardado aquí · revisa la versión de tu cuenta",
  ]);
  assert.equal(new Set(labels).size, statuses.length);
});

test("a failed local write wins over every status except saved", () => {
  for (const status of statuses)
    assert.equal(
      syncStatusLabel(status, false),
      status === "saved"
        ? "Guardado en tu cuenta"
        : "No se pudo guardar en este dispositivo",
    );
});

const issueFor = (data: Workspace) =>
  describeWorkspaceIssue(data, workspaceSchema.safeParse(data).error?.issues[0]);

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

test("the sync snapshot carries the issue only while invalid", () => {
  const sync = new WorkspaceSync({
    data: emptyWorkspace(),
    version: 1,
    saved: emptyWorkspace(),
    persist: () => true,
    send: async () => 2,
    onChange: () => {},
  });
  sync.update({ ...emptyWorkspace(), tariffs: [newTariff()] });
  assert.equal(sync.snapshot.status, "invalid");
  assert.equal(sync.snapshot.issue, "Revisa la tarifa sin nombre.");
  sync.update(emptyWorkspace());
  assert.equal(sync.snapshot.status, "saved");
  assert.equal(sync.snapshot.issue, "");
  sync.dispose();
});
