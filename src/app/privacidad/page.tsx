import type { Metadata } from "next";
import Link from "next/link";
import HeaderActions from "@/components/header-actions";
import MethodText from "@/components/method-text";
import { PageProvider } from "@/components/page-context";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { eyebrow, narrowPage, textLink } from "@/components/account-styles";
import { cn } from "@/lib/utils";
import { shell, skipLink } from "@/components/shell-styles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacidad · Luz en claro" };
const contact = "contact@fercarmona.dev";

export default function Privacy() {
  return (
    <PageProvider method={<MethodText />}>
      <a href="#main" className={skipLink}>
        Saltar al contenido
      </a>
      <SiteHeader actions={<HeaderActions />} />
      <main id="main" className={shell}>
        <article
          className={cn(
            narrowPage,
            "[&_h2]:mt-8 [&_h2]:mb-2.5 [&_h2]:font-heading [&_h2]:text-xl/[1.6] [&_h2]:font-bold [&_h2]:tracking-[-0.55px] [&_li]:text-muted-foreground [&_p]:m-0 [&_p]:text-muted-foreground [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-10",
          )}
        >
          <span className={eyebrow}>PRIVACIDAD</span>
          <h1 className="m-0 font-heading text-[2rem]/[1.6] font-bold">
            Qué guardamos y por qué
          </h1>
          <h2>Quién es el responsable</h2>
          <p>
            Fernando Carmona Ayuela. Puedes escribirme a{" "}
            <a className={textLink} href={`mailto:${contact}`}>
              {contact}
            </a>
            .
          </p>

          <h2>Si usas el comparador sin cuenta</h2>
          <p>
            Tus tarifas, facturas y consumo se guardan solo en este navegador.
            No los recibimos. Puedes borrarlos eliminando los datos del sitio en
            tu navegador.
          </p>

          <h2>Si creas una cuenta</h2>
          <ul>
            <li>
              <strong>Cuenta:</strong> tu nombre, tu correo, si lo has
              confirmado y, si eliges usarla, tu contraseña cifrada (nunca la
              guardamos en claro).
            </li>
            <li>
              <strong>Tus datos de electricidad:</strong> las tarifas, facturas,
              consumos, historial de contratos y el perfil de consumo que
              introduces, para que los tengas en cualquier dispositivo.
            </li>
            <li>
              <strong>Sesiones:</strong> mientras tienes la sesión iniciada
              guardamos la dirección IP y el navegador desde el que entraste.
              Caducan a los 30 días.
            </li>
            <li>
              <strong>Códigos y enlaces:</strong> los códigos de acceso
              (cifrados) y los enlaces de confirmación o de cambio de
              contraseña, que caducan en 10 minutos o una hora.
            </li>
            <li>
              <strong>Límites de uso:</strong> un contador de intentos por
              dirección IP y tipo de acceso, para frenar abusos. No está ligado
              a tu cuenta.
            </li>
          </ul>
          <p>
            Usamos estos datos solo para darte el servicio: guardar tu
            comparativa y mantener tu cuenta segura. No los vendemos, no los
            usamos para publicidad y no hay analítica ni seguimiento de
            terceros.
          </p>

          <h2>Cookies</h2>
          <p>
            Solo usamos cookies necesarias para la sesión: una que te mantiene
            dentro, una copia firmada de la sesión que dura cinco minutos y, al
            crear la cuenta, una cookie temporal que asocia la contraseña a este
            navegador durante una hora.
          </p>

          <h2>Quién nos ayuda</h2>
          <ul>
            <li>
              <strong>Vercel</strong> aloja la aplicación.
            </li>
            <li>
              <strong>Neon</strong> guarda la base de datos en un centro de
              datos de la Unión Europea.
            </li>
            <li>
              <strong>Resend</strong> envía los correos de la cuenta (códigos y
              enlaces). Recibe tu dirección de correo.
            </li>
          </ul>
          <p>
            Los precios PVPC se consultan en Red Eléctrica desde nuestro
            servidor, sin enviar ningún dato tuyo.
          </p>

          <h2>Tus derechos</h2>
          <p>
            Puedes descargar tus datos y eliminar tu cuenta cuando quieras desde{" "}
            <Link className={textLink} href="/mi-cuenta">
              Mi cuenta
            </Link>
            . Al eliminarla borramos la cuenta y todos sus datos de
            electricidad. También puedes pedirnos acceso, corrección, oposición
            o limitación en{" "}
            <a className={textLink} href={`mailto:${contact}`}>
              {contact}
            </a>
            , y reclamar ante la Agencia Española de Protección de Datos
            (aepd.es).
          </p>
        </article>
        <SiteFooter />
      </main>
    </PageProvider>
  );
}
