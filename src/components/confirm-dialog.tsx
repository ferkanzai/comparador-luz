"use client";
import { useRef, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "./ui";

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
          <button className="button secondary" ref={cancel} onClick={onClose}>
            Cancelar
          </button>
          <button className="button confirm-danger" onClick={onConfirm}>
            <Trash2 size={16} /> {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
