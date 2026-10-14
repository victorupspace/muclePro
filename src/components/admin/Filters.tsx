"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar por nome, email, telefone ou documento",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-11 items-center md:h-10", className)}>
      <Search className="absolute left-3 h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-btn border border-ink-200 bg-white pl-9 pr-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
      />
    </div>
  );
}

type Option = { value: string; label: string };

export function SelectFilter({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("relative inline-flex h-11 w-full min-w-0 items-center gap-2 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] sm:w-auto sm:flex-1 md:h-10 md:flex-initial", className)}>
      <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent pr-1 font-semibold text-ink-900 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
