"use client";
import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { useFeedback } from "./feedback-notice";
import MethodModal from "./method-modal";

type PageContextValue = ReturnType<typeof useFeedback> & {
  error: string;
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
  const { message, setMessage, dismiss } = useFeedback();
  const [error, setError] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);
  const value = useMemo(
    () => ({
      message,
      setMessage,
      dismiss,
      error,
      setError,
      openMethod: () => setMethodOpen(true),
    }),
    [message, setMessage, dismiss, error],
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
    <button className="link-button" onClick={openMethod}>
      Método y fuentes
    </button>
  );
}
