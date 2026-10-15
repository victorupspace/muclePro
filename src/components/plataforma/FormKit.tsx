"use client";

import { cn } from "@/lib/cn";

// Classes e peças de formulário compartilhadas pelos modais da plataforma,
// com o mesmo visual dos formulários existentes.

export const inputClass =
  "h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export const selectClass =
  "h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export const textareaClass =
  "w-full rounded-btn border border-ink-200 bg-white px-3 py-2.5 text-[13px] leading-[1.5] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-[1.45] text-ink-500">{hint}</span>}
    </label>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-ink-100 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-400">
      {children}
    </p>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-btn border px-3 py-2.5 text-left transition-colors",
        checked ? "border-brand/30 bg-brand/[0.04]" : "border-ink-200 bg-white hover:border-ink-300",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-ink-500">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand" : "bg-ink-200",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

export function ModalFooter({
  onCancel,
  formId,
  submitting,
  submitLabel,
  submittingLabel = "Salvando...",
  cancelLabel = "Cancelar",
  tone = "brand",
  extra,
}: {
  onCancel: () => void;
  formId: string;
  submitting: boolean;
  submitLabel: string;
  submittingLabel?: string;
  cancelLabel?: string;
  tone?: "brand" | "danger";
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      {extra && <div className="sm:mr-auto">{extra}</div>}
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={formId}
        disabled={submitting}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center rounded-btn px-4 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto",
          tone === "brand" ? "bg-brand hover:bg-brand-hover" : "bg-danger-600 hover:bg-danger-700",
        )}
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}

// Entrada de valor em reais. Guarda o número em centavos para evitar erros
// de ponto flutuante enquanto o usuário digita.
export function CurrencyInput({
  value,
  onChange,
  required,
  placeholder = "0,00",
}: {
  value: number | "";
  onChange: (next: number | "") => void;
  required?: boolean;
  placeholder?: string;
}) {
  const display = value === "" ? "" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-400">
        R$
      </span>
      <input
        inputMode="decimal"
        value={display}
        required={required}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (!digits) {
            onChange("");
            return;
          }
          onChange(Number(digits) / 100);
        }}
        className={cn(inputClass, "pl-9 tabular-nums")}
      />
    </div>
  );
}
