"use client";
import FeedbackNotice from "./feedback-notice";
import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Download, ShieldCheck } from "lucide-react";
import {
  newTariff,
  type Bill,
  type Tariff,
  type Workspace,
} from "@/lib/domain";
import { useWorkspace, type InitialWorkspace } from "./use-workspace";
import ComparisonWorkspace from "./comparison-workspace";
import ConfirmDialog from "./confirm-dialog";
import type { TariffRecordDraft } from "./tariff-record-form";
import WorkspaceTabs, { type WorkspaceTab } from "./workspace-tabs";
import WorkspaceStatus from "./workspace-status";
import VerificationBanner from "./verification-banner";
import { AccountRequired, SignupBanner } from "./guest-prompts";
import { usePage } from "./page-context";
import type { CurrentUser } from "@/lib/current-user";
import { downloadWorkspace } from "@/lib/workspace-export";
import {
  duplicateTariff,
  removeTariff,
  saveBill,
  saveTariff,
  type SaveTariffOptions,
} from "@/lib/workspace-actions";

const TariffRecordForm = dynamic(() => import("./tariff-record-form"));
const TariffHistory = dynamic(() => import("./tariff-history"));
const TariffForm = dynamic(() => import("./tariff-form"));
const BillForm = dynamic(() => import("./bill-form"));
const Bills = dynamic(() => import("./bills"), {
  loading: () => (
    <div className="panel loading" role="status">
      Cargando tus facturas…
    </div>
  ),
});

