"use client";

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
    <div className="notice verification-banner">
      <span>
        Ya estás dentro. Te hemos enviado un correo para confirmar tu dirección.
      </span>
      <button
        type="button"
        className="link-button"
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
      </button>
    </div>
  );
}
