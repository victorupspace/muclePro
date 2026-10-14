"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
};

export function PipelineFilter({ label, value, onChange, options, className }: Props) {
  return (
    <label
      className={cn(
        "group relative flex h-12 min-w-0 flex-col justify-center rounded-card border border-ink-200 bg-white px-3 shadow-[0_10px_28px_-24px_rgba(17,17,17,0.28)] transition-all focus-within:border-ink-400 focus-within:shadow-[0_16px_34px_-24px_rgba(17,17,17,0.38)] hover:border-ink-300",
        className,
      )}
    >
      <span className="pointer-events-none truncate text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </span>
      <div className="relative mt-1 min-w-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full min-w-0 cursor-pointer appearance-none overflow-hidden text-ellipsis whitespace-nowrap bg-transparent pr-5 text-[12.5px] font-semibold leading-none text-ink-900 outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400 transition-transform group-focus-within:rotate-180 group-focus-within:text-ink-700"
          strokeWidth={2.2}
        />
      </div>
    </label>
  );
}
