"use client";
import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { notify } from "./feedback-notice";
import MethodModal from "./method-modal";
import { Button } from "@/components/ui/button";

type PageContextValue = {
  /** A confirmation toast; an empty string shows nothing. */
  setMessage: (text: string) => void;
  /** An error toast; an empty string shows nothing. */
  setError: (error: string) => void;
  openMethod: () => void;
};

const PageContext = createContext<PageContextValue | null>(null);

export function PageProvider({
  method,
  children,
}: {
  method: ReactNode;
  children: ReactNode;
}) {
  const [methodOpen, setMethodOpen] = useState(false);
  const value = useMemo(
    () => ({
      setMessage: (text: string) => notify(text),
      setError: (text: string) => notify(text, "error"),
      openMethod: () => setMethodOpen(true),
    }),
    [],
  );
  return (
    <PageContext value={value}>
      {children}
      {methodOpen && (
        <MethodModal onClose={() => setMethodOpen(false)}>{method}</MethodModal>
      )}
    </PageContext>
  );
}

export function usePage() {
  const value = use(PageContext);
  if (!value) throw new Error("usePage must be used inside PageProvider");
  return value;
}

export function MethodButton() {
  const { openMethod } = usePage();
  return (
    <Button variant="link" size="inline" onClick={openMethod}>
      Método y fuentes
    </Button>
  );
}