export default function Dashboard({
  user,
  accountsAvailable,
  initialWorkspace,
  hero,
}: {
  user: CurrentUser | null;
  accountsAvailable: boolean;
  initialWorkspace?: InitialWorkspace;
  hero: ReactNode;
}) {
  const workspace = useWorkspace(user?.id, initialWorkspace);
  const { data: w, loaded, loadError, stored, status } = workspace;
  const [busy, setBusy] = useState(false);
  const { message, setMessage, dismiss, error, setError, openMethod } =
    usePage();
  const [tab, setTab] = useState<WorkspaceTab>("compare");
  const navigation = useRef<HTMLElement>(null);
  const previousTab = useRef(tab);
  useEffect(() => {
    if (previousTab.current === tab) return;
    previousTab.current = tab;
    // Wait until closing dialogs have restored the page's scroll lock.
    const frame = requestAnimationFrame(() => {
      navigation.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab]);

  const [billDraft, setBillDraft] = useState<Bill | null>(null);
  const [editing, setEditing] = useState<{
    tariff: Tariff;
    duplicatedFrom?: string;
  } | null>(null);
  const [recordDraft, setRecordDraft] = useState<TariffRecordDraft | null>(
    null,
  );
  const [removingTariffId, setRemovingTariffId] = useState<string | null>(null);
  const removingTariff = w.tariffs.find(
    (tariff) => tariff.id === removingTariffId && tariff.id !== w.currentId,
  );
  function update(next: Workspace) {
    workspace.update(next);
    setMessage("");
    setError("");
  }
  function handleTariffSave(tariff: Tariff, options: SaveTariffOptions) {
    update(saveTariff(w, tariff, options));
    setEditing(null);
    setMessage(
      "Tarifa aplicada. El resultado se actualiza con tu consumo y los impuestos elegidos.",
    );
  }
  return (
    <>
      {user || w.tariffs.length ? (
        <h1 className="workspace-title">Tu espacio de electricidad</h1>
      ) : (
        hero
      )}
      <div className="workspace-bar">
        <WorkspaceTabs ref={navigation} tab={tab} onChange={setTab} />
        <WorkspaceStatus
          loaded={loaded}
          signedIn={Boolean(user)}
          snapshot={workspace}
          onRetry={workspace.retry}
        />
      </div>
      {loaded && (
        <div className="save-strip">
          <span>
            <ShieldCheck size={16} />
            {!user
              ? "Tus datos se guardan automáticamente en este dispositivo."
              : "Los cambios se guardan automáticamente."}
          </span>
          <button
            className="button secondary small-button"
            onClick={() => downloadWorkspace(w)}
          >
            <Download size={15} />
            Exportar
          </button>
        </div>
      )}
      {status === "invalid" && workspace.issue && (
        <div className="notice" role="status">
          No podemos guardar en tu cuenta hasta corregirlo. {workspace.issue}
        </div>
      )}
      {status === "conflict" && (
        <div className="notice">
          Tu cuenta tiene cambios más recientes.{" "}
          {stored
            ? "Tus cambios siguen guardados en este dispositivo."
            : "Tus cambios siguen abiertos en esta pestaña."}{" "}
          Puedes exportarlos antes de cargar la versión de tu cuenta.
          <button
            className="button secondary small-button"
            onClick={workspace.useAccountVersion}
          >
            Cargar versión de mi cuenta
          </button>
        </div>
      )}
      {user && !user.emailVerified && (
        <VerificationBanner
          email={user.email}
          busy={busy}
          onBusyChange={setBusy}
          onSent={setMessage}
          onError={setError}
        />
      )}
      {message && (
        <FeedbackNotice
          key={message.id}
          message={message}
          onDismiss={dismiss}
        />
      )}
      {error && (
        <FeedbackNotice
          message={{ id: 0, text: error, kind: "error" }}
          onDismiss={() => setError("")}
        />
      )}
      {loadError && (
        <div className="notice error" role="alert">
          {loadError}{" "}
          <button className="link-button" onClick={workspace.reload}>
            Reintentar
          </button>
        </div>
      )}
      {!loaded && !loadError && (
        <div className="panel loading" role="status">
          Cargando tus tarifas y facturas…
        </div>
      )}
      {loaded && (
        <fieldset className="workspace-content" disabled={busy}>
          {tab === "compare" ? (
            <>
              <ComparisonWorkspace
                key={`${user?.id ?? "guest"}:${workspace.generation}`}
                data={w}
                onChange={update}
                onAdd={() => setEditing({ tariff: newTariff() })}
                onMethod={openMethod}
                onBill={user ? setBillDraft : undefined}
                actions={{
                  onEdit: (tariff) => setEditing({ tariff }),
                  onDuplicate: (tariff) =>
                    setEditing({
                      tariff: duplicateTariff(tariff),
                      duplicatedFrom: tariff.name,
                    }),
                  onCurrent: (tariff) =>
                    setRecordDraft({
                      tariff,
                      kind: "current",
                      title: "Registrar como actual",
                    }),
                  onHistorical: user
                    ? (tariff) =>
                        setRecordDraft({
                          tariff,
                          kind: "historical",
                          title: "Registrar como anterior",
                        })
                    : undefined,
                  onRemove: (tariff) => setRemovingTariffId(tariff.id),
                }}
              />
              {!user && <SignupBanner />}
            </>
          ) : !user ? (
            <AccountRequired section={tab} />
          ) : tab === "bills" ? (
            <Bills workspace={w} update={update} />
          ) : (
            <TariffHistory
              key={workspace.generation}
              workspace={w}
              update={update}
              onCompare={() => setTab("compare")}
            />
          )}
        </fieldset>
      )}
      {removingTariff && (
        <ConfirmDialog
          title="Eliminar tarifa"
          summary={
            <>
              {removingTariff.provider && (
                <p className="muted">{removingTariff.provider}</p>
              )}
              <h3>{removingTariff.name}</h3>
            </>
          }
          consequence={
            <>
              <p>Esta oferta se eliminará de la comparativa.</p>
              <p className="muted">
                Tus tarifas registradas y tus facturas se conservan.
              </p>
            </>
          }
          confirmLabel="Eliminar tarifa"
          onConfirm={() => {
            update(removeTariff(w, removingTariff.id));
            setRemovingTariffId(null);
          }}
          onClose={() => setRemovingTariffId(null)}
        />
      )}
      {billDraft && (
        <BillForm
          initial={billDraft}
          workspace={w}
          onClose={() => setBillDraft(null)}
          onSave={async (bill, newTariff) => {
            update(saveBill(w, bill, newTariff));
            setBillDraft(null);
            setTab("bills");
            setMessage("Factura añadida, con su consumo y desglose.");
          }}
        />
      )}
      {editing &&
        (editing.tariff.id === w.currentId ? (
          <TariffRecordForm
            workspace={w}
            draft={{
              tariff: editing.tariff,
              kind: "correction",
              periodId: w.currentId!,
              title: "Corregir datos",
            }}
            update={update}
            onClose={() => setEditing(null)}
          />
        ) : (
          <TariffForm
            mode={{
              kind: "offer",
              first:
                !w.currentId &&
                !editing.duplicatedFrom &&
                !w.tariffs.some((t) => t.id === editing.tariff.id),
              duplicatedFrom: editing.duplicatedFrom,
              onSave: handleTariffSave,
            }}
            initial={editing.tariff}
            initialProfile={w.profile}
            onClose={() => setEditing(null)}
          />
        ))}
      {recordDraft && (
        <TariffRecordForm
          workspace={w}
          draft={recordDraft}
          update={update}
          onClose={() => setRecordDraft(null)}
        />
      )}
      {!accountsAvailable && (
        <span className="sr-only">
          La comparación está disponible. Las cuentas requieren configuración.
        </span>
      )}
    </>
  );
}
