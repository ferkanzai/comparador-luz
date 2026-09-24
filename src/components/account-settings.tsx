"use client";
import { useState, type FormEvent } from "react";
import { Download, KeyRound, Trash2 } from "lucide-react";
import { useFeedback } from "./feedback-notice";
import ConfirmDialog from "./confirm-dialog";
import { authClient } from "@/lib/auth-client";
import type { CurrentUser } from "@/lib/current-user";
import { workspaceSchema } from "@/lib/domain";
import { downloadWorkspace } from "@/lib/workspace-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function AccountSettings({
  user,
  hasPassword,
}: {
  user: CurrentUser;
  hasPassword: boolean;
}) {
  const { setMessage } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deletionSent, setDeletionSent] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setMessage(
        e instanceof Error && e.message
          ? e.message
          : "No se ha podido completar. Revisa tu conexión y vuelve a intentarlo.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return run(async () => {
      const result = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
        revokeOtherSessions: true,
      });
      if (result.error)
        throw new Error(
          result.error.code === "INVALID_PASSWORD"
            ? "La contraseña actual no es correcta."
            : result.error.status === 429
              ? "Demasiados intentos. Espera un minuto y vuelve a probar."
              : "No se ha podido cambiar la contraseña. Inténtalo de nuevo.",
        );
      form.reset();
      setMessage("Contraseña cambiada. Hemos cerrado tus otras sesiones.");
    });
  }

  function sendPasswordLink() {
    return run(async () => {
      const result = await authClient.requestPasswordReset({
        email: user.email,
        redirectTo: `${window.location.origin}/cuenta?mode=reset`,
      });
      if (result.error)
        throw new Error(
          result.error.status === 429
            ? "Demasiados intentos. Espera un minuto y vuelve a probar."
            : "No hemos podido enviar el enlace. Inténtalo de nuevo.",
        );
      setMessage(
        `Te hemos enviado un enlace a ${user.email} para crear tu contraseña.`,
      );
    });
  }

  function exportData() {
    return run(async () => {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const parsed = workspaceSchema.safeParse(
        response.ok ? (await response.json()).data : null,
      );
      if (!parsed.success)
        throw new Error(
          "No se han podido descargar tus datos. Inténtalo de nuevo.",
        );
      downloadWorkspace(parsed.data);
    });
  }

  function requestDeletion() {
    setConfirming(false);
    return run(async () => {
      const result = await authClient.deleteUser({
        callbackURL: `${window.location.origin}/cuenta?eliminada=1`,
      });
      if (result.error)
        throw new Error(
          result.error.status === 429
            ? "Demasiados intentos. Espera un minuto y vuelve a probar."
            : "No hemos podido enviar el correo de confirmación. Inténtalo de nuevo.",
        );
      setDeletionSent(true);
    });
  }

  return (
    <div className="account-settings">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TU CUENTA</span>
          <h1>{user.name || "Tu cuenta"}</h1>
          <p className="muted">{user.email}</p>
        </div>
      </div>

      <section className="panel settings-section" aria-labelledby="password">
        <h2 id="password">
          <KeyRound size={19} aria-hidden="true" /> Contraseña
        </h2>
        {hasPassword ? (
          <form onSubmit={changePassword}>
            <fieldset disabled={busy}>
              <label className="auth-label">
                Contraseña actual
                <Input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                />
              </label>
              <div className="auth-label">
                <label htmlFor="new-password">Nueva contraseña</label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  aria-describedby="new-password-hint"
                />
                <small id="new-password-hint">
                  Al menos 12 caracteres. Cerraremos tus otras sesiones.
                </small>
              </div>
              <Button type="submit">Cambiar contraseña</Button>
            </fieldset>
          </form>
        ) : (
          <>
            <p>
              Entras con un código por correo. Si quieres, puedes crear también
              una contraseña.
            </p>
            <Button
              variant="outline"

              disabled={busy}
              onClick={sendPasswordLink}
            >
              Enviarme un enlace para crear una contraseña
            </Button>
          </>
        )}
      </section>

      <section className="panel settings-section" aria-labelledby="your-data">
        <h2 id="your-data">
          <Download size={19} aria-hidden="true" /> Tus datos
        </h2>
        <p>Descarga tus tarifas, facturas e historial en un archivo JSON.</p>
        <Button
          variant="outline"

          disabled={busy}
          onClick={exportData}
        >
          <Download size={16} /> Descargar mis datos
        </Button>
      </section>

      <section
        className="panel settings-section danger-zone"
        aria-labelledby="delete-account"
      >
        <h2 id="delete-account">
          <Trash2 size={19} aria-hidden="true" /> Eliminar cuenta
        </h2>
        {deletionSent ? (
          <Alert role="status">
            Te hemos enviado un correo a {user.email}. Abre el enlace en este
            navegador para eliminar la cuenta. Caduca en una hora. Hasta
            entonces no se borra nada.
          </Alert>
        ) : (
          <>
            <p>
              Borra tu cuenta y todo lo que guarda: tarifas, facturas e
              historial. Te enviaremos un correo para confirmarlo.
            </p>
            <Button
              variant="destructive"

              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={16} /> Eliminar mi cuenta
            </Button>
          </>
        )}
      </section>
      {confirming && (
        <ConfirmDialog
          title="¿Eliminar tu cuenta?"
          summary={
            <p>
              Se borrarán tu cuenta y todos sus datos. No se puede deshacer.
            </p>
          }
          consequence={
            <p className="muted">
              Si quieres conservarlos, descarga antes tus datos. Te enviaremos
              un correo a {user.email} para confirmar la eliminación.
            </p>
          }
          confirmLabel="Enviar correo de confirmación"
          onConfirm={requestDeletion}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
