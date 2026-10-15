"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  hint?: string;
  icon?: ReactNode;
  count?: number;
  countTone?: "default" | "warn" | "danger";
  onSeeAll?: () => void;
  children: ReactNode;
  className?: string;
};

export function ModuleCard({
  title,
  hint,
  icon,
  count,
  countTone = "default",
  onSeeAll,
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-card border border-ink-200 bg-white p-4 md:p-5",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold tracking-[-0.005em] text-ink-900">{title}</p>
              {count !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ring-1 ring-inset",
                    countTone === "default" && "bg-ink-100 text-ink-700 ring-ink-200",
                    countTone === "warn" && "bg-warning-50 text-warning-700 ring-warning-200",
                    countTone === "danger" && "bg-danger-50 text-danger-700 ring-danger-200",
                  )}
                >
                  {count}
                </span>
              )}
            </div>
            {hint && <p className="mt-0.5 text-[11.5px] text-ink-500">{hint}</p>}
          </div>
        </div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-btn px-2 py-1 text-[11px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
          </button>
        )}
      </header>
      <div className="flex-1 border-t border-ink-100 pt-3">{children}</div>
    </div>
  );
}

export function ModuleEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12px] text-ink-500">
      {children}
    </div>
  );
}
