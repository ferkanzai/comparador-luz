"use client";
import { LogOut } from "lucide-react";

export default function SignOutButton({
  disabled,
  onError,
}: {
  disabled: boolean;
  onError: (message: string) => void;
}) {
  return (
    <button
      className="icon-button"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      disabled={disabled}
      onClick={async () => {
        try {
          const { authClient } = await import("@/lib/auth-client");
          const result = await authClient.signOut();
          if (result.error) throw new Error();
          window.location.assign("/");
        } catch {
          onError("No se ha podido cerrar sesión. Inténtalo de nuevo.");
        }
      }}
    >
      <LogOut size={18} />
    </button>
  );
}
