"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Download, ShieldCheck } from "lucide-react";
import { newTariff, type Bill, type Tariff } from "@/lib/domain";
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
  type SaveTariffOptions,
} from "@/lib/workspace-actions";
import { commands, type WorkspaceCommand } from "@/lib/workspace-commands";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { panel } from "./bill-styles";
import { cn } from "@/lib/utils";

const loadingPanel = cn(panel, "p-16 text-center");

const TariffRecordForm = dynamic(() => import("./tariff-record-form"));
const TariffHistory = dynamic(() => import("./tariff-history"));
const TariffForm = dynamic(() => import("./tariff-form"));
const BillForm = dynamic(() => import("./bill-form"));
const Bills = dynamic(() => import("./bills"), {
  loading: () => (
    <div className={loadingPanel} role="status">
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
  const { data: w, loaded, loadError, status } = workspace;
  const [busy, setBusy] = useState(false);
  const { setMessage, setError, openMethod } = usePage();
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
  // Returning households skip the hero for their working comparison.
  const titled = Boolean(user || w.tariffs.length);
  function run(command: WorkspaceCommand) {
    workspace.run(command);
  }
  // A form or confirmation opened from a tariff's details takes their place,
  // and brings them back when it's cancelled (codebase-review ticket 26).
  const [detailId, setDetailId] = useState<string | null>(null);
  const returnToDetail = useRef<string | null>(null);
  // What opened the details. Their dialog may reopen after a form, and by then
  // the element it would restore focus to is gone.
  const detailTrigger = useRef<HTMLElement | null>(null);
  function showDetails(id: string | null) {
    if (id && !detailId)
      detailTrigger.current = document.activeElement as HTMLElement | null;
    setDetailId(id);
    if (id) return;
    // Closed for good, unless a form is taking their place.
    requestAnimationFrame(() => {
      if (!returnToDetail.current) detailTrigger.current?.focus();
    });
  }
  const fromDetails = (open: (tariff: Tariff) => void) => (tariff: Tariff) => {
    returnToDetail.current = detailId;
    open(tariff);
  };
  /** After saving, the user moves on: back to the page, not the details. */
  function closeAfterSaving(close: () => void) {
    returnToDetail.current = null;
    close();
  }
  function closeFromDetails(close: () => void) {
    close();
    const id = returnToDetail.current;
    returnToDetail.current = null;
    // Not after a removal, nor when recording gave the tariff a new id.
    if (id && w.tariffs.some((tariff) => tariff.id === id)) setDetailId(id);
  }
  function handleTariffSave(tariff: Tariff, options: SaveTariffOptions) {
    run(commands.saveTariff(tariff, options));
    closeAfterSaving(() => setEditing(null));
    setMessage(
      "Tarifa aplicada. El resultado se actualiza con tu consumo y los impuestos elegidos.",
    );
  }
  return (
    <>
      {titled ? <h1 className="sr-only">Tu espacio de electricidad</h1> : hero}
      <div
        className={cn(
          "mb-7 flex justify-between gap-3 border-b border-border max-[520px]:mb-5",
          titled && "mt-4",
        )}
      >
        <WorkspaceTabs ref={navigation} tab={tab} onChange={setTab} />
        <WorkspaceStatus
          loaded={loaded}
          status={status}
          error={workspace.error}
          onRetry={workspace.reload}
        />
      </div>
      {loaded && (
        <div
          className={cn(
            "-mt-3 mb-6 flex items-center justify-between gap-4 max-[520px]:mt-0 max-[520px]:flex-wrap",
            titled && "mb-4 py-2.5 max-[600px]:flex-row max-[600px]:gap-2.5",
          )}
        >
          <span
            className={cn(
              "flex items-center gap-2 text-sm/[1.6] text-muted-foreground",
              titled && "max-[600px]:text-2xs/[1.6]",
            )}
          >
            <ShieldCheck size={16} className="shrink-0" />
            {!user
              ? "Tus datos se guardan automáticamente en este dispositivo."
              : "Los cambios se guardan automáticamente."}
          </span>
          {/* Signed-in users download their data from the account page. */}
          {!user && (
            <Button
              variant="outline"
              size="sm"

              onClick={() => downloadWorkspace(w)}
            >
              <Download size={15} />
              Exportar
            </Button>
          )}
        </div>
      )}
      {status === "outdated" ? (
        <Alert role="alert">
          Hay una versión nueva de la aplicación. Recarga la página para seguir
          guardando.{" "}
          <Button
            variant="outline"
            size="sm"

            onClick={() => window.location.reload()}
          >
            Recargar
          </Button>
        </Alert>
      ) : (
        // An account's failed saves arrive as toasts; a guest's browser that
        // refuses to store the workspace stays a visible state.
        !user &&
        workspace.error && (
          <Alert variant="destructive" role="alert">
            {workspace.error}
          </Alert>
        )
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
      {loadError && (
        <Alert variant="destructive" role="alert">
          {loadError}{" "}
          <Button variant="link" size="inline" onClick={workspace.reload}>
            Reintentar
          </Button>
        </Alert>
      )}
      {!loaded && !loadError && (
        <div className={loadingPanel} role="status">
          Cargando tus tarifas y facturas…
        </div>
      )}
      {loaded && (
        <fieldset
          className="min-h-[calc(100dvh-160px)] min-w-0 disabled:opacity-70"
          disabled={busy}
        >
          {tab === "compare" ? (
            <>
              <ComparisonWorkspace
                data={w}
                run={run}
                onAdd={() => setEditing({ tariff: newTariff() })}
                onMethod={openMethod}
                onBill={user ? setBillDraft : undefined}
                detailId={detailId}
                onDetails={showDetails}
                actions={{
                  onEdit: fromDetails((tariff) => setEditing({ tariff })),
                  onDuplicate: fromDetails((tariff) =>
                    setEditing({
                      tariff: duplicateTariff(tariff),
                      duplicatedFrom: tariff.name,
                    }),
                  ),
                  onCurrent: fromDetails((tariff) =>
                    setRecordDraft({
                      tariff,
                      kind: "current",
                      title: "Registrar como actual",
                    }),
                  ),
                  onHistorical: user
                    ? fromDetails((tariff) =>
                        setRecordDraft({
                          tariff,
                          kind: "historical",
                          title: "Registrar como anterior",
                        }),
                      )
                    : undefined,
                  onRemove: fromDetails((tariff) =>
                    setRemovingTariffId(tariff.id),
                  ),
                }}
              />
              {!user && <SignupBanner />}
            </>
          ) : !user ? (
            <AccountRequired section={tab} />
          ) : tab === "bills" ? (
            <Bills workspace={w} run={run} />
          ) : (
            <TariffHistory
              workspace={w}
              run={run}
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
                <p className="text-muted-foreground">
                  {removingTariff.provider}
                </p>
              )}
              <h3>{removingTariff.name}</h3>
            </>
          }
          consequence={
            <>
              <p>Esta oferta se eliminará de la comparativa.</p>
              <p className="text-muted-foreground">
                Tus tarifas registradas y tus facturas se conservan.
              </p>
            </>
          }
          confirmLabel="Eliminar tarifa"
          onConfirm={() => {
            run(commands.removeTariff(removingTariff.id));
            // The removed tariff has no details to return to.
            returnToDetail.current = null;
            setRemovingTariffId(null);
          }}
          onClose={() => closeFromDetails(() => setRemovingTariffId(null))}
        />
      )}
      {billDraft && (
        <BillForm
          initial={billDraft}
          workspace={w}
          onClose={() => setBillDraft(null)}
          onSave={async (bill, newTariff) => {
            run(commands.saveBill(bill, newTariff));
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
            run={run}
            onClose={() => closeFromDetails(() => setEditing(null))}
            onSaved={() => closeAfterSaving(() => setEditing(null))}
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
            onClose={() => closeFromDetails(() => setEditing(null))}
          />
        ))}
      {recordDraft && (
        <TariffRecordForm
          workspace={w}
          draft={recordDraft}
          run={run}
          onClose={() => closeFromDetails(() => setRecordDraft(null))}
          onSaved={() => closeAfterSaving(() => setRecordDraft(null))}
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
