"use client";
import { useId, type ChangeEvent, type ReactNode, type RefObject } from "react";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { X, Zap } from "lucide-react";
import Link from "next/link";
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
/**
 * A dialog from the `md` breakpoint up, and a bottom drawer below it that is
 * dragged only by its handle, so scrolling a long form never dismisses it.
 */
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
  const desktop = useMediaQuery("(min-width: 768px)");
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  const onOpenAutoFocus = (event: Event) => {
    if (!initialFocusRef?.current) return;
    event.preventDefault();
    initialFocusRef.current.focus();
  };
  const close = (
    <Button variant="ghost" size="icon" aria-label="Cerrar">
      <X />
    </Button>
  );
  // `modal` remains a hook for the form layouts inside dialogs.
  const content = cn("modal", className);
  const head =
    "modal-head flex-row items-center justify-between gap-4 border-b";
  const title_ = "font-heading text-xl font-bold";
  if (desktop)
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            "flex max-h-[90dvh] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-[510px]",
            wide && "sm:max-w-[800px]",
            className.includes("finalist-modal") &&
              "sm:max-w-[min(1440px,calc(100vw-2rem))]",
            content,
          )}
        >
          <DialogHeader className={cn(head, "px-6 py-4")}>
            <DialogTitle className={title_}>{title}</DialogTitle>
            <DialogClose asChild>{close}</DialogClose>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">{children}</div>
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open onOpenChange={onOpenChange} handleOnly>
      <DrawerContent
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "bg-background data-[vaul-drawer-direction=bottom]:max-h-[90dvh]",
          content,
        )}
      >
        <DrawerHeader className={cn(head, "px-5 py-3 text-left")}>
          <DrawerTitle className={title_}>{title}</DrawerTitle>
          <DrawerClose asChild>{close}</DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </DrawerContent>
    </Drawer>
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
