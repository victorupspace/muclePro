"use client";

import { useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

type SelectFieldProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size" | "value" | "onChange"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  error?: string | null;
  success?: boolean;
  hint?: string;
};

// Select nativo com o mesmo visual do Field (label flutuante, estados de erro
// e sucesso), para manter o formulário de cadastro coeso.
export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  success,
  hint,
  className,
  id,
  onFocus,
  onBlur,
  ...rest
}: SelectFieldProps) {
  const reactId = useId();
  const selectId = id ?? `select-${reactId}`;
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const elevated = focused || hasValue;

  const showError = !!error && !focused;
  const showSuccess = !!success && !error;

  return (
    <div className={cn("group", className)}>
      <div
        className={cn(
          "relative flex h-[60px] items-end rounded-card border bg-white px-4 pb-2 pt-5 transition-all duration-200",
          showError
            ? "border-danger-400 shadow-[0_0_0_4px_rgba(239,68,68,0.08)]"
            : focused
              ? "border-brand/70 shadow-[0_0_0_4px_rgb(var(--color-brand)/0.10)]"
              : showSuccess
                ? "border-ink-300"
                : "border-ink-200 hover:border-ink-300",
        )}
      >
        <label
          htmlFor={selectId}
          className={cn(
            "pointer-events-none absolute left-4 origin-left transition-all duration-200",
            elevated
              ? "top-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500"
              : "top-1/2 -translate-y-1/2 text-[14px] font-medium text-ink-400",
            showError && elevated && "text-danger-500",
          )}
        >
          {label}
        </label>

        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            "w-full cursor-pointer appearance-none bg-transparent pr-12 text-[15px] font-medium outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            hasValue ? "text-ink-900" : "text-transparent",
          )}
          {...rest}
        >
          <option value="" disabled hidden />
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-ink-400">
          {showError ? (
            <AlertCircle className="h-4 w-4 text-danger-500" />
          ) : (
            showSuccess && <Check className="h-4 w-4 text-success-600" />
          )}
          <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(showError || hint) && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "mt-1.5 px-1 text-[12px]",
              showError ? "text-danger-500" : "text-ink-500",
            )}
          >
            {showError ? error : hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
