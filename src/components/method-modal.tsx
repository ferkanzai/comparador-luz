"use client";
import type { ReactNode } from "react";
import { Modal } from "./ui";

export default function MethodModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal title="Sin letra pequeña en el cálculo" onClose={onClose}>
      <div className="p-6 max-[520px]:p-5">{children}</div>
    </Modal>
  );
}
