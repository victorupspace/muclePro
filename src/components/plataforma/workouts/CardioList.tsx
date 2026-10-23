import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/cn";
import type { WorkoutCardio } from "@/lib/plataforma/types";
import { CARDIO_INTENSITY_LABEL } from "@/lib/plataforma/workouts";

const INTENSITY_TONE = {
  leve: "bg-success-50 text-success-700 ring-success-200",
  moderada: "bg-info-50 text-info-700 ring-info-200",
  alta: "bg-warning-50 text-warning-800 ring-warning-200",
  intervalada: "bg-danger-50 text-danger-700 ring-danger-200",
} as const;

// Bloco de cardio de um treino (painel e área do aluno).
export function CardioList({ items, size = "sm", bare }: { items?: WorkoutCardio[]; size?: "sm" | "lg"; bare?: boolean }) {
  if (!items?.length) return null;
  const lg = size === "lg";
  return (
    <div className={cn(!bare && "border-t border-ink-100", lg ? "px-4 py-3" : "px-3 py-2")}>
      <p className={cn("inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-ink-500", lg ? "text-[11px]" : "text-[10px]")}>
        <HeartPulse className={cn("text-brand", lg ? "h-3.5 w-3.5" : "h-3 w-3")} strokeWidth={2.4} />
        Cardio
      </p>
      <ul className={cn("mt-1.5", lg ? "space-y-2" : "space-y-1.5")}>
        {items.map((c, i) => (
          <li key={i} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("font-semibold text-ink-900", lg ? "text-[14.5px]" : "text-[12.5px]")}>{c.equipment}</p>
              {c.notes && <p className={cn("text-ink-500", lg ? "text-[12.5px]" : "text-[11px]")}>{c.notes}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {c.minutes && (
                <span className={cn("font-bold tabular-nums text-ink-900", lg ? "text-[13px]" : "text-[11.5px]")}>
                  {c.minutes}
                  {/^\d+$/.test(c.minutes) ? " min" : ""}
                </span>
              )}
              {c.intensity && (
                <span className={cn("rounded-full px-1.5 py-px font-semibold ring-1 ring-inset", lg ? "text-[11px]" : "text-[10px]", INTENSITY_TONE[c.intensity])}>
                  {CARDIO_INTENSITY_LABEL[c.intensity]}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
