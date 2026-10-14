"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
};

export function DatePickerField({
  label,
  value,
  onChange,
  required,
  placeholder = "dd/mm/aaaa",
}: DatePickerFieldProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const monthDays = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const todayValue = toDateValue(new Date());
  const monthLabel = formatMonth(viewDate);

  function selectDate(date: Date) {
    onChange(toDateValue(date));
    setOpen(false);
  }

  function selectQuick(days: number) {
    selectDate(addDays(new Date(), days));
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </span>

      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-3 rounded-btn border border-ink-200 bg-white px-3 text-left text-[13px] outline-none transition-colors hover:border-ink-300 focus:border-ink-400",
            value ? "font-medium text-ink-900" : "text-ink-400",
          )}
        >
          <span>{selectedDate ? formatDate(selectedDate) : placeholder}</span>
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-ink-500" strokeWidth={2.3} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-[70] mx-auto w-full max-w-[320px] rounded-card border border-ink-200 bg-white p-2.5 shadow-[0_24px_70px_-24px_rgba(17,17,17,0.38)] sm:right-auto sm:mx-0 sm:max-w-[312px]"
            >
              <div className="grid grid-cols-3 gap-2">
                <QuickButton active={value === todayValue} onClick={() => selectQuick(0)}>
                  Hoje
                </QuickButton>
                <QuickButton onClick={() => selectQuick(1)}>Amanhã</QuickButton>
                <QuickButton onClick={() => selectQuick(7)}>Próxima semana</QuickButton>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-card bg-ink-50 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setViewDate((current) => addMonths(current, -1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-white hover:text-ink-900"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
                </button>
                <p className="text-[13px] font-bold text-ink-900">{monthLabel}</p>
                <button
                  type="button"
                  onClick={() => setViewDate((current) => addMonths(current, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-white hover:text-ink-900"
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
                  return (
                    <button
                      key={dateValue}
                      type="button"
                      onClick={() => selectDate(date)}
                      className={cn(
                        "inline-flex h-8 items-center justify-center rounded-btn text-[12px] font-semibold transition-colors sm:h-8",
                        selected
                          ? "bg-brand text-white shadow-[0_10px_24px_-14px_rgb(var(--color-brand)/0.75)]"
                          : isToday
                            ? "border border-brand/30 bg-brand/10 text-brand"
                            : currentMonth
                              ? "text-ink-800 hover:bg-ink-100"
                              : "text-ink-300 hover:bg-ink-50",
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
                    onChange("");
                    setOpen(false);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-btn px-2 text-[12px] font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => selectQuick(0)}
                  className="inline-flex h-8 items-center rounded-btn px-2 text-[12px] font-semibold text-brand transition-colors hover:bg-brand/10"
                >
                  Hoje
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </label>
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

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonth(date: Date) {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
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
