import type { ReactNode } from "react";
import { Brand } from "./ui";
import { shell } from "./shell-styles";
import { cn } from "@/lib/utils";

export default function SiteHeader({ actions }: { actions: ReactNode }) {
  return (
    <header className="border-b border-border bg-white/70">
      <div
        className={cn(
          shell,
          "flex min-h-[86px] items-center justify-between gap-6 max-[800px]:py-2.5 max-[520px]:min-h-[73px] max-[520px]:gap-2.5",
        )}
      >
        <Brand className="max-[520px]:shrink-0 max-[520px]:text-lg/[1.6]" />
        <span className="mr-auto ml-6 text-sm/[1.6] tracking-[1.5px] text-muted-foreground max-[1000px]:hidden">
          TU ELECTRICIDAD, BAJO CONTROL
        </span>
        <div className="flex min-w-0 items-center gap-7 max-[800px]:ml-auto max-[520px]:gap-2">
          {actions}
        </div>
      </div>
    </header>
  );
}
