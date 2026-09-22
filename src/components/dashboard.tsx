"use client";
import FeedbackNotice, { useFeedback } from "./feedback-notice";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  ExternalLink,
  History,
  Leaf,
  LogOut,
  Pencil,
  Plus,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Zap,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { calculate, type Calculation } from "@/lib/calculator";
import {
  changeCurrent,
  comparablePowerPrice,
  formatPowerPrice,
  money,
  newTariff,
  numberOf,
  powerDescription,
  powerUnitLabels,
  shortDate,
  today,
  type Bill,
  type Profile,
  type Tariff,
  type Workspace,
} from "@/lib/domain";
import { Brand, Empty, Field, Modal } from "./ui";
import TariffForm from "./tariff-form";
import EstimateNotice from "./estimate-notice";
import PvpcComparison from "./pvpc-comparison";
import { estimatedCharges } from "@/lib/charge-estimates";
import { ProfileFields, TaxFields } from "./profile-fields";
import Bills from "./bills";
import BillForm from "./bill-form";
import { useWorkspace } from "./use-workspace";
import { usePowerComparisonUnit } from "./use-power-comparison-unit";
import { billFromCalculation, billLines } from "@/lib/bill-data";

type Tab = "compare" | "history" | "bills";
export default function Dashboard({
  user,
  accountsAvailable,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  } | null;
  accountsAvailable: boolean;
}) {
  const workspace = useWorkspace(user?.id);
  const { data: w, loaded, loadError, stored, status } = workspace;
  const [busy, setBusy] = useState(false);
  const { message, setMessage, dismiss } = useFeedback();
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("compare");
  const [billDraft, setBillDraft] = useState<Bill | null>(null);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const [switchDate, setSwitchDate] = useState(today);
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [taxHelp, setTaxHelp] = useState(false);
  function update(next: Workspace) {
    workspace.update(next);
    setMessage("");
    setError("");
  }
  function saveTariff(
    tariff: Tariff,
    since: string,
    nextProfile: Profile,
    makeCurrent: boolean,
  ) {
    const old = w.tariffs.find((t) => t.id === tariff.id);
    const isCurrent = old && old.id === w.currentId;
    update({
      ...w,
      tariffs: old
        ? w.tariffs.map((t) => (t.id === tariff.id ? tariff : t))
        : [...w.tariffs, tariff],
      history: isCurrent
        ? [
            ...w.history,
            {
              id: crypto.randomUUID(),
              tariff: structuredClone(old),
              start: w.currentSince || since,
              end: since,
            },
          ]
        : w.history,
      profile: nextProfile,
      currentId: makeCurrent && !w.currentId ? tariff.id : w.currentId,
      currentSince:
        isCurrent || (makeCurrent && !w.currentId) ? since : w.currentSince,
    });
    setEditing(null);
    setMessage(
      "Tarifa aplicada. El resultado se actualiza con tu consumo y los impuestos elegidos.",
    );
  }
  function confirmPrices(id?: string) {
    if (!w.tariffs.some((t) => !t.checkedOn && (!id || t.id === id))) return;
    const next = {
      ...w,
      reviewedOn: id ? w.reviewedOn : today(),
      tariffs: w.tariffs.map((t) =>
        !t.checkedOn && (!id || t.id === id) ? { ...t, checkedOn: today() } : t,
      ),
    };
    update(next);
    setMessage(
      id
        ? "Precios confirmados hoy."
        : "Precios pendientes confirmados a día de hoy.",
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
  const current = w.tariffs.find((t) => t.id === w.currentId);
  const [powerComparisonUnit, setPowerComparisonUnit] = usePowerComparisonUnit(
    current?.powerUnit ?? "day",
  );
  const unequalPower =
    w.profile.peakKw !== "" &&
    w.profile.valleyKw !== "" &&
    numberOf(w.profile.peakKw) !== numberOf(w.profile.valleyKw);
  const results = w.tariffs
    .flatMap((t) => {
      const cost = calculate(t, w.profile);
      return cost &&
        (!t.validUntil || t.validUntil >= today() || t.id === w.currentId)
        ? [{ tariff: t, cost }]
        : [];
    })
    .sort((a, b) => a.cost.total - b.cost.total);
  const baseline = results.find((r) => r.tariff.id === w.currentId);
  const best = results[0];
  const saving =
    baseline && best ? Math.max(0, baseline.cost.total - best.cost.total) : 0;
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
        <div className="workspace-bar">
          <nav aria-label="Secciones del comparador">
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
            title={workspace.error || undefined}
          >
            <span
              className={`status-dot ${user && status !== "saved" ? "unsaved" : ""}`}
            />
            {!loaded
              ? "Cargando…"
              : status === "saved"
                ? "Guardado en tu cuenta"
                : !stored
                  ? "No se pudo guardar en este dispositivo"
                  : status === "local"
                    ? "Guardado en este dispositivo"
                    : status === "conflict"
                      ? "Guardado aquí · revisa la versión de tu cuenta"
                      : status === "error"
                        ? "Guardado aquí · sin sincronizar"
                        : status === "invalid"
                          ? "Guardado aquí · completa los datos para sincronizar"
                          : status === "saving"
                            ? "Sincronizando…"
                            : "Guardado aquí · pendiente de sincronizar"}
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
                : w.reviewedOn
                  ? `Última revisión: ${shortDate(w.reviewedOn)}`
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
                <div className="comparison-layout">
                  <div className="comparison-main">
                    <section className="panel consumption">
                      <div className="panel-heading">
                        <div>
                          <SlidersHorizontal size={20} aria-hidden="true" />
                          <h2>Tu consumo y tus impuestos</h2>
                        </div>
                        <span className="pill neutral">2.0TD · Hogar</span>
                      </div>
                      <p className="muted">
                        Usaremos estos datos para todas las tarifas. También
                        puedes completarlos al añadir tu tarifa actual.
                      </p>
                      <ProfileFields
                        value={w.profile}
                        onChange={(profile) => update({ ...w, profile })}
                      />
                      <button
                        className="tax-toggle"
                        onClick={() => setTaxesOpen(!taxesOpen)}
                        aria-expanded={taxesOpen}
                      >
                        <span>
                          <SlidersHorizontal size={16} />
                          Impuestos y cálculo completo
                          <span
                            className={`pill ${w.profile.taxes ? "green" : "neutral"}`}
                          >
                            {w.profile.taxes
                              ? "Con impuestos"
                              : "Sin impuestos"}
                          </span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={taxesOpen ? "rotate" : ""}
                        />
                      </button>
                      {taxesOpen && (
                        <div className="tax-panel">
                          <TaxFields
                            value={w.profile}
                            onChange={(profile) => update({ ...w, profile })}
                          />
                          <button
                            className="text-link"
                            onClick={() => setTaxHelp(true)}
                          >
                            <CircleHelp size={15} />
                            Cómo calculamos los impuestos
                          </button>
                        </div>
                      )}
                      {user && (
                        <div className="consumption-bill-action">
                          <button
                            className="button secondary full"
                            disabled={!baseline}
                            onClick={() => {
                              if (baseline)
                                setBillDraft(
                                  billFromCalculation(
                                    baseline.tariff,
                                    w.profile,
                                    baseline.cost,
                                  ),
                                );
                            }}
                          >
                            <Receipt size={17} /> Guardar este periodo como
                            factura
                          </button>
                          <p className="small muted">
                            {baseline
                              ? "Revisa el total real antes de añadirlo a tu historial."
                              : "Añade tu tarifa actual y completa los datos para copiar el consumo y el desglose."}
                          </p>
                        </div>
                      )}
                    </section>
                    <section className="tariffs-section">
                      <div className="section-heading compact">
                        <div className="heading-number">
                          <Zap size={20} aria-hidden="true" />
                          <h2>Tus tarifas, frente a frente</h2>
                        </div>
                        <button
                          className="button secondary small-button"
                          onClick={() => setEditing(newTariff())}
                        >
                          <Plus size={16} />
                          Añadir tarifa
                        </button>
                      </div>
                      {w.tariffs.length > 0 && (
                        <div className="power-comparison-controls">
                          <label className="inline-label">
                            Comparar potencia en
                            <select
                              value={powerComparisonUnit}
                              aria-describedby="power-comparison-convention"
                              onChange={(event) => {
                                const unit = event.target.value;
                                if (
                                  unit === "day" ||
                                  unit === "month" ||
                                  unit === "year"
                                )
                                  setPowerComparisonUnit(unit);
                              }}
                            >
                              <option value="day">€/kW/día</option>
                              <option value="month">€/kW/mes</option>
                              <option value="year">€/kW/año</option>
                            </select>
                          </label>
                          <span
                            id="power-comparison-convention"
                            className="small muted"
                          >
                            Mes = 30 días · Año = 365 días
                          </span>
                        </div>
                      )}
                      {!w.tariffs.length ? (
                        <div className="panel">
                          <Empty
                            icon={<Zap size={26} />}
                            title="Empecemos por tu tarifa actual."
                            action={
                              <button
                                className="button primary"
                                onClick={() => setEditing(newTariff())}
                              >
                                <Plus size={16} />
                                Añadir mi primera tarifa
                              </button>
                            }
                          >
                            Ten tu última factura a mano. Añade tus precios y
                            después las ofertas que quieras comparar.
                          </Empty>
                        </div>
                      ) : (
                        <div className="tariff-list">
                          {w.tariffs.map((tariff, i) => (
                            <TariffCard
                              key={tariff.id}
                              tariff={tariff}
                              current={tariff.id === w.currentId}
                              powerComparisonUnit={powerComparisonUnit}
                              unequalPower={unequalPower}
                              index={i}
                              onReview={() => confirmPrices(tariff.id)}
                              onEdit={() => setEditing(tariff)}
                              onSelect={() => {
                                setSwitchTo(tariff.id);
                                setSwitchDate(today());
                              }}
                              onRemove={() => {
                                if (
                                  window.confirm(
                                    `¿Eliminar ${tariff.name} de la comparativa?`,
                                  )
                                )
                                  update({
                                    ...w,
                                    tariffs: w.tariffs.filter(
                                      (t) => t.id !== tariff.id,
                                    ),
                                  });
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                    <PvpcComparison profile={w.profile} current={current} />
                  </div>
                  <aside className="results-column">
                    <section className="results-panel">
                      <div className="section-inline">
                        <span className="eyebrow">LA FOTO COMPLETA</span>
                        <BarChart3 size={20} />
                      </div>
                      <h2>Los números hablan.</h2>
                      <p className="small">
                        {results.length
                          ? `${w.profile.days} días · ${w.profile.taxes ? "Con impuestos" : "Sin impuestos"}`
                          : "Tu próxima oportunidad de ahorro empieza aquí."}
                      </p>
                      {!results.length ? (
                        <div className="result-empty">
                          <div className="estimate-placeholder">
                            —<span> €</span>
                          </div>
                          <p>
                            Añade una tarifa y completa tu consumo, potencia y
                            días
                            {w.profile.taxes
                              ? ", junto con los tipos de impuestos,"
                              : ""}{" "}
                            para ver el resultado.
                          </p>
                          <span>
                            <ShieldCheck size={15} />
                            Tus datos, con los supuestos a la vista
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="result-summary">
                            <span>
                              {baseline
                                ? saving > 0
                                  ? "Podrías ahorrar este periodo"
                                  : "Tu tarifa actual, este periodo"
                                : "El menor coste del periodo"}
                            </span>
                            <div className="result-amount">
                              {money(
                                baseline && saving > 0
                                  ? saving
                                  : (baseline?.cost.total ?? best.cost.total),
                              )}
                            </div>
                            <span>
                              {baseline && saving > 0
                                ? `con ${best.tariff.name}`
                                : best.tariff.name}
                            </span>
                          </div>
                          {(estimatedCharges(best.tariff) ||
                            (baseline &&
                              estimatedCharges(baseline.tariff))) && (
                            <p className="estimate-note small">
                              Costes y ahorro aproximados: hay cargos estimados
                              en las tarifas comparadas.
                            </p>
                          )}
                          {user && baseline && (
                            <button
                              className="button bill-save full"
                              onClick={() =>
                                setBillDraft(
                                  billFromCalculation(
                                    baseline.tariff,
                                    w.profile,
                                    baseline.cost,
                                  ),
                                )
                              }
                            >
                              <Receipt size={18} /> Guardar como factura
                            </button>
                          )}
                          {results.map((r, i) => (
                            <ResultRow
                              key={r.tariff.id}
                              tariff={r.tariff}
                              cost={r.cost}
                              current={r.tariff.id === w.currentId}
                              best={i === 0 && results.length > 1}
                              max={Math.max(
                                ...results.map((r) => r.cost.total),
                                1,
                              )}
                              baseline={baseline?.cost.total}
                            />
                          ))}
                          {baseline && results.length > 1 && (
                            <div className="annual-saving">
                              <Leaf size={18} />
                              <div>
                                <strong>
                                  {saving > 0
                                    ? `${money((saving * 365) / baseline.cost.days)} / año`
                                    : "Ya tienes la tarifa más barata"}
                                </strong>
                                <span>
                                  {saving > 0
                                    ? "Ahorro extrapolado si mantienes este consumo y precios todo el año. No es una previsión."
                                    : "Entre las tarifas que has comparado, ninguna mejora tu precio actual para este consumo."}
                                </span>
                              </div>
                            </div>
                          )}
                          {!baseline && (
                            <p className="result-footnote">
                              Marca tu tarifa actual para calcular cuánto
                              ahorrarías al cambiar.
                            </p>
                          )}
                          {results.length < w.tariffs.length && (
                            <p className="result-footnote">
                              Las tarifas incompletas o con ofertas caducadas no
                              entran en el ranking.
                            </p>
                          )}
                        </>
                      )}
                      <div className="results-footer">
                        <span className="status-dot" />
                        Se recalcula con cada cambio
                      </div>
                    </section>
                    <div className="weekly-card">
                      <div className="section-inline">
                        <span className="eyebrow">TU REVISIÓN SEMANAL</span>
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </div>
                      <h3>¿Hay algo mejor ahí fuera?</h3>
                      <p>
                        Busca una oferta, copia sus precios y comprueba si te
                        compensa con tu consumo. Si una tarifa aún no tiene
                        fecha de confirmación, añádela tras comprobar sus
                        precios.
                      </p>
                      <a
                        className="text-link"
                        href="https://comparador.cnmc.gob.es/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Explorar ofertas en la CNMC
                        <ExternalLink size={14} />
                      </a>
                      {user && w.tariffs.some((t) => !t.checkedOn) && (
                        <button
                          className="button secondary full small-button"
                          onClick={() => confirmPrices()}
                        >
                          <Check size={15} /> Confirmar precios pendientes
                        </button>
                      )}
                    </div>
                  </aside>
                </div>
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
              <>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">CADA CAMBIO CUENTA</span>
                    <h2>Tu recorrido, tarifa a tarifa.</h2>
                    <p className="muted">
                      Al cambiar de compañía o editar tus precios actuales,
                      guardamos una copia de los anteriores.
                    </p>
                  </div>
                </div>
                {current && (
                  <div className="panel current-history">
                    <span className="pill green">Tu tarifa actual</span>
                    <h3>{current.name}</h3>
                    <p>
                      {current.provider} · Desde {shortDate(w.currentSince)}
                    </p>
                    <button
                      className="text-link"
                      onClick={() => setEditing(current)}
                    >
                      Actualizar precios
                      <Pencil size={15} />
                    </button>
                  </div>
                )}
                {!w.history.length ? (
                  <div className="panel">
                    <Empty
                      icon={<History size={26} />}
                      title="Cada nueva etapa quedará aquí."
                    >
                      Marca una tarifa como actual en el comparador. Cuando
                      cambies tus precios, podrás volver a consultar los
                      anteriores.
                    </Empty>
                  </div>
                ) : (
                  <div className="history-list">
                    {[...w.history].reverse().map((h) => (
                      <article className="panel history-item" key={h.id}>
                        <div className="history-date">
                          {shortDate(h.start)}
                          <span>hasta {shortDate(h.end)} (cambio)</span>
                        </div>
                        <div>
                          <h3>{h.tariff.name}</h3>
                          <p className="muted">{h.tariff.provider}</p>
                          <EstimateNotice tariff={h.tariff} />
                          <p className="small">
                            {h.tariff.kind === "fixed"
                              ? `${h.tariff.energyPeak} €/kWh · Precio único`
                              : `P1 ${h.tariff.energyPeak} · P2 ${h.tariff.energyFlat} · P3 ${h.tariff.energyValley} €/kWh`}
                          </p>
                          <details>
                            <summary className="small">
                              Ver todos los precios
                            </summary>
                            <p className="small">
                              Potencia: {powerDescription(h.tariff)}
                              <br />
                              Alquiler: {h.tariff.meterDay || "0"} €/día · Bono
                              social: {h.tariff.socialDay || "0"} €/día · Coste
                              SNOEE: {h.tariff.snoeeKwh || "0"} €/kWh ·{" "}
                              Servicios: {h.tariff.servicesMonth || "0"} €/mes
                            </p>
                            <p className="small muted">{h.tariff.notes}</p>
                          </details>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
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
      {billDraft && (
        <BillForm
          initial={billDraft}
          workspace={w}
          onClose={() => setBillDraft(null)}
          onSave={async (bill, newTariff) => {
            update({
              ...w,
              tariffs: newTariff ? [...w.tariffs, newTariff] : w.tariffs,
              bills: [...w.bills, bill],
            });
            setBillDraft(null);
            setTab("bills");
            setMessage("Factura añadida, con su consumo y desglose.");
          }}
        />
      )}
      {editing && (
        <TariffForm
          initial={editing}
          initialProfile={w.profile}
          firstTariff={!w.currentId}
          isCurrent={editing.id === w.currentId}
          currentSince={w.currentSince}
          onSave={saveTariff}
          onClose={() => setEditing(null)}
        />
      )}
      {switchTo && (
        <Modal
          title="Tu nueva tarifa de referencia"
          onClose={() => setSwitchTo(null)}
        >
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                update(changeCurrent(w, switchTo, switchDate));
                setSwitchTo(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Revisa la fecha.");
              }
            }}
          >
            <p>
              Compararemos las ofertas con{" "}
              <strong>{w.tariffs.find((t) => t.id === switchTo)?.name}</strong>.{" "}
              {current &&
                "Los precios de tu tarifa anterior quedarán en el historial."}
            </p>
            <Field
              label="Fecha de inicio"
              type="date"
              value={switchDate}
              onChange={setSwitchDate}
              required
            />
            <p className="small muted">
              Esta acción solo cambia tu referencia en el comparador. No
              contrata ni cambia tu compañía.
            </p>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button className="button primary" type="submit">
                Usar como tarifa actual
              </button>
            </div>
          </form>
        </Modal>
      )}
      {taxHelp && (
        <Modal
          title="Sin letra pequeña en el cálculo"
          onClose={() => setTaxHelp(false)}
        >
          <div className="modal-body method">
            <p>
              Estimación para hogares 2.0TD de Península y Baleares con precios
              fijos o por periodos, siempre introducidos sin impuestos.
            </p>
            <ol>
              <li>
                <strong>Energía:</strong> kWh de cada periodo × su precio.
              </li>
              <li>
                <strong>Potencia:</strong> kW contratados × precio × días. Los
                precios anuales se dividen entre 365; los mensuales se dividen
                entre 30. Un precio total de potencia se aplica una sola vez; un
                precio por periodo se aplica por separado a punta y valle.
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
                tipo indicado, con mínimo doméstico opcional de 0,001 €/kWh. El
                alquiler del contador y los servicios no forman parte de esta
                base.
              </li>
              <li>
                <strong>IVA:</strong> se aplica al suministro, incluido el IEE y
                el alquiler del contador. Los servicios de mantenimiento se
                calculan por separado al 21 %.
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
              Tipos generales de referencia: IVA 21 % e IEE 5,11269632 %.
              Revisión: 22/09/2026. Usa los tipos de tu factura para periodos
              con medidas temporales. No se aplica automáticamente un tipo por
              fecha.
            </p>
            <p>
              PVPC se muestra aparte como referencia histórica con medias por
              periodo del último mes completo; no reconstruye tu factura horaria
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
                href="https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-electricidad/liquidacion-pago-impuesto/tipo-impositivo.html"
                target="_blank"
                rel="noreferrer"
              >
                AEAT · Impuesto eléctrico
                <ExternalLink size={14} />
              </a>
              <a
                href="https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741"
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

function TariffCard({
  tariff: t,
  current,
  powerComparisonUnit,
  unequalPower,
  index,
  onEdit,
  onReview,
  onSelect,
  onRemove,
}: {
  tariff: Tariff;
  current: boolean;
  powerComparisonUnit: Tariff["powerUnit"];
  unequalPower: boolean;
  index: number;
  onEdit: () => void;
  onReview: () => void;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const expired = t.validUntil && t.validUntil < today();
  return (
    <article className={`panel tariff-card ${current ? "is-current" : ""}`}>
      <div className="tariff-top">
        <div className={`tariff-avatar avatar-${index % 4}`}>
          {(t.provider || t.name).slice(0, 2).toUpperCase()}
        </div>
        <div className="tariff-title">
          <span className="small muted">
            {t.provider || "Comercializadora sin indicar"}
          </span>
          <h3>{t.name}</h3>
        </div>
        {current && <span className="pill green">Tu tarifa actual</span>}
        <button
          className="icon-button"
          onClick={onEdit}
          aria-label={`Editar ${t.name}`}
        >
          <Pencil size={16} />
        </button>
        {!current && (
          <button
            className="icon-button danger"
            onClick={onRemove}
            aria-label={`Eliminar ${t.name}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="tariff-prices">
        {(t.kind === "fixed"
          ? [["Precio las 24 h", t.energyPeak]]
          : [
              ["Punta", t.energyPeak],
              ["Llano", t.energyFlat],
              ["Valle", t.energyValley],
            ]
        ).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>
              {value.replace(".", ",") || "—"}
              <small> €/kWh</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="tariff-power">
        <div className="tariff-power-heading">
          <span className="small muted">Potencia para comparar</span>
          <strong>
            {formatPowerPrice(comparablePowerPrice(t, powerComparisonUnit))}
            <small> {powerUnitLabels[powerComparisonUnit]}</small>
          </strong>
        </div>
        <p className="small muted tariff-power-reference">
          Referencia: 1 kW en cada periodo · Sin impuestos
        </p>
        <p className="small muted">Precio original: {powerDescription(t)}</p>
        {unequalPower && (
          <p className="small tariff-power-notice">
            Tus potencias P1 y P2 son distintas. Esta referencia no representa
            tu coste de potencia; la estimación usa tus kW contratados.
            {t.powerKind === "combined" &&
              " Esta tarifa combinada requiere la misma potencia en P1 y P2 para calcular su coste."}
          </p>
        )}
      </div>
      {Number(t.snoeeKwh.replace(",", ".")) > 0 && (
        <p className="small muted">
          Coste SNOEE: {t.snoeeKwh.replace(".", ",")} €/kWh, aparte de la
          energía
        </p>
      )}
      <div className="tariff-bottom">
        <span>
          {expired
            ? "Oferta caducada"
            : t.checkedOn
              ? `Precios comprobados: ${shortDate(t.checkedOn)}`
              : "Precios aún sin comprobar"}
        </span>
        <div>
          {t.url && (
            <a
              className="text-link"
              href={t.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ver oferta ${t.name}`}
            >
              <ExternalLink size={14} />
            </a>
          )}
          {!current && (
            <button className="link-button" onClick={onSelect}>
              Es mi tarifa actual
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
      <EstimateNotice tariff={t} />
      {!t.checkedOn && (
        <button
          type="button"
          className="link-button tariff-review"
          onClick={onReview}
        >
          <Check size={16} /> Confirmar precios a día de hoy
        </button>
      )}
      {t.notes && <p className="tariff-notes small muted">{t.notes}</p>}
    </article>
  );
}
function ResultRow({
  tariff,
  cost,
  current,
  best,
  max,
  baseline,
}: {
  tariff: Tariff;
  cost: Calculation;
  current: boolean;
  best: boolean;
  max: number;
  baseline?: number;
}) {
  return (
    <details className="result-row">
      <summary>
        <div className="result-row-top">
          <span>
            {tariff.name}
            {current && <small>Actual</small>}
            {estimatedCharges(tariff) && <small>Aproximado</small>}
            {best && <small className="best-tag">Menor coste</small>}
          </span>
          <strong>{money(cost.total)}</strong>
        </div>
        <div className="result-bar">
          <span
            style={{ width: `${Math.max(2, (cost.total / max) * 100)}%` }}
            className={best ? "best" : ""}
          />
        </div>
        <div className="result-row-caption">
          <span>
            {baseline !== undefined && !current
              ? `${cost.total <= baseline ? "Ahorras" : "Pagas más"} ${money(Math.abs(baseline - cost.total))}`
              : "Ver desglose"}
          </span>
          <ChevronDown size={13} />
        </div>
      </summary>
      <EstimateNotice tariff={tariff} />
      <dl className="breakdown">
        {billLines.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{money(cost[key])}</dd>
          </div>
        ))}
        <div className="total">
          <dt>Total del periodo</dt>
          <dd>{money(cost.total)}</dd>
        </div>
      </dl>
    </details>
  );
}
