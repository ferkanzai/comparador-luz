"use client";
import { useRef, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Confirms a destructive action: an alert dialog from the `md` breakpoint up,
 * a bottom drawer with the actions within thumb reach below it. Focus starts
 * on "Cancelar".
 */
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
  const desktop = useMediaQuery("(min-width: 768px)");
  const cancel = useRef<HTMLButtonElement>(null);
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  const onOpenAutoFocus = (event: Event) => {
    event.preventDefault();
    cancel.current?.focus();
  };
  const body = (
    <div className="mb-5 flex items-center gap-3.5 [&_h3]:wrap-anywhere [&_p]:text-xs-plus">
      <span
        className="grid h-[46px] flex-[0_0_46px] place-items-center rounded-full bg-destructive-muted text-destructive"
        aria-hidden="true"
      >
        <Trash2 size={22} />
      </span>
      <div className="min-w-0">{summary}</div>
    </div>
  );
  const actions = (
    <>
      <Button variant="outline" ref={cancel} onClick={onClose}>
        Cancelar
      </Button>
      <Button variant="destructive" onClick={onConfirm}>
        <Trash2 data-icon="inline-start" /> {confirmLabel}
      </Button>
    </>
  );
  if (desktop)
    return (
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent onOpenAutoFocus={onOpenAutoFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </AlertDialogHeader>
          {body}
          <AlertDialogDescription asChild>
            <div>{consequence}</div>
          </AlertDialogDescription>
          <AlertDialogFooter>{actions}</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  return (
    <Drawer open onOpenChange={onOpenChange} handleOnly>
      <DrawerContent onOpenAutoFocus={onOpenAutoFocus}>
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-heading text-xl font-bold">
            {title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4">
          {body}
          {consequence}
        </div>
        <DrawerFooter className="grid grid-cols-2">{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
