"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Feedback = { id: number; text: string; kind: "success" | "error" };
export function useFeedback() {
  const [message, setNotice] = useState<Feedback | null>(null);
  const sequence = useRef(0);
  const setMessage = useCallback(
    (text: string, kind: Feedback["kind"] = "success") => {
      setNotice(text ? { id: ++sequence.current, text, kind } : null);
    },
    [],
  );
  const dismiss = useCallback(() => setNotice(null), []);
  return { message, setMessage, dismiss };
}

export default function FeedbackNotice({
  message,
  onDismiss,
}: {
  message: Feedback;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const duration =
    message.kind === "error" ? 0 : message.text.length > 140 ? 15000 : 8000;
  useEffect(() => {
    if (!duration || hovered || focused) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(onDismiss, duration);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [message.id, duration, hovered, focused, onDismiss]);
  return (
    <div
      className={`notice feedback-notice ${message.kind}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <span role={message.kind === "error" ? "alert" : "status"}>
        {message.text}
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
