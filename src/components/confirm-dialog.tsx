"use client";
import { useRef, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "./ui";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({
  title,
  summary,
  consequence,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  summary: ReactNode;
  consequence: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      title={title}
      className="confirm-dialog"
      initialFocusRef={cancel}
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="confirm-summary">
          <span className="confirm-icon" aria-hidden="true">
            <Trash2 size={22} />
          </span>
          <div>{summary}</div>
        </div>
        {consequence}
        <div className="modal-actions">
          <Button variant="outline" ref={cancel} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 size={16} /> {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
