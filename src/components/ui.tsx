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
/** The logo. `inverse` turns it lime, for dark panels. */
export function Brand({
  inverse = false,
  className,
}: {
  inverse?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 font-heading text-2xl/[1.6] font-bold tracking-[-1px] whitespace-nowrap max-[520px]:gap-2 max-[520px]:text-xl/[1.6]",
        className,
      )}
      aria-label="Luz en claro, inicio"
    >
      <span
        className={cn(
          "grid h-[38px] w-[34px] place-items-center rounded-lg max-[520px]:h-8 max-[520px]:w-7 max-[520px]:rounded-md max-[520px]:[&_svg]:w-[18px]",
          inverse ? "bg-lime text-inverse" : "bg-foreground text-lime",
        )}
      >
        <Zap size={22} fill="currentColor" />
      </span>
      <span>
        luz<span className="font-normal">enclaro</span>
        <span className={inverse ? "text-lime" : "text-brand-leaf"}>.</span>
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
  className,
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
  className?: string;
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
  return (
    <UiField
      className={cn("min-w-0", className)}
      data-invalid={invalid || undefined}
    >
      <FieldLabel htmlFor={id} className="mb-1.5 text-muted-foreground">
        {label}
      </FieldLabel>
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
  size = "default",
  className,
  initialFocusRef,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** The dialog's width from the `md` breakpoint up. */
  size?: "default" | "wide" | "full";
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
  const content = cn("overscroll-contain", className);
  const head = "flex-row items-center justify-between gap-4 border-b";
  const title_ = "font-heading text-xl font-bold tracking-[-0.55px]";
  if (desktop)
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            "flex max-h-[90dvh] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-[640px]",
            size === "wide" && "sm:max-w-[960px]",
            size === "full" && "sm:max-w-[min(1440px,calc(100vw-2rem))]",
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
    <UiEmpty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        {/* A heading, so the empty state reads as a section of the page. Its
            size alone changes; the line height stays the title's. */}
        <EmptyTitle>
          <h3 className="text-[length:var(--text-xl)] font-bold tracking-[-0.25px] max-[520px]:text-[length:var(--text-lg)]">
            {title}
          </h3>
        </EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </UiEmpty>
  );
}
