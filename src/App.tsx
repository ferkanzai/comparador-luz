import { useState, useMemo, type ChangeEvent, type FC } from "react";

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  small?: boolean;
}

const Input: FC<InputProps> = ({ label, value, onChange, unit, small }) => (
  <div className={`flex flex-col ${small ? "w-24" : "w-32"}`}>
    <label className="text-xs text-gray-400 mb-1 truncate">{label}</label>
    <div className="flex items-center bg-gray-800 rounded border border-gray-700 focus-within:border-blue-500">
      <input
        title={label}
        placeholder={label}
        type="number"
        step="any"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="w-full bg-transparent text-white text-sm px-2 py-1.5 outline-none"
      />
      {unit && <span className="text-gray-500 text-xs pr-2 whitespace-nowrap">{unit}</span>}
    </div>
  </div>
);

interface Consumo {
  punta: string;
  llano: string;
  valle: string;
}

interface Potencia {
  punta: string;
  valle: string;
}

interface Tarifa {
  nombre: string;
  punta: string;
  llano: string;
  valle: string;
  usaPotencia: boolean;
  potPunta: string;
  potValle: string;
  color: string;
}

interface Resultado {
  nombre: string;
  energia: number;
  pot: number;
  total: number;
  color: string;
  usaPotencia: boolean;
}

const defaultTarifas: Tarifa[] = [
  { nombre: "Actual (3 tramos)", punta: "0.197", llano: "0.118", valle: "0.081", usaPotencia: true, potPunta: "0.097", potValle: "0.027", color: "#6366f1" },
  { nombre: "Oferta 3 tramos", punta: "0.192", llano: "0.113", valle: "0.082", usaPotencia: true, potPunta: "0.097", potValle: "0.027", color: "#22d3ee" },
  { nombre: "Precio fijo 0,119", punta: "0.119", llano: "0.119", valle: "0.119", usaPotencia: true, potPunta: "0.097", potValle: "0.027", color: "#f59e0b" },
  { nombre: "Precio fijo 0,109 (Repsol)", punta: "0.109", llano: "0.109", valle: "0.109", usaPotencia: true, potPunta: "0.0819", potValle: "0.0819", color: "#10b981" },
];

const p = (v: string): number => parseFloat(v) || 0;

const COLORS = ["#f43f5e", "#a855f7", "#84cc16", "#fb923c"];

