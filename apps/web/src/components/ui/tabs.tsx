import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn.js";

/**
 * Tabs institucionales (Radix: teclado ←/→, ARIA, foco).
 * Cada Tab lleva contador opcional (ej. Documentos E1 · 3/7).
 */
export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsLista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex gap-1 print:hidden overflow-x-auto border-b border-slate-300 bg-transparent",
        className,
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function Tab({
  value,
  children,
  contador,
}: {
  value: string;
  children: ReactNode;
  contador?: ReactNode;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="group relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap text-grafito-600 transition-colors outline-none hover:text-navy-950 focus-visible:ring-2 focus-visible:ring-navy-800 data-[state=active]:border-guinda-800 data-[state=active]:font-bold data-[state=active]:text-navy-950"
    >
      {children}
      {contador != null && (
        <span className="rounded-full bg-navy-950/[0.07] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-navy-950 group-data-[state=active]:bg-guinda-800 group-data-[state=active]:text-white">
          {contador}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Content value={value} className={cn("pt-4 outline-none", className)}>
      {children}
    </TabsPrimitive.Content>
  );
}
