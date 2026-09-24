import { ExternalLink } from "lucide-react";
import {
  electricityTax,
  formatRate,
  generalVat,
  regulatedRatesReviewedLabel,
} from "@/lib/regulated-rates";

/* Inside the method dialog, whose text is set by the dialog. */
const paragraph = "mb-5 text-sm-plus";

export default function MethodText() {
  return (
    <>
      <p className={paragraph}>
        Estimación para hogares 2.0TD de Península y Baleares con precios fijos
        o por períodos, siempre introducidos sin impuestos.
      </p>
      <ol className="mb-5 list-decimal pl-5 text-sm-plus [&>li]:py-1.5">
        <li>
          <strong>Energía:</strong> kWh de cada período × su precio.
        </li>
        <li>
          <strong>Potencia:</strong> kW contratados × precio × días. Los precios
          anuales se dividen entre 365; los mensuales se dividen entre 30. Un
          precio total de potencia se aplica una sola vez; un precio por período
          se aplica por separado a punta y valle.
        </li>
        <li>
          <strong>Financiación del bono social:</strong> cargo diario de tu
          contrato. Por defecto se incluye en la base del IEE; puedes ajustar
          este tratamiento por tarifa para reproducir tu factura. No es el
          descuento para beneficiarios del bono social.
        </li>
        <li>
          <strong>Coste SNOEE:</strong> consumo total × precio por kWh indicado
          en tu contrato, solo si no está incluido en los precios de energía. No
          es un impuesto y se mantiene al desactivar los impuestos. La
          referencia PVPC ya incluye su aportación regulada.
        </li>
        <li>
          <strong>IEE:</strong> (energía + potencia + coste SNOEE + financiación
          bono social, si está incluida en esta tarifa) × tipo indicado, con
          mínimo doméstico opcional de{" "}
          {formatRate(electricityTax.minimumPerKwh)} €/kWh. El alquiler del
          contador y los servicios no forman parte de esta base.
        </li>
        <li>
          <strong>IVA:</strong> se aplica al suministro, incluido el IEE y el
          alquiler del contador. Los servicios de mantenimiento se calculan por
          separado al {formatRate(generalVat.percent)} %.
        </li>
      </ol>
      <p className={paragraph}>
        Puedes estimar el alquiler y la financiación del bono social al editar
        una tarifa. Guardamos el valor de referencia elegido y marcamos el
        cálculo como aproximado. Comprueba si tu contrato ya incluye esos cargos
        antes de añadirlos.
      </p>
      <p className={paragraph}>
        Los costes mensuales de servicios se prorratean a 12 × días / 365. Los
        importes se redondean a céntimos por concepto. Si tu factura muestra
        precios redondeados, usa «Calcular precios desde los importes» al editar
        la tarifa. Tu factura puede tener diferencias de redondeo.
      </p>
      <p className={paragraph}>
        Tipos generales de referencia: IVA {formatRate(generalVat.percent)} % e
        IEE {formatRate(electricityTax.percent)} %. Revisión:{" "}
        {regulatedRatesReviewedLabel}. Usa los tipos de tu factura para períodos
        con medidas temporales. No se aplica automáticamente un tipo por fecha.
      </p>
      <p className={paragraph}>
        PVPC se muestra aparte como referencia histórica con medias por período
        del último mes completo; no reconstruye tu factura horaria ni predice
        precios futuros. No simula compensación solar, descuentos del bono
        social, IGIC, IPSI, penalizaciones ni promociones temporales. Introduce
        precios netos de descuentos y comprueba permanencias antes de cambiar.
      </p>
      <div className="grid gap-2.5 border-t border-border pt-5 text-sm-plus [&>a]:flex [&>a]:items-center [&>a]:gap-2 [&>a]:underline">
        <a
          href="https://www.miteco.gob.es/es/energia/eficiencia/sistema-nacional-obligaciones-efe.html"
          target="_blank"
          rel="noreferrer"
        >
          MITECO · SNOEE
          <ExternalLink size={14} />
        </a>
        <a href={electricityTax.rateSource} target="_blank" rel="noreferrer">
          AEAT · Impuesto eléctrico
          <ExternalLink size={14} />
        </a>
        <a href={electricityTax.source} target="_blank" rel="noreferrer">
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
    </>
  );
}
