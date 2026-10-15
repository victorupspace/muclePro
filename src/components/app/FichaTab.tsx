"use client";

import { ClipboardList } from "lucide-react";
import { Card } from "./TodayTab";
import { formatDateValue, weekdaysLabel } from "@/lib/plataforma/format";
import { cycleLabel } from "@/lib/plataforma/workouts";
import type { AppHome } from "@/lib/app/student-app";

export function FichaTab({ home }: { home: AppHome }) {
  const w = home.workout;
  if (!w) {
    return (
      <Card className="text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-ink-300" strokeWidth={1.8} />
        <p className="mt-3 text-[16px] font-bold text-ink-900">Nenhuma ficha liberada</p>
        <p className="mt-1 text-[14px] text-ink-500">Seu professor libera a ficha por aqui quando ela estiver pronta.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <Card>
        <p className="text-[19px] font-bold tracking-[-0.01em] text-ink-900">{w.title}</p>
        {w.goal && <p className="mt-0.5 text-[14px] text-ink-600">{w.goal}</p>}
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-btn bg-ink-50 px-3 py-2">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">Professor</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{w.authorName ?? "Equipe"}</dd>
          </div>
          <div className="rounded-btn bg-ink-50 px-3 py-2">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">Vale até</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {w.reviewOn ? formatDateValue(w.reviewOn) : "Sem prazo"}
              {w.cycleMonths ? <span className="font-normal text-ink-500"> · {cycleLabel(w.cycleMonths)}</span> : null}
            </dd>
          </div>
        </dl>
        {w.notes && <p className="mt-3 rounded-btn bg-brand/[0.05] px-3 py-2 text-[13.5px] leading-[1.5] text-ink-800">{w.notes}</p>}
      </Card>
      {w.days.map((d) => (
        <Card key={d.name} className="p-0">
          <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <p className="text-[16px] font-bold text-ink-900">
              Treino {d.name}
              {d.focus && <span className="ml-1.5 text-[13px] font-normal text-ink-500">{d.focus}</span>}
            </p>
            {weekdaysLabel(d.weekdays) && <span className="shrink-0 text-[12px] font-semibold text-brand">{weekdaysLabel(d.weekdays)}</span>}
          </div>
          <ol className="divide-y divide-ink-100">
            {d.exercises.map((e, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="w-5 shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums text-ink-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink-900">{e.name}</p>
                  {e.notes && <p className="text-[12.5px] text-ink-500">{e.notes}</p>}
                </div>
                <div className="shrink-0 text-right text-[13px] tabular-nums">
                  <p className="font-bold text-ink-900">{e.sets && e.reps ? `${e.sets} × ${e.reps}` : e.sets || e.reps || "—"}</p>
                  <p className="text-[12px] text-ink-500">{[e.load, e.rest && `desc. ${e.rest}`].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}
