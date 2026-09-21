"use client";
import { useState, type FormEvent } from "react";
import { Plus, Receipt, Pencil, Trash2 } from "lucide-react";
import {
  billSchema,
  money,
  shortDate,
  today,
  type Bill,
  type Workspace,
} from "@/lib/domain";
import { Field, Modal, Empty } from "./ui";
export default function Bills({
  workspace: w,
  update,
}: {
  workspace: Workspace;
  update: (w: Workspace) => void;
}) {
  const [editing, setEditing] = useState<Bill | null>(null);
  const [year, setYear] = useState(today().slice(0, 4));
  const [error, setError] = useState("");
  const bills = w.bills
    .filter((b) => b.month.startsWith(year))
    .sort((a, b) => b.month.localeCompare(a.month));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const entries = bills.filter((b) => b.month === month);
    return {
      label: new Intl.DateTimeFormat("es-ES", {
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${month}-01`)),
      amount: entries.reduce(
        (sum, b) => sum + Number(b.paid.replace(",", ".")),
        0,
      ),
      count: entries.length,
    };
  });
  const total = months.reduce((sum, m) => sum + m.amount, 0);
  const max = Math.max(...months.map((m) => m.amount), 1);
  function create() {
    const current = w.tariffs.find((t) => t.id === w.currentId);
    setError("");
    setEditing({
      id: crypto.randomUUID(),
      month: today().slice(0, 7),
      provider: current?.provider || current?.name || "",
      paid: "",
      kwh: "",
      notes: "",
      tariff: current ? structuredClone(current) : null,
    });
  }
  function save(e: FormEvent) {
    e.preventDefault();
    const result = billSchema.safeParse(editing);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    update({
      ...w,
      bills: [...w.bills.filter((b) => b.id !== result.data.id), result.data],
    });
    setEditing(null);
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">LO QUE REALMENTE HAS PAGADO</span>
          <h2>Mes a mes, sin perder la cuenta.</h2>
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={17} />
          Añadir factura
        </button>
      </div>
      <div className="panel bill-chart">
        <div className="section-inline">
          <div>
            <span className="muted">Total registrado en {year}</span>
            <div className="big-amount">{money(total)}</div>
            <span className="small muted">
              {bills.length} facturas · {months.filter((m) => m.count).length}{" "}
              meses con datos
            </span>
          </div>
          <label className="inline-label">
            Año
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {Array.from(
                new Set([
                  today().slice(0, 4),
                  ...w.bills.map((b) => b.month.slice(0, 4)),
                ]),
              )
                .sort()
                .reverse()
                .map((y) => (
                  <option key={y}>{y}</option>
                ))}
            </select>
          </label>
        </div>
        <div
          className="chart"
          role="img"
          aria-label={`Gasto mensual de ${year}. Total ${money(total)}. Los importes se detallan en la lista inferior.`}
        >
          {months.map((m) => (
            <div className="chart-column" key={m.label}>
              <span className="chart-value">
                {m.count ? money(m.amount) : "—"}
              </span>
              <div
                className={`chart-bar ${m.count ? "" : "no-data"}`}
                style={{
                  height: `${m.count ? Math.max((m.amount / max) * 135, 3) : 3}px`,
                }}
              />
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
      {!bills.length ? (
        <div className="panel">
          <Empty
            icon={<Receipt size={26} />}
            title="Tu historial empieza con una factura."
            action={
              <button className="button secondary" onClick={create}>
                Registrar mi primera factura
              </button>
            }
          >
            Añade el importe real que has pagado. Aquí verás cómo cambia tu
            gasto a lo largo del año.
          </Empty>
        </div>
      ) : (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Comercializadora</th>
                <th>Consumo</th>
                <th>Pagado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td>
                    {new Intl.DateTimeFormat("es-ES", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${b.month}-01`))}
                  </td>
                  <td>
                    <strong>{b.provider}</strong>
                    {b.tariff && (
                      <small className="block muted">{b.tariff.name}</small>
                    )}
                    {b.notes && (
                      <small className="block muted">{b.notes}</small>
                    )}
                  </td>
                  <td>
                    {b.kwh || "—"} {b.kwh && "kWh"}
                  </td>
                  <td className="amount">
                    {money(Number(b.paid.replace(",", ".")))}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Editar factura ${b.month}`}
                        onClick={() => {
                          setEditing(b);
                          setError("");
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`Eliminar factura ${b.month}`}
                        onClick={() => {
                          if (window.confirm("¿Eliminar esta factura?"))
                            update({
                              ...w,
                              bills: w.bills.filter((x) => x.id !== b.id),
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal
          title={
            w.bills.some((b) => b.id === editing.id)
              ? "Editar factura"
              : "Registrar una factura"
          }
          onClose={() => setEditing(null)}
        >
          <form className="modal-body" onSubmit={save}>
            <p className="muted">
              Introduce el total real, con impuestos. No es una estimación del
              comparador.
            </p>
            <div className="form-grid two">
              <Field
                label="Mes de la factura"
                type="month"
                required
                value={editing.month}
                onChange={(v) => setEditing({ ...editing, month: v })}
              />
              <Field
                label="Total pagado"
                required
                decimal
                unit="€"
                value={editing.paid}
                onChange={(v) => setEditing({ ...editing, paid: v })}
              />
            </div>
            <Field
              label="Comercializadora"
              required
              value={editing.provider}
              onChange={(v) => setEditing({ ...editing, provider: v })}
            />
            <Field
              label="Consumo total (opcional)"
              decimal
              unit="kWh"
              value={editing.kwh}
              onChange={(v) => setEditing({ ...editing, kwh: v })}
            />
            <label className="auth-label">
              Tarifa de esta factura
              <select
                value={editing.tariff ? "snapshot" : ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tariff:
                      e.target.value === "snapshot"
                        ? editing.tariff
                        : structuredClone(
                            w.tariffs.find(
                              (t) => `live:${t.id}` === e.target.value,
                            ) ??
                              w.history.find(
                                (h) => `history:${h.id}` === e.target.value,
                              )?.tariff ??
                              null,
                          ),
                  })
                }
              >
                <option value="">Sin vincular</option>
                {editing.tariff && (
                  <option value="snapshot">
                    {editing.tariff.name} · conservar esta copia
                  </option>
                )}
                {w.tariffs.map((t) => (
                  <option key={t.id} value={`live:${t.id}`}>
                    {t.name}
                  </option>
                ))}
                {w.history.map((h) => (
                  <option key={h.id} value={`history:${h.id}`}>
                    {h.tariff.name} · {shortDate(h.start)} a {shortDate(h.end)}
                  </option>
                ))}
              </select>
              <small>
                Se guarda una copia de los precios; los cambios futuros no
                alteran esta factura.
              </small>
            </label>
            <Field
              label="Notas (opcional)"
              value={editing.notes}
              onChange={(v) => setEditing({ ...editing, notes: v })}
              maxLength={2000}
            />
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="button primary">
                Aplicar factura
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
