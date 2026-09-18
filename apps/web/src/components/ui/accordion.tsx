import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn.js";

/** Acordeón institucional (Radix: teclado, ARIA, animación de chevron). */
export function Acordeon({
  abiertos,
  children,
  className,
}: {
  abiertos?: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      {...(abiertos ? { defaultValue: abiertos } : {})}
      className={cn("space-y-2", className)}
    >
      {children}
    </AccordionPrimitive.Root>
  );
}

export function AcordeonItem({
  value,
  titulo,
  meta,
  children,
}: {
  value: string;
  titulo: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card"
    >
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-800">
          <span className="min-w-0 flex-1 text-sm font-bold text-navy-950">{titulo}</span>
          {meta && <span className="flex shrink-0 items-center gap-2">{meta}</span>}
          <ChevronDown
            size={18}
            className="shrink-0 text-grafito-600 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="border-t border-slate-200/70 px-4 py-3">
        {children}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
