"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency, formatKwh } from "@/lib/plataforma/format";
import {
  PRIORITY_LABEL,
  PIPELINE_STAGE_LABEL,
  pickLatestSimulation,
  priorityLevel,
  type PriorityEntry,
  type PriorityLevel,
} from "@/lib/plataforma/crm";
import type { Simulation } from "@/lib/plataforma/types";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";

type Props = {
  entries: PriorityEntry[];
  simulations: Simulation[];
  onOpenClient: (clientId: string) => void;
  onSeeAll: () => void;
};

const LEVEL_TONE: Record<PriorityLevel, string> = {
  alta: "bg-danger-50 text-danger-700 ring-danger-200",
  media: "bg-warning-50 text-warning-700 ring-warning-200",
  baixa: "bg-ink-100 text-ink-600 ring-ink-200",
};

export function PriorityModule({ entries, simulations, onOpenClient, onSeeAll }: Props) {
  const top = entries.slice(0, 4);
  const high = entries.filter((e) => priorityLevel(e.score) === "alta").length;

  return (
    <ModuleCard
      title="Oportunidades prioritárias"
      hint={`${high} de alta prioridade`}
      icon={<Flame className="h-3.5 w-3.5" strokeWidth={2.4} />}
      count={entries.length}
      countTone={high > 0 ? "warn" : "default"}
      onSeeAll={entries.length > 4 ? onSeeAll : undefined}
    >
      {top.length === 0 ? (
        <ModuleEmpty>Sem oportunidades ranqueadas no momento.</ModuleEmpty>
      ) : (
        <ul className="space-y-1.5">
          {top.map((entry) => (
            <PriorityRow
              key={entry.client.id}
              entry={entry}
              simulations={simulations}
              onOpenClient={() => onOpenClient(entry.client.id)}
            />
          ))}
        </ul>
      )}
    </ModuleCard>
  );
}

export function PriorityRow({
  entry,
  simulations,
  onOpenClient,
}: {
  entry: PriorityEntry;
  simulations: Simulation[];
  onOpenClient: () => void;
}) {
  const { client, profile, score, reason } = entry;
  const level = priorityLevel(score);
  const sim = pickLatestSimulation(client, simulations);
  const projected = sim?.resultsData.monthlySavings ?? client.monthlySavings ?? 0;

  return (
    <li className="rounded-btn border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50/50">
      <button type="button" onClick={onOpenClient} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-ink-900">
              {client.companyName ?? client.name}
            </p>
            <p className="text-[10.5px] text-ink-500">
              {PIPELINE_STAGE_LABEL[client.status]}
              {client.segment ? ` · ${client.segment}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
              LEVEL_TONE[level],
            )}
          >
            {PRIORITY_LABEL[level]} · {score}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-[1.4] text-ink-700">
          {reason}
        </p>
        <p className="mt-1 text-[10.5px] text-ink-500">
          {projected > 0 ? `${formatCurrency(projected)}/mês` : "Sem economia projetada"}
          {profile.averageConsumptionKwh ? ` · ${formatKwh(profile.averageConsumptionKwh)}` : ""}
        </p>
      </button>
    </li>
  );
}
