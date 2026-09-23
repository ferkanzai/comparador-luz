"use client";
import FeedbackNotice, { useFeedback } from "./feedback-notice";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Download,
  ExternalLink,
  History,
  LogOut,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import {
  newTariff,
  today,
  type Bill,
  type Profile,
  type Tariff,
  type Workspace,
} from "@/lib/domain";
import { Brand, Empty, Modal } from "./ui";
import { useWorkspace, type InitialWorkspace } from "./use-workspace";
import ComparisonWorkspace from "./comparison-workspace";
import ConfirmDialog from "./confirm-dialog";
import type { TariffRecordDraft } from "./tariff-record-form";
import {
  duplicateTariff,
  removeTariff,
  saveBill,
  saveTariff,
} from "@/lib/workspace-actions";
import { syncStatusLabel } from "@/lib/sync-status";
import {
  electricityTax,
  formatRate,
  generalVat,
  regulatedRatesReviewedLabel,
} from "@/lib/regulated-rates";

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

type Tab = "compare" | "history" | "bills";
export default function Dashboard({
  user,
  accountsAvailable,
  initialWorkspace,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  } | null;
  accountsAvailable: boolean;
  initialWorkspace?: InitialWorkspace;
}) {
  const workspace = useWorkspace(user?.id, initialWorkspace);
  const { data: w, loaded, loadError, stored, status } = workspace;
  const [busy, setBusy] = useState(false);
  const { message, setMessage, dismiss } = useFeedback();
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("compare");
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
  const [taxHelp, setTaxHelp] = useState(false);
  const [removingTariffId, setRemovingTariffId] = useState<string | null>(null);
  const removingTariff = w.tariffs.find(
    (tariff) => tariff.id === removingTariffId && tariff.id !== w.currentId,
  );
  function update(next: Workspace) {
    workspace.update(next);
    setMessage("");
    setError("");
  }
  function handleTariffSave(
    tariff: Tariff,
    since: string,
    profile: Profile,
    makeCurrent: boolean,
  ) {
    update(saveTariff(w, tariff, { since, profile, makeCurrent }));
    setEditing(null);
    setMessage(
      "Tarifa aplicada. El resultado se actualiza con tu consumo y los impuestos elegidos.",
    );
  }
  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), ...w }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luz-en-claro-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <span className="header-tag">TU ELECTRICIDAD, BAJO CONTROL</span>
          <div className="header-actions">
            {user ? (
              <>
                <span className="user-name">
                  Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
                </span>
                <button
                  className="icon-button"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const { authClient } = await import("@/lib/auth-client");
                      const result = await authClient.signOut();
                      if (result.error) throw new Error();
                      window.location.assign("/");
                    } catch {
                      setError(
                        "No se ha podido cerrar sesión. Inténtalo de nuevo.",
                      );
                    }
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link
                  className="text-link login-link"
                  href="/cuenta"
                  aria-label="Iniciar sesión"
                >
                  <span className="login-label-desktop">Iniciar sesión</span>
                  <span className="login-label-mobile">Entrar</span>
                </Link>
                <Link
                  className="button dark small-button"
                  href="/cuenta?mode=signup"
                >
                  Crear cuenta
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="shell">
        {user || w.tariffs.length ? (
          <h1 className="workspace-title">Tu espacio de electricidad</h1>
        ) : (
          <section className="hero">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> TU ENERGÍA. TUS NÚMEROS.
              </div>
              <h1>
                Que tu próxima factura <br />
                traiga <span>una buena noticia.</span>
              </h1>
              <p>
                Compara con lo que consumes. Entiende lo que pagas.
                <br className="desktop-break" /> Y elige cuándo te compensa
                cambiar.
              </p>
            </div>
            <div className="hero-note">
              <div className="note-mark">
                <Zap size={21} />
              </div>
              <span className="eyebrow">UN HÁBITO QUE SUMA</span>
              <p>
                Un café.
                <br />
                Una comparativa.
                <br />
                <strong>Una decisión mejor.</strong>
              </p>
              <div className="small">
                Tu revisión semanal de la luz <ArrowDownRight size={16} />
              </div>
            </div>
          </section>
        )}
        <div className="workspace-bar">
          <nav ref={navigation} aria-label="Secciones del comparador">
            <button
              aria-current={tab === "compare" ? "page" : undefined}
              className={tab === "compare" ? "active" : ""}
              onClick={() => setTab("compare")}
            >
              <SlidersHorizontal size={17} />
              Comparador
            </button>
            <button
              aria-current={tab === "history" ? "page" : undefined}
              className={tab === "history" ? "active" : ""}
              onClick={() => setTab("history")}
            >
              <History size={17} />
              Mis tarifas
            </button>
            <button
              aria-current={tab === "bills" ? "page" : undefined}
              className={tab === "bills" ? "active" : ""}
              onClick={() => setTab("bills")}
            >
              <Receipt size={17} />
              Mis facturas
            </button>
          </nav>
          <span
            className="workspace-status"
            title={workspace.error || workspace.issue || undefined}
          >
            <span
              className={`status-dot ${user && status !== "saved" ? "unsaved" : ""}`}
            />
            {loaded ? syncStatusLabel(status, stored) : "Cargando…"}
            {status === "error" && (
              <button className="link-button" onClick={workspace.retry}>
                Reintentar
              </button>
            )}
          </span>
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
              onClick={exportData}
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
          <div className="notice verification-banner">
            <span>
              Ya estás dentro. Te hemos enviado un correo para confirmar tu
              dirección.
            </span>
            <button
              type="button"
              className="link-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { authClient } = await import("@/lib/auth-client");
                  const result = await authClient.sendVerificationEmail({
                    email: user.email,
                    callbackURL: `${window.location.origin}/`,
                  });
                  if (result.error) throw new Error();
                  setMessage(
                    "Correo enviado. Revisa también la carpeta de spam.",
                  );
                } catch {
                  setError(
                    "No se ha podido enviar el correo. Espera un minuto y vuelve a intentarlo.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reenviar correo
            </button>
          </div>
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
                  onMethod={() => setTaxHelp(true)}
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
                {!user && (
                  <section className="signup-banner">
                    <div className="signup-icon">
                      <History size={25} />
                    </div>
                    <div>
                      <h3>Tus datos, también en otros dispositivos.</h3>
                      <p>
                        Crea una cuenta para sincronizar tus tarifas y seguir
                        tus facturas mes a mes. Sin cuenta, tu comparación se
                        conserva en este navegador.
                      </p>
                    </div>
                    <Link href="/cuenta?mode=signup" className="button dark">
                      Crear mi cuenta
                      <ArrowRight size={17} />
                    </Link>
                  </section>
                )}
              </>
            ) : !user ? (
              <div className="panel">
                <Empty
                  icon={
                    tab === "history" ? (
                      <History size={27} />
                    ) : (
                      <Receipt size={27} />
                    )
                  }
                  title={
                    tab === "history"
                      ? "Tu historia con la luz, en un solo lugar."
                      : "Pon tus facturas en perspectiva."
                  }
                  action={
                    <Link className="button primary" href="/cuenta?mode=signup">
                      Crear una cuenta
                      <ArrowRight size={16} />
                    </Link>
                  }
                >
                  Inicia sesión para guardar tus tarifas y registrar lo que
                  pagas cada mes. El comparador es libre y no necesita cuenta.
                </Empty>
              </div>
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
        <footer className="site-footer">
          <span>
            <Zap size={13} /> Luz en claro{" "}
            <span className="footer-separator">/</span> Entender también es
            ahorrar.
          </span>
          <div>
            <button className="link-button" onClick={() => setTaxHelp(true)}>
              Método y fuentes
            </button>
            <span>Hecho para hogares en España</span>
          </div>
        </footer>
      </main>
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
            initial={editing.tariff}
            duplicatedFrom={editing.duplicatedFrom}
            initialProfile={w.profile}
            firstTariff={
              !w.currentId &&
              !editing.duplicatedFrom &&
              !w.tariffs.some((t) => t.id === editing.tariff.id)
            }
            onSave={handleTariffSave}
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
      {taxHelp && (
        <Modal
          title="Sin letra pequeña en el cálculo"
          onClose={() => setTaxHelp(false)}
        >
          <div className="modal-body method">
            <p>
              Estimación para hogares 2.0TD de Península y Baleares con precios
              fijos o por períodos, siempre introducidos sin impuestos.
            </p>
            <ol>
              <li>
                <strong>Energía:</strong> kWh de cada período × su precio.
              </li>
              <li>
                <strong>Potencia:</strong> kW contratados × precio × días. Los
                precios anuales se dividen entre 365; los mensuales se dividen
                entre 30. Un precio total de potencia se aplica una sola vez; un
                precio por período se aplica por separado a punta y valle.
              </li>
              <li>
                <strong>Financiación del bono social:</strong> cargo diario de
                tu contrato. Por defecto se incluye en la base del IEE; puedes
                ajustar este tratamiento por tarifa para reproducir tu factura.
                No es el descuento para beneficiarios del bono social.
              </li>
              <li>
                <strong>Coste SNOEE:</strong> consumo total × precio por kWh
                indicado en tu contrato, solo si no está incluido en los precios
                de energía. No es un impuesto y se mantiene al desactivar los
                impuestos. La referencia PVPC ya incluye su aportación regulada.
              </li>
              <li>
                <strong>IEE:</strong> (energía + potencia + coste SNOEE +
                financiación bono social, si está incluida en esta tarifa) ×
                tipo indicado, con mínimo doméstico opcional de{" "}
                {formatRate(electricityTax.minimumPerKwh)} €/kWh. El
                alquiler del contador y los servicios no forman parte de esta
                base.
              </li>
              <li>
                <strong>IVA:</strong> se aplica al suministro, incluido el IEE y
                el alquiler del contador. Los servicios de mantenimiento se
                calculan por separado al {formatRate(generalVat.percent)} %.
              </li>
            </ol>
            <p>
              Puedes estimar el alquiler y la financiación del bono social al
              editar una tarifa. Guardamos el valor de referencia elegido y
              marcamos el cálculo como aproximado. Comprueba si tu contrato ya
              incluye esos cargos antes de añadirlos.
            </p>
            <p>
              Los costes mensuales de servicios se prorratean a 12 × días / 365.
              Los importes se redondean a céntimos por concepto. Si tu factura
              muestra precios redondeados, usa «Calcular precios desde los
              importes» al editar la tarifa. Tu factura puede tener diferencias
              de redondeo.
            </p>
            <p>
              Tipos generales de referencia: IVA{" "}
              {formatRate(generalVat.percent)} % e IEE{" "}
              {formatRate(electricityTax.percent)} %. Revisión:{" "}
              {regulatedRatesReviewedLabel}. Usa los tipos de tu factura para
              períodos
              con medidas temporales. No se aplica automáticamente un tipo por
              fecha.
            </p>
            <p>
              PVPC se muestra aparte como referencia histórica con medias por
              período del último mes completo; no reconstruye tu factura horaria
              ni predice precios futuros. No simula compensación solar,
              descuentos del bono social, IGIC, IPSI, penalizaciones ni
              promociones temporales. Introduce precios netos de descuentos y
              comprueba permanencias antes de cambiar.
            </p>
            <div className="source-links">
              <a
                href="https://www.miteco.gob.es/es/energia/eficiencia/sistema-nacional-obligaciones-efe.html"
                target="_blank"
                rel="noreferrer"
              >
                MITECO · SNOEE
                <ExternalLink size={14} />
              </a>
              <a
                href={electricityTax.rateSource}
                target="_blank"
                rel="noreferrer"
              >
                AEAT · Impuesto eléctrico
                <ExternalLink size={14} />
              </a>
              <a
                href={electricityTax.source}
                target="_blank"
                rel="noreferrer"
              >
                BOE · Ley 38/1992, artículos 97 y 99
                <ExternalLink size={14} />
              </a>
              <a
                href="https://www.cnmc.es/prensa/entiende-tu-factura-20231002"
                target="_blank"
                rel="noreferrer"
              >
                CNMC · Entiende tu factura
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </Modal>
      )}
      {!accountsAvailable && (
        <span className="sr-only">
          La comparación está disponible. Las cuentas requieren configuración.
        </span>
      )}
    </>
  );
}
