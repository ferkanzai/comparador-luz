"use client";
import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Field as UiField,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Empty as UiEmpty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { X, Zap } from "lucide-react";
import Link from "next/link";
import { lockModalScroll } from "@/lib/modal-scroll";
import { Button } from "@/components/ui/button";
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
  const input = {
    id,
    name: id,
    type,
    value,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    inputMode: decimal ? ("decimal" as const) : undefined,
    pattern: decimal ? pattern : undefined,
    required,
    maxLength,
    placeholder,
    "aria-invalid": invalid || undefined,
    "aria-describedby":
      [
        unit ? `${id}-unit` : "",
        hint ? `${id}-hint` : "",
        invalid ? `${id}-error` : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  };
  // `field` stays as a hook for the layouts around it (spacing, period dots).
  return (
    <UiField className="field" data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {unit ? (
        <InputGroup>
          <InputGroupInput {...input} />
          <InputGroupAddon align="inline-end">
            <InputGroupText id={`${id}-unit`}>{unit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      ) : (
        <Input {...input} />
      )}
      {invalid && (
        <FieldError id={`${id}-error`}>
          {signed
            ? "Usa un número válido, con coma o punto decimal."
            : "Usa un número positivo, con coma o punto decimal."}
        </FieldError>
      )}
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </UiField>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = "",
  initialFocusRef,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    initialFocusRef?.current?.focus();
    const unlock = lockModalScroll();
    return () => {
      dialog?.close();
      unlock();
    };
  }, [initialFocusRef]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} />
        </Button>
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
    <UiEmpty className="empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        {/* A heading, so the empty state reads as a section of the page. */}
        <EmptyTitle>
          <h3>{title}</h3>
        </EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </UiEmpty>
  );
}
