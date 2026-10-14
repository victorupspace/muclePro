"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type Tab<TValue extends string> = {
  value: TValue;
  label: string;
  count?: number;
  icon?: React.ReactNode;
};

type Props<TValue extends string> = {
  tabs: Tab<TValue>[];
  active: TValue;
  onChange: (value: TValue) => void;
};

export function Tabs<TValue extends string>({ tabs, active, onChange }: Props<TValue>) {
  return (
    <div className="-mx-3.5 overflow-x-auto border-b border-ink-200 px-3.5 md:mx-0 md:px-0">
      <div className="flex min-w-max items-center gap-1">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                "relative inline-flex h-11 items-center gap-1.5 px-3 text-[13px] font-semibold transition-colors",
                isActive ? "text-ink-900" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                    isActive ? "bg-brand text-white" : "bg-ink-100 text-ink-600",
                  )}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-brand"
                  transition={{ duration: 0.28, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
