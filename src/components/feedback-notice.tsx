"use client";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Short-lived messages: confirmations and failures shown as toasts at the
 * bottom centre. Errors stay longer. Persistent states use an Alert instead.
 */
export function notify(text: string, kind: "success" | "error" = "success") {
  if (!text) return;
  if (kind === "error") toast.error(text, { duration: 12000 });
  else toast.success(text, { duration: text.length > 140 ? 15000 : 8000 });
}

/** A component's messages, as toasts. An empty message clears nothing: toasts expire. */
export function useFeedback() {
  const setMessage = useCallback(
    (text: string, kind: "success" | "error" = "success") => notify(text, kind),
    [],
  );
  return { setMessage };
}
