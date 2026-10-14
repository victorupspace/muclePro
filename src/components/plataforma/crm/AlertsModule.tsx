"use client";

import { AlertTriangle, ExternalLink, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  MIGRATION_ALERT_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  type MigrationAlertEntry,
} from "@/lib/plataforma/crm";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";

type Props = {
  entries: MigrationAlertEntry[];
  onOpenClient: (clientId: string) => void;
  onCreateTask: (entry: MigrationAlertEntry) => void;
  onSeeAll: () => void;
};

export function AlertsModule({ entries, onOpenClient, onCreateTask, onSeeAll }: Props) {
  const top = entries.slice(0, 4);
  const critical = entries.filter((e) => e.severity === "critica" || e.severity === "alta").length;

  return (
    <ModuleCard
      title="Alertas de migração"
      hint={
        entries.length === 0
          ? "Sem alertas regulatórios pendentes"
          : `${critical} prioritários`
      }
      icon={<AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />}
      count={entries.length}
      countTone={critical > 0 ? "danger" : entries.length > 0 ? "warn" : "default"}
      onSeeAll={entries.length > 4 ? onSeeAll : undefined}
    >
      {top.length === 0 ? (
        <ModuleEmpty>Tudo em dia nas etapas regulatórias.</ModuleEmpty>
      ) : (
        <ul className="space-y-1.5">
          {top.map((entry, idx) => (
            <AlertRow
              key={`${entry.client.id}-${entry.type}-${idx}`}
              entry={entry}
              onOpenClient={() => onOpenClient(entry.client.id)}
              onCreateTask={() => onCreateTask(entry)}
            />
          ))}
        </ul>
      )}
    </ModuleCard>
  );
}

export function AlertRow({
  entry,
  onOpenClient,
  onCreateTask,
}: {
  entry: MigrationAlertEntry;
  onOpenClient: () => void;
  onCreateTask: () => void;
}) {
  return (
    <li className="rounded-btn border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50/50">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenClient} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[12.5px] font-semibold text-ink-900">
            {entry.client.companyName ?? entry.client.name}
          </p>
          <p className="text-[11px] text-ink-700">{MIGRATION_ALERT_LABEL[entry.type]}</p>
          <p className="mt-0.5 text-[10.5px] text-ink-500">{entry.description}</p>
        </button>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
            SEVERITY_TONE[entry.severity],
          )}
        >
          {SEVERITY_LABEL[entry.severity]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onCreateTask}
          className="inline-flex h-7 items-center gap-1 rounded-btn border border-ink-200 px-2 text-[10.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <ListChecks className="h-3 w-3" strokeWidth={2.4} />
          Criar tarefa
        </button>
        <button
          type="button"
          onClick={onOpenClient}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-btn px-2 text-[10.5px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
          Abrir timeline
        </button>
      </div>
    </li>
  );
}
