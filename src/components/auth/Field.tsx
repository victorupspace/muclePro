"use client";

import { forwardRef, useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  error?: string | null;
  success?: boolean;
  loading?: boolean;
  hint?: string;
  rightSlot?: React.ReactNode;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, success, loading, hint, rightSlot, className, id, value, onFocus, onBlur, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? `field-${reactId}`;
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const elevated = focused || hasValue;

  const showError = !!error && !focused;
  const showSuccess = !!success && !error;
  const hasRightAdornment = !!rightSlot || loading || showError || showSuccess;

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
          htmlFor={inputId}
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

        <input
          ref={ref}
          id={inputId}
          value={value ?? ""}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            "w-full bg-transparent text-[15px] font-medium text-ink-900 placeholder-transparent outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            hasRightAdornment && (rightSlot && showSuccess ? "pr-14" : "pr-8"),
            "[&:-webkit-autofill]:bg-transparent",
          )}
          {...rest}
        />

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-ink-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-500" />
          ) : showError ? (
            <AlertCircle className="h-4 w-4 text-danger-500" />
          ) : (
            <>
              {rightSlot}
              {showSuccess && <Check className="h-4 w-4 text-success-600" />}
            </>
          )}
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
});
