"use client";
import { useEffect, useState } from "react";
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
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Zap,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { calculate, type Calculation } from "@/lib/calculator";
import {
  changeCurrent,
  emptyWorkspace,
  money,
  newTariff,
  shortDate,
  today,
  workspaceSchema,
  type Profile,
  type Tariff,
  type Workspace,
} from "@/lib/domain";
import { Brand, Empty, Field, Modal } from "./ui";
import TariffForm from "./tariff-form";
import Bills from "./bills";

type Tab = "compare" | "history" | "bills";
export default function Dashboard({
  user,
  accountsAvailable,
}: {
  user: { id: string; name: string } | null;
  accountsAvailable: boolean;
}) {
  const [w, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(!user);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("compare");
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const [switchDate, setSwitchDate] = useState(today);
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [taxHelp, setTaxHelp] = useState(false);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetch("/api/workspace", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        const data = workspaceSchema.parse(body.data);
        setWorkspace(data);
        setVersion(body.version);
        setLoaded(true);
        setLoadError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setLoadError(
            e instanceof Error
              ? e.message
              : "No se han podido cargar tus datos.",
          );
      });
    return () => controller.abort();
  }, [user, reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const confirmNavigation = (event: MouseEvent) => {
      const link =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      if (
        !window.confirm("Tienes cambios sin guardar. ¿Salir y descartarlos?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        window.removeEventListener("beforeunload", warn);
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [dirty]);
  function update(next: Workspace) {
    setWorkspace(next);
    setDirty(true);
    setMessage("");
    setError("");
  }
  function profile(key: keyof Profile, value: string | boolean) {
    update({ ...w, profile: { ...w.profile, [key]: value } });
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const parsed = workspaceSchema.safeParse(w);
      if (!parsed.success)
        throw new Error(`Revisa los datos: ${parsed.error.issues[0].message}`);
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed.data, version }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setVersion(body.version);
      setDirty(false);
      setMessage("Todo guardado en tu cuenta.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se ha podido guardar. Tus cambios siguen aquí.",
      );
    } finally {
      setBusy(false);
    }
  }
  function saveTariff(tariff: Tariff, since: string) {
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
      currentSince: isCurrent ? since : w.currentSince,
    });
    setEditing(null);
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
  const fields: [keyof Profile, string, string][] = [
    ["peakKwh", "P1 · Punta", "kWh"],
    ["flatKwh", "P2 · Llano", "kWh"],
    ["valleyKwh", "P3 · Valle", "kWh"],
  ];
  const powerFields: [keyof Profile, string, string][] = [
    ["peakKw", "P1 · Punta", "kW"],
    ["valleyKw", "P2 · Valle", "kW"],
    ["days", "Días del periodo", "días"],
  ];
  const input = ([key, label, unit]: [keyof Profile, string, string]) => (
    <Field
      key={key}
      label={label}
      unit={unit}
      value={String(w.profile[key])}
      onChange={(v) => profile(key, v)}
      decimal
    />
  );
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
                  Hola, {user.name.split(" ")[0]}
                </span>
                <button
                  className="icon-button"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      dirty &&
                      !window.confirm(
                        "Tienes cambios sin guardar. ¿Cerrar sesión de todos modos?",
                      )
                    )
                      return;
                    try {
                      const result = await authClient.signOut();
                      if (result.error) throw new Error();
                      setDirty(false);
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
                <Link className="text-link login-link" href="/cuenta">
                  Iniciar sesión
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
              Que tu próxima factura
              <br />
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
              className={tab === "compare" ? "active" : ""}
              onClick={() => setTab("compare")}
            >
              <SlidersHorizontal size={17} />
              Comparador
            </button>
            <button
              className={tab === "history" ? "active" : ""}
              onClick={() => setTab("history")}
            >
              <History size={17} />
              Mis tarifas
            </button>
            <button
              className={tab === "bills" ? "active" : ""}
              onClick={() => setTab("bills")}
            >
              <Receipt size={17} />
              Mis facturas
            </button>
          </nav>
          <span className="workspace-status">
            <span className={`status-dot ${dirty ? "unsaved" : ""}`} />
            {user
              ? dirty
                ? "Cambios sin guardar"
                : "Tu espacio personal"
              : "Comparación sin cuenta"}
          </span>
        </div>
        {user && (
          <div className="save-strip">
            <span>
              <ShieldCheck size={16} />
              {w.reviewedOn
                ? `Última revisión: ${shortDate(w.reviewedOn)}`
                : "Tus precios y facturas, solo para ti."}
            </span>
            <div>
              <button
                className="button secondary small-button"
                onClick={exportData}
                disabled={!loaded}
              >
                <Download size={15} />
                Exportar
              </button>
              <button
                className="button primary small-button"
                onClick={save}
                disabled={!loaded || busy || !dirty}
              >
                <Save size={15} />
                {busy ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
        {message && (
          <div className="notice success" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {loadError && (
          <div className="notice error" role="alert">
            {loadError}{" "}
            <button
              className="link-button"
              onClick={() => setReload((n) => n + 1)}
            >
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
                          <span className="step-number">01</span>
                          <h2>Tu punto de partida</h2>
                        </div>
                        <span className="pill neutral">2.0TD · Hogar</span>
                      </div>
                      <p className="muted">
                        Usaremos el mismo consumo para todas las tarifas.
                      </p>
                      <div className="input-section">
                        <div className="input-section-title">
                          <span>Consumo de tu factura</span>
                          <span className="small muted">Por periodos</span>
                        </div>
                        <div className="form-grid three energy-inputs">
                          {fields.map(input)}
                        </div>
                      </div>
                      <div className="input-section">
                        <div className="input-section-title">
                          <span>Potencia y duración</span>
                          <span className="small muted">Hasta 15 kW</span>
                        </div>
                        <div className="form-grid three">
                          {powerFields.map(input)}
                        </div>
                      </div>
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
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={w.profile.taxes}
                              onChange={(e) =>
                                profile("taxes", e.target.checked)
                              }
                            />
                            Incluir IVA e impuesto eléctrico
                          </label>
                          {w.profile.taxes && (
                            <>
                              <div className="form-grid two">
                                <Field
                                  label="IVA del suministro"
                                  value={w.profile.vat}
                                  onChange={(v) => profile("vat", v)}
                                  decimal
                                  unit="%"
                                />
                                <Field
                                  label="Impuesto eléctrico (IEE)"
                                  value={w.profile.electricityTax}
                                  onChange={(v) => profile("electricityTax", v)}
                                  decimal
                                  unit="%"
                                />
                              </div>
                              <button
                                className="link-button"
                                onClick={() =>
                                  update({
                                    ...w,
                                    profile: {
                                      ...w.profile,
                                      vat: "21",
                                      electricityTax: "5.11269632",
                                    },
                                  })
                                }
                              >
                                Usar tipos generales: 21 % y 5,11269632 %
                              </button>
                              <label className="checkbox small">
                                <input
                                  type="checkbox"
                                  checked={w.profile.minimumTax}
                                  onChange={(e) =>
                                    profile("minimumTax", e.target.checked)
                                  }
                                />
                                Aplicar mínimo doméstico IEE (0,001 €/kWh)
                              </label>
                            </>
                          )}
                          <p className="small muted">
                            Península y Baleares. Revisa los tipos de tu
                            factura: pueden cambiar según el devengo. No calcula
                            IGIC ni IPSI. El alquiler y otros cargos se indican
                            en cada tarifa.
                          </p>
                          <button
                            className="text-link"
                            onClick={() => setTaxHelp(true)}
                          >
                            <CircleHelp size={15} />
                            Cómo calculamos los impuestos
                          </button>
                        </div>
                      )}
                    </section>
                    <section className="tariffs-section">
                      <div className="section-heading compact">
                        <div className="heading-number">
                          <span className="step-number">02</span>
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
                              index={i}
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
                            Sin estimaciones inventadas
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
                                  {money((saving * 365) / baseline.cost.days)} /
                                  año
                                </strong>
                                <span>
                                  Ahorro extrapolado si mantienes este consumo y
                                  precios todo el año. No es una previsión.
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
                        <span className="small">↗</span>
                      </div>
                      <h3>¿Hay algo mejor ahí fuera?</h3>
                      <p>
                        Busca una oferta, copia sus precios y comprueba si te
                        compensa con tu consumo.
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
                      {user && (
                        <button
                          className="button secondary full small-button"
                          onClick={() => update({ ...w, reviewedOn: today() })}
                        >
                          <Check size={15} />
                          Marcar revisión de hoy
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
                      <h3>La próxima vez, empieza donde lo dejaste.</h3>
                      <p>
                        Guarda tus tarifas, conserva tus cambios de precios y
                        sigue tus facturas mes a mes.
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
                              Potencia P1: {h.tariff.powerPeak} · P2:{" "}
                              {h.tariff.powerValley} €/kW/
                              {h.tariff.powerUnit === "day" ? "día" : "año"}
                              <br />
                              Alquiler: {h.tariff.meterDay || "0"} €/día · Bono
                              social: {h.tariff.socialDay || "0"} €/día ·
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
      {editing && (
        <TariffForm
          initial={editing}
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
                precios anuales se dividen entre 365.
              </li>
              <li>
                <strong>Financiación del bono social:</strong> cargo diario de
                tu contrato. Se incluye en la base del IEE; no es el descuento
                para beneficiarios del bono social.
              </li>
              <li>
                <strong>IEE:</strong> (energía + potencia + financiación bono
                social) × tipo indicado, con mínimo doméstico opcional de 0,001
                €/kWh. El alquiler del contador y los servicios no forman parte
                de esta base.
              </li>
              <li>
                <strong>IVA:</strong> se aplica al suministro, incluido el IEE y
                el alquiler del contador. Los servicios de mantenimiento se
                calculan por separado al 21 %.
              </li>
            </ol>
            <p>
              Los costes mensuales de servicios se prorratean a 12 × días / 365.
              Los importes se redondean a céntimos por concepto; tu factura
              puede tener diferencias de redondeo.
            </p>
            <p>
              Tipos generales de referencia: IVA 21 % e IEE 5,11269632 %.
              Revisión: 21/09/2026. Usa los tipos de tu factura para periodos
              con medidas temporales. No se aplica automáticamente un tipo por
              fecha.
            </p>
            <p>
              No simula PVPC horario, compensación solar, descuentos del bono
              social, IGIC, IPSI, penalizaciones ni promociones temporales.
              Introduce precios netos de descuentos y comprueba permanencias
              antes de cambiar.
            </p>
            <div className="source-links">
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
  index,
  onEdit,
  onSelect,
  onRemove,
}: {
  tariff: Tariff;
  current: boolean;
  index: number;
  onEdit: () => void;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const expired = t.validUntil && t.validUntil < today();
  const stale =
    !t.checkedOn ||
    (Date.parse(`${today()}T00:00:00Z`) -
      Date.parse(`${t.checkedOn}T00:00:00Z`)) /
      86400000 >
      7;
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
      <div className="tariff-bottom">
        <span>
          {expired
            ? "Oferta caducada"
            : stale
              ? "Pendiente de revisar"
              : `Revisada ${shortDate(t.checkedOn)}`}
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
  const lines: [string, number][] = [
    ["Energía", cost.energy],
    ["Potencia", cost.power],
    ["Financiación bono social", cost.social],
    ["Alquiler de contador", cost.meter],
    ["Servicios", cost.services],
    ["Impuesto eléctrico", cost.electricityTax],
    ["IVA suministro", cost.vat],
    ["IVA servicios", cost.servicesVat],
  ];
  return (
    <details className="result-row">
      <summary>
        <div className="result-row-top">
          <span>
            {tariff.name}
            {current && <small>Actual</small>}
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
      <dl className="breakdown">
        {lines.map(([label, amount]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{money(amount)}</dd>
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
