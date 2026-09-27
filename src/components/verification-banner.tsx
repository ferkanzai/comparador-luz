"use client";
import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// Dismissed for the browser session; it returns on the next visit.
const dismissedKey = "luz:verification-dismissed";
const readDismissed = () => {
  try {
    return sessionStorage.getItem(dismissedKey) === "1";
  } catch {
    return false;
  }
};

export default function VerificationBanner({
  email,
  busy,
  onBusyChange,
  onSent,
  onError,
}: {
  email: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onSent: (message: string) => void;
  onError: (message: string) => void;
}) {
  const stored = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  if (stored || dismissed) return null;
  return (
    <Alert className="flex flex-wrap items-center gap-4" role="note">
      <span>
        Confirma tu dirección de correo con el enlace que te hemos enviado.
      </span>
      <Button
        variant="link"
        size="inline"
        type="button"
        disabled={busy}
        onClick={async () => {
          onBusyChange(true);
          try {
            const { authClient } = await import("@/lib/auth-client");
            const result = await authClient.sendVerificationEmail({
              email,
              callbackURL: `${window.location.origin}/`,
            });
            if (result.error) throw new Error();
            onSent("Correo enviado. Revisa también la carpeta de spam.");
          } catch {
            onError(
              "No se ha podido enviar el correo. Espera un minuto y vuelve a intentarlo.",
            );
          } finally {
            onBusyChange(false);
          }
        }}
      >
        Reenviar correo
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        aria-label="Ocultar aviso"
        onClick={() => {
          try {
            sessionStorage.setItem(dismissedKey, "1");
          } catch {
            /* Storage unavailable; hide it for this page only. */
          }
          setDismissed(true);
        }}
      >
        <X size={16} />
      </Button>
    </Alert>
  );
}
