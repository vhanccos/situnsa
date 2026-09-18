import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/** Tooltip institucional (solo donde aporta: iconos, badges, fechas relativas). */
export function Tooltip({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={350}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-md bg-navy-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-elevado"
          >
            {texto}
            <TooltipPrimitive.Arrow className="fill-navy-950" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
