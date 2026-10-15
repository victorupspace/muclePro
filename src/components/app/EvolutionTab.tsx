"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Ruler } from "lucide-react";
import { Card } from "./TodayTab";
import { cn } from "@/lib/cn";
import { bmi, bmiLabel, evolution, formatDelta, formatMeasure, latestHeight } from "@/lib/plataforma/assessments";
import { formatDateValue, toDateValue } from "@/lib/plataforma/format";
import type { AppHome } from "@/lib/app/student-app";

export function EvolutionTab({ home }: { home: AppHome }) {
  const list = home.assessments;
  const evo = useMemo(() => evolution(list), [list]);
  const height = latestHeight(list);
  const weight = evo[0]?.last;
  const currentBmi = bmi(weight, height);

  const trainings = useMemo(() => {
    const done = home.logs.filter((l) => l.finishedAt || l.exercises.some((e) => e.done));
    const month = toDateValue(new Date()).slice(0, 7);
    const since30 = Date.now() - 30 * 86_400_000;
    return {
      month: done.filter((l) => l.performedOn.startsWith(month)).length,
      last30: done.filter((l) => new Date(`${l.performedOn}T12:00:00`).getTime() >= since30).length,
    };
  }, [home.logs]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Treinos no mês" value={String(trainings.month)} />
        <Stat label="Últimos 30 dias" value={String(trainings.last30)} />
      </div>

      {list.length === 0 ? (
        <Card className="text-center">
          <Ruler className="mx-auto h-8 w-8 text-ink-300" strokeWidth={1.8} />
          <p className="mt-3 text-[16px] font-bold text-ink-900">Sem avaliação física ainda</p>
          <p className="mt-1 text-[14px] leading-[1.55] text-ink-500">Quando o seu professor registrar suas medidas, a evolução aparece aqui.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat label="Peso" value={formatMeasure(weight, "kg")} />
            <Stat label="Altura" value={formatMeasure(height, "cm")} />
            <Stat label="IMC" value={currentBmi ? currentBmi.toFixed(1).replace(".", ",") : "—"} hint={bmiLabel(currentBmi)} />
          </div>
          <Card>
            <p className="text-[15px] font-bold text-ink-900">Sua evolução</p>
            <p className="text-[12.5px] text-ink-500">Da primeira à última avaliação.</p>
            <ul className="mt-3 divide-y divide-ink-100">
              {evo
                .filter((e) => e.last !== undefined)
                .map((e) => (
                  <li key={e.key} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-[14px] font-semibold text-ink-800">{e.label}</span>
                    <span className="text-right">
                      <span className="block text-[15px] font-bold tabular-nums text-ink-900">{formatMeasure(e.last, e.unit)}</span>
                      {e.delta !== undefined && (
                        <span className={cn("inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums", e.delta === 0 ? "text-ink-500" : "text-ink-700")}>
                          {e.delta > 0 ? (
                            <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} />
                          ) : e.delta < 0 ? (
                            <ArrowDownRight className="h-3 w-3" strokeWidth={2.6} />
                          ) : (
                            <Minus className="h-3 w-3" strokeWidth={2.6} />
                          )}
                          {formatDelta(e.delta, e.unit)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
          <Card className="p-0">
            <p className="border-b border-ink-100 px-4 py-3 text-[15px] font-bold text-ink-900">Avaliações</p>
            <ul className="divide-y divide-ink-100">
              {list.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <span>
                    <span className="block text-[14px] font-semibold text-ink-900">{formatDateValue(a.measuredOn)}</span>
                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">{a.kind === "inicial" ? "Avaliação inicial" : "Reavaliação"}</span>
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-ink-900">{formatMeasure(a.weightKg, "kg")}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-3">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">{label}</p>
      <p className="mt-1 text-[19px] font-bold tabular-nums text-ink-900">{value}</p>
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}
