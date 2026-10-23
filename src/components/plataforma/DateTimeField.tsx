"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { DatePickerField } from "./DatePickerField";
import { maskTimeBR, parseTimeBR } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";

type Props = {
  // Mesmo formato do antigo datetime-local: "aaaa-mm-ddTHH:mm" ou "".
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  defaultTime?: string;
  min?: string;
};

// Data (dd/mm/aaaa) + hora em 24h (HH:mm), no padrão brasileiro,
// independente do idioma do navegador.
export function DateTimeField({ value, onChange, required, defaultTime = "09:00", min }: Props) {
  const date = value.slice(0, 10);
  const [time, setTime] = useState(value.slice(11, 16));
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    setTime(value.slice(11, 16));
  }, [value]);

  function changeDate(next: string) {
    if (!next) return onChange("");
    const t = parseTimeBR(time) ?? defaultTime;
    setTime(t);
    onChange(`${next}T${t}`);
  }

  function changeTime(raw: string) {
    const masked = maskTimeBR(raw);
    setTime(masked);
    if (masked.length < 5) {
      setTimeError(null);
      return;
    }
    const t = parseTimeBR(masked);
    if (!t) {
      setTimeError("Hora inválida. Use 24h, ex.: 19:30.");
      return;
    }
    setTimeError(null);
    if (date) onChange(`${date}T${t}`);
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <DatePickerField value={date} onChange={changeDate} required={required} min={min} />
        </div>
        <label
          className={cn(
            "flex h-10 w-[104px] shrink-0 items-center gap-1.5 rounded-btn border bg-white px-2.5 transition-colors focus-within:border-ink-400",
            timeError ? "border-danger-300" : "border-ink-200 hover:border-ink-300",
          )}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-ink-500" strokeWidth={2.3} />
          <input
            value={time}
            onChange={(e) => changeTime(e.target.value)}
            onBlur={() => time && time.length < 5 && setTimeError("Complete a hora, ex.: 19:30.")}
            placeholder="hh:mm"
            inputMode="numeric"
            aria-label="Horário"
            className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
          />
        </label>
      </div>
      {timeError && (
        <p role="alert" className="mt-1 text-[11.5px] font-semibold text-danger-600">
          {timeError}
        </p>
      )}
    </div>
  );
}
