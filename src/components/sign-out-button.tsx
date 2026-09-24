"use client";
import { LogOut } from "lucide-react";
import { usePage } from "./page-context";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const { setError } = usePage();
  return (
    <Button
      variant="ghost"
      size="icon"

      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      onClick={async () => {
        try {
          const { authClient } = await import("@/lib/auth-client");
          const result = await authClient.signOut();
          if (result.error) throw new Error();
          window.location.assign("/");
        } catch {
          setError("No se ha podido cerrar sesión. Inténtalo de nuevo.");
        }
      }}
    >
      <LogOut size={18} />
    </Button>
  );
}
