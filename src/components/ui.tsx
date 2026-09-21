"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, Zap } from "lucide-react";
import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Luz en claro, inicio">
      <span className="brand-icon">
        <Zap size={22} fill="currentColor" />
      </span>
      <span>
        luz<span className="brand-light">enclaro</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Field({
  label,
  value,
  onChange,
  unit,
  hint,
  required = false,
  type = "text",
  placeholder,
  maxLength = 100,
  decimal = false,
  signed = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  decimal?: boolean;
  signed?: boolean;
}) {
  const id = useId();
  const pattern = signed ? "-?[0-9]+([.,][0-9]+)?" : "[0-9]+([.,][0-9]+)?";
  const invalid =
    decimal && value !== "" && !new RegExp(`^${pattern}$`).test(value);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap ${invalid ? "invalid" : ""}`}>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={decimal ? "decimal" : undefined}
          pattern={decimal ? pattern : undefined}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder ?? (decimal ? "0,00" : undefined)}
          aria-invalid={invalid || undefined}
          aria-describedby={
            [
              unit ? `${id}-unit` : "",
              hint ? `${id}-hint` : "",
              invalid ? `${id}-error` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {unit && <span id={`${id}-unit`}>{unit}</span>}
      </div>
      {invalid && (
        <small id={`${id}-error`} className="field-error">
          {signed
            ? "Usa un número válido, con coma o punto decimal."
            : "Usa un número positivo, con coma o punto decimal."}
        </small>
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
