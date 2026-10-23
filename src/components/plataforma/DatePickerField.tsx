"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { maskDateBR, parseDateBR } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const POPOVER_WIDTH = 312;
const POPOVER_HEIGHT = 400;

type DatePickerFieldProps = {
  // Sem rótulo quando o campo já está dentro de um <Field>.
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  // Limites no formato aaaa-mm-dd.
  min?: string;
  max?: string;
  // Esconde "Hoje / Amanhã / Próxima semana" (ex.: data de nascimento).
  hideShortcuts?: boolean;
  // Erro vindo do formulário (ex.: idade mínima).
  error?: string | null;
  hint?: string;
  // Mensagens próprias para data antes de min / depois de max.
  minMessage?: string;
  maxMessage?: string;
  disabled?: boolean;
  // Visual escuro/alto (ex.: área do aluno).
  className?: string;
};

// Campo de data: dá para digitar (dd/mm/aaaa) ou escolher no calendário.
// O calendário abre num portal com posição fixa, então não é cortado por
// modais ou áreas com rolagem.
export function DatePickerField({
  label,
  value,
  onChange,
  required,
  placeholder = "dd/mm/aaaa",
  min,
  max,
  hideShortcuts,
  error,
  hint,
  minMessage,
  maxMessage,
  disabled,
  className,
}: DatePickerFieldProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => isoToBR(value));
  const [typingError, setTypingError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? parseDateValue(max ?? "") ?? new Date());

  // Valor trocado por fora (abrir o formulário, limpar): reflete no texto.
  useEffect(() => {
    setText(isoToBR(value));
    setTypingError(null);
  }, [value]);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  const place = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= POPOVER_HEIGHT || spaceBelow >= rect.top ? rect.bottom + 6 : Math.max(8, rect.top - POPOVER_HEIGHT - 6);
    setPosition({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const monthDays = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const todayValue = toDateValue(new Date());
  const years = useMemo(() => {
    const from = Number((min ?? "1900").slice(0, 4));
    const to = Number((max ?? `${new Date().getFullYear() + 5}`).slice(0, 4));
    return Array.from({ length: Math.max(1, to - from + 1) }, (_, i) => to - i);
  }, [min, max]);

  const outOfRange = (iso: string) => Boolean((min && iso < min) || (max && iso > max));

  function commit(iso: string) {
    if (outOfRange(iso)) {
      setTypingError(
        (max && iso > max ? maxMessage : undefined) ?? (min && iso < min ? minMessage : undefined) ?? rangeMessage(min, max),
      );
      return;
    }
    setTypingError(null);
    onChange(iso);
  }

  function handleType(raw: string) {
    const masked = maskDateBR(raw);
    setText(masked);
    if (!masked) {
      setTypingError(null);
      onChange("");
      return;
    }
    if (masked.length < 10) {
      setTypingError(null);
      return;
    }
    const iso = parseDateBR(masked);
    if (!iso) {
      setTypingError("Essa data não existe. Confira dia e mês.");
      return;
    }
    commit(iso);
  }

  function handleBlur() {
    if (text && text.length < 10) setTypingError("Complete a data no formato dd/mm/aaaa.");
  }

  function selectDate(date: Date) {
    const iso = toDateValue(date);
    if (outOfRange(iso)) return;
    setText(isoToBR(iso));
    commit(iso);
    setOpen(false);
  }

  const shownError = typingError ?? error ?? null;

  return (
    <div className="block">
      {label && (
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
          {label}
          {required && <span className="ml-1 text-brand">*</span>}
        </span>
      )}

      <div
        ref={anchorRef}
        className={cn(
          "flex h-10 w-full items-center rounded-btn border bg-white transition-colors focus-within:border-ink-400",
          shownError ? "border-danger-300" : "border-ink-200 hover:border-ink-300",
          disabled && "pointer-events-none opacity-60",
          className,
        )}
      >
        <input
          value={text}
          onChange={(e) => handleType(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="off"
          aria-label={label ?? "Data"}
          disabled={disabled}
          aria-invalid={Boolean(shownError)}
          required={required}
          className="h-full min-w-0 flex-1 rounded-btn bg-transparent px-3 text-[13px] font-medium text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
        />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-label="Abrir calendário"
          aria-expanded={open}
          className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.3} />
        </button>
      </div>
      {shownError ? (
        <p role="alert" className="mt-1 text-[11.5px] font-semibold text-danger-600">
          {shownError}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-ink-500">{hint}</p>
      ) : null}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && position && (
              <motion.div
                ref={popRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: EASE }}
                style={{ position: "fixed", top: position.top, left: position.left, width: position.width }}
                className="z-[90] rounded-card border border-ink-200 bg-white p-2.5 shadow-[0_24px_70px_-24px_rgba(17,17,17,0.38)]"
              >
                {!hideShortcuts && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <QuickButton active={value === todayValue} onClick={() => selectDate(new Date())}>
                      Hoje
                    </QuickButton>
                    <QuickButton onClick={() => selectDate(addDays(new Date(), 1))}>Amanhã</QuickButton>
                    <QuickButton onClick={() => selectDate(addDays(new Date(), 7))}>Próxima semana</QuickButton>
                  </div>
                )}

                <div className="flex items-center justify-between gap-1 rounded-card bg-ink-50 px-1.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => setViewDate((current) => addMonths(current, -1))}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-white hover:text-ink-900"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                  <div className="flex min-w-0 items-center gap-1">
                    <select
                      value={viewDate.getMonth()}
                      onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), Number(e.target.value), 1))}
                      aria-label="Mês"
                      className="h-8 rounded-btn bg-transparent px-1 text-[13px] font-bold text-ink-900 outline-none hover:bg-white"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={viewDate.getFullYear()}
                      onChange={(e) => setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))}
                      aria-label="Ano"
                      className="h-8 rounded-btn bg-transparent px-1 text-[13px] font-bold text-ink-900 outline-none hover:bg-white"
                    >
                      {!years.includes(viewDate.getFullYear()) && <option value={viewDate.getFullYear()}>{viewDate.getFullYear()}</option>}
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewDate((current) => addMonths(current, 1))}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-white hover:text-ink-900"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-7 gap-0.5 text-center">
                  {WEEKDAYS.map((day) => (
                    <span key={day} className="py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-500">
                      {day}
                    </span>
                  ))}
                  {monthDays.map(({ date, currentMonth }) => {
                    const dateValue = toDateValue(date);
                    const selected = value === dateValue;
                    const isToday = todayValue === dateValue;
                    const disabled = outOfRange(dateValue);
                    return (
                      <button
                        key={dateValue}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectDate(date)}
                        className={cn(
                          "inline-flex h-8 items-center justify-center rounded-btn text-[12px] font-semibold transition-colors",
                          disabled
                            ? "cursor-not-allowed text-ink-300"
                            : selected
                              ? "bg-brand text-white shadow-[0_10px_24px_-14px_rgb(var(--color-brand)/0.75)]"
                              : isToday
                                ? "border border-brand/30 bg-brand/10 text-brand"
                                : currentMonth
                                  ? "text-ink-800 hover:bg-ink-100"
                                  : "text-ink-400 hover:bg-ink-50",
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-ink-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      setTypingError(null);
                      onChange("");
                      setOpen(false);
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-btn px-2 text-[12px] font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Limpar
                  </button>
                  {!outOfRange(todayValue) && (
                    <button
                      type="button"
                      onClick={() => selectDate(new Date())}
                      className="inline-flex h-8 items-center rounded-btn px-2 text-[12px] font-semibold text-brand transition-colors hover:bg-brand/10"
                    >
                      Hoje
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function QuickButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-btn px-2 text-[11.5px] font-semibold transition-colors sm:px-3 sm:text-[12px]",
        active
          ? "border border-brand/30 bg-brand/10 text-brand"
          : "bg-ink-50 text-ink-600 hover:bg-ink-100 hover:text-ink-900",
      )}
    >
      {children}
    </button>
  );
}

function rangeMessage(min?: string, max?: string) {
  if (min && max) return `Escolha uma data entre ${isoToBR(min)} e ${isoToBR(max)}.`;
  if (max) return `A data precisa ser até ${isoToBR(max)}.`;
  return `A data precisa ser a partir de ${isoToBR(min ?? "")}.`;
}

function isoToBR(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthGrid(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = addDays(first, -startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      currentMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
}
