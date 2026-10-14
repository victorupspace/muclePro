"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  delay?: number;
};

export function KpiCard({ label, value, hint, href, highlight, icon, action, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      <div
        className={cn(
          "group relative flex h-full flex-col justify-between rounded-card border bg-white p-4 transition-all duration-200 md:p-5",
          href
            ? "hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-[0_18px_40px_-22px_rgba(17,17,17,0.25)]"
            : "",
          highlight ? "border-brand/40 ring-1 ring-inset ring-brand/15" : "border-ink-200",
        )}
      >
        {href && (
          <Link
            href={href}
            aria-label={`Abrir ${label}`}
            className="absolute inset-0 z-10 rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
          />
        )}

        <div
          className={cn(
            "relative z-20 flex items-start justify-between gap-2",
            href ? "pointer-events-none" : "",
          )}
        >
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
          {icon && (
            <span
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full",
                highlight ? "bg-brand/10 text-brand" : "bg-ink-100 text-ink-600",
              )}
            >
              {icon}
            </span>
          )}
        </div>

        <p
          className={cn(
            "relative z-20 mt-3 text-[24px] font-bold leading-[1] tracking-[-0.025em] md:text-[28px]",
            href ? "pointer-events-none" : "",
            highlight ? "text-brand" : "text-ink-900",
          )}
        >
          {value}
        </p>

        <div
          className={cn(
            "relative z-20 mt-3 flex items-center justify-between gap-2",
            href ? "pointer-events-none" : "",
          )}
        >
          {hint && <p className="text-[11.5px] text-ink-500">{hint}</p>}
          {href && (
            <ArrowUpRight
              className="ml-auto h-3.5 w-3.5 text-ink-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink-900"
              strokeWidth={2.2}
            />
          )}
        </div>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="relative z-20 mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            {action.icon}
            {action.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}