const App: FC = () => {
  const [consumo, setConsumo] = useState<Consumo>({ punta: "38", llano: "34", valle: "97" });
  const [potencia, setPotencia] = useState<Potencia>({ punta: "4.000", valle: "4.000" });
  const [dias, setDias] = useState("28");
  const [tarifas, setTarifas] = useState<Tarifa[]>(defaultTarifas);
  const [expanded, setExpanded] = useState<number | null>(null);

  const updateTarifa = (i: number, field: keyof Tarifa, val: string | boolean): void => {
    const t = [...tarifas];
    t[i] = { ...t[i], [field]: val };
    setTarifas(t);
  };

  const resultados = useMemo<Resultado[]>(() => {
    const d = p(dias);
    return tarifas.map((t) => {
      const energia = p(t.punta) * p(consumo.punta) + p(t.llano) * p(consumo.llano) + p(t.valle) * p(consumo.valle);
      const pot = t.usaPotencia ? (p(t.potPunta) * p(potencia.punta) + p(t.potValle) * p(potencia.valle)) * d : 0;
      return { nombre: t.nombre, energia, pot, total: energia + pot, color: t.color, usaPotencia: t.usaPotencia };
    });
  }, [consumo, potencia, dias, tarifas]);

  const minTotal = Math.min(...resultados.map((r) => r.total));
  const maxTotal = Math.max(...resultados.map((r) => r.total));
  const barMax = maxTotal * 1.1 || 1;

  const addTarifa = (): void => {
    setTarifas([
      ...tarifas,
      {
        nombre: `Tarifa ${tarifas.length + 1}`,
        punta: "0.100", llano: "0.100", valle: "0.100",
        usaPotencia: true, potPunta: "0.097", potValle: "0.027",
        color: COLORS[tarifas.length % COLORS.length],
      },
    ]);
  };

  const removeTarifa = (i: number): void => {
    if (tarifas.length > 1) setTarifas(tarifas.filter((_, idx) => idx !== i));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <h1 className="text-2xl font-bold mb-1">⚡ Comparador de Tarifas de Luz</h1>
      <p className="text-gray-400 text-sm mb-6">Edita cualquier valor para recalcular al instante</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">📊 Consumos del periodo</h2>
          <div className="flex flex-wrap gap-3">
            <Input label="Punta (kWh)" value={consumo.punta} onChange={(v) => setConsumo({ ...consumo, punta: v })} />
            <Input label="Llano (kWh)" value={consumo.llano} onChange={(v) => setConsumo({ ...consumo, llano: v })} />
            <Input label="Valle (kWh)" value={consumo.valle} onChange={(v) => setConsumo({ ...consumo, valle: v })} />
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">🔌 Potencia contratada y periodo</h2>
          <div className="flex flex-wrap gap-3">
            <Input label="Pot. Punta (kW)" value={potencia.punta} onChange={(v) => setPotencia({ ...potencia, punta: v })} />
            <Input label="Pot. Valle (kW)" value={potencia.valle} onChange={(v) => setPotencia({ ...potencia, valle: v })} />
            <Input label="Días" value={dias} onChange={setDias} />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">💡 Tarifas a comparar</h2>
          <button onClick={addTarifa} className="text-xs bg-gray-800 hover:bg-gray-700 text-blue-400 px-3 py-1.5 rounded-lg border border-gray-700">+ Añadir tarifa</button>
        </div>
        <div className="space-y-2">
          {tarifas.map((t, i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-3 flex flex-wrap items-end gap-3">
                <div className="w-3 h-3 rounded-full mt-5 flex-shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex flex-col w-40">
                  <label className="text-xs text-gray-400 mb-1">Nombre</label>
                  <input
                    title="Nombre"
                    value={t.nombre}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateTarifa(i, "nombre", e.target.value)}
                    className="bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-700 outline-none focus:border-blue-500"
                  />
                </div>
                <Input label="Punta €/kWh" value={t.punta} onChange={(v) => updateTarifa(i, "punta", v)} small />
                <Input label="Llano €/kWh" value={t.llano} onChange={(v) => updateTarifa(i, "llano", v)} small />
                <Input label="Valle €/kWh" value={t.valle} onChange={(v) => updateTarifa(i, "valle", v)} small />
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    {expanded === i ? "Ocultar" : "Potencia ⚙️"}
                  </button>
                  {tarifas.length > 1 && (
                    <button onClick={() => removeTarifa(i)} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                  )}
                </div>
              </div>
              {expanded === i && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-800 flex flex-wrap items-end gap-3" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.usaPotencia}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateTarifa(i, "usaPotencia", e.target.checked)}
                        className="accent-blue-500"
                      />
                      Incluir potencia
                    </label>
                  </div>
                  {t.usaPotencia && (
                    <>
                      <Input label="Pot. Punta €/kW/día" value={t.potPunta} onChange={(v) => updateTarifa(i, "potPunta", v)} small />
                      <Input label="Pot. Valle €/kW/día" value={t.potValle} onChange={(v) => updateTarifa(i, "potValle", v)} small />
                    </>
                  )}
                  {!t.usaPotencia && <span className="text-xs text-yellow-500 mb-1">⚠ Sin coste de potencia en esta tarifa</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">📈 Resultados ({dias} días)</h2>
        <div className="space-y-4">
          {resultados
            .slice()
            .sort((a, b) => a.total - b.total)
            .map((r, i) => {
              const isBest = r.total === minTotal;
              const diff = r.total - minTotal;
              const pctEnergia = r.total > 0 ? (r.energia / r.total) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="text-sm font-medium">{r.nombre}</span>
                      {isBest && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">✓ Más barata</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold" style={{ color: isBest ? "#10b981" : r.color }}>{r.total.toFixed(2)} €</span>
                      {!isBest && <span className="text-xs text-red-400 ml-2">+{diff.toFixed(2)} €</span>}
                    </div>
                  </div>
                  <div className="relative h-7 bg-gray-800 rounded-lg overflow-hidden">
                    <div
                      className="absolute h-full rounded-lg flex items-center transition-all duration-500"
                      style={{
                        width: `${(r.total / barMax) * 100}%`,
                        background: `linear-gradient(90deg, ${r.color}CC ${pctEnergia}%, ${r.color}55 ${pctEnergia}%)`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-3 text-xs">
                      <span className="text-white drop-shadow">
                        Energía: {r.energia.toFixed(2)}€
                        {r.usaPotencia && <span className="text-gray-300 ml-2">| Potencia: {r.pot.toFixed(2)}€</span>}
                        {!r.usaPotencia && <span className="text-gray-400 ml-2">| Sin potencia</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {resultados.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">💰 Ahorro anual estimado vs {resultados[0]?.nombre}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {resultados.slice(1).map((r, i) => {
                const actual = resultados[0];
                const ahorroPeriodo = actual.total - r.total;
                const ahorroAnual = ahorroPeriodo * (365 / (p(dias) || 1));
                const positivo = ahorroAnual > 0;
                return (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">{r.nombre}</div>
                    <div className={`text-xl font-bold ${positivo ? "text-green-400" : "text-red-400"}`}>
                      {positivo ? "+" : ""}{ahorroAnual.toFixed(2)} €/año
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {positivo ? "Ahorras" : "Pagas más"} {Math.abs(ahorroPeriodo).toFixed(2)} €/periodo
                    </div>
                    {!r.usaPotencia && <div className="text-xs text-yellow-500 mt-1">⚠ Sin coste potencia</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-4 text-center">
        Nota: No incluye impuestos (IVA, IEE), alquiler de contador ni otros cargos fijos. Comparación orientativa.
      </p>
    </div>
  );
};

export default App;