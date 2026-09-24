"use client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
  return (
    <Alert className="verification-banner" role="note">
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
    </Alert>
  );
}
