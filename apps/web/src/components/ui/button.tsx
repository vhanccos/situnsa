import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn.js";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" };

/** Primitivo shadcn/ui mínimo (Button). Radix completo = siguiente iteración RF. */
export function Button({ variant = "default", className, ...rest }: Props) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
        variant === "default"
          ? "bg-slate-900 text-white hover:bg-slate-700"
          : "border border-slate-300 hover:bg-slate-100",
        className,
      )}
      {...rest}
    />
  );
}
