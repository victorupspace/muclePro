"use client";

import { Calendar, CalendarClock, Check, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/plataforma/format";
import { FOLLOW_UP_BUCKET_LABEL, type FollowUpBucket, type FollowUpEntry } from "@/lib/plataforma/crm";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";

type Props = {
  entries: FollowUpEntry[];
  onComplete: (entry: FollowUpEntry) => void;
  onOpenClient: (clientId: string) => void;
  onSeeAll: () => void;
};

const ORDER: FollowUpBucket[] = ["atrasado", "hoje", "proximos", "sem"];

const BUCKET_TONE: Record<FollowUpBucket, string> = {
  atrasado: "bg-danger-50 text-danger-700 ring-danger-200",
  hoje: "bg-warning-50 text-warning-800 ring-warning-200",
  proximos: "bg-ink-100 text-ink-700 ring-ink-200",
  sem: "bg-ink-100 text-ink-500 ring-ink-200",
};

export function FollowUpsModule({ entries, onComplete, onOpenClient, onSeeAll }: Props) {
  const counts = ORDER.reduce<Record<FollowUpBucket, number>>(
    (acc, b) => ({ ...acc, [b]: entries.filter((e) => e.bucket === b).length }),
    { atrasado: 0, hoje: 0, proximos: 0, sem: 0 } as Record<FollowUpBucket, number>,
  );

  const ordered = [...entries].sort((a, b) => {
    const ai = ORDER.indexOf(a.bucket);
    const bi = ORDER.indexOf(b.bucket);
    if (ai !== bi) return ai - bi;
    if (a.dueAt && b.dueAt) return +new Date(a.dueAt) - +new Date(b.dueAt);
    return 0;
  });

  const top = ordered.slice(0, 4);
  const total = entries.filter((e) => e.bucket !== "sem").length;
  const overdue = counts.atrasado;

  return (
    <ModuleCard
      title="Follow-ups"
      hint={`${counts.hoje} hoje · ${counts.proximos} próximos 7d`}
      icon={<CalendarClock className="h-3.5 w-3.5" strokeWidth={2.4} />}
      count={total}
      countTone={overdue > 0 ? "danger" : counts.hoje > 0 ? "warn" : "default"}
      onSeeAll={entries.length > 0 ? onSeeAll : undefined}
    >
      {top.length === 0 ? (
        <ModuleEmpty>Sem follow-ups previstos. Boa hora para criar a próxima ação.</ModuleEmpty>
      ) : (
        <ul className="space-y-1.5">
          {top.map((entry) => (
            <FollowUpRow
              key={`${entry.client.id}-${entry.task?.id ?? "manual"}`}
              entry={entry}
              onComplete={() => onComplete(entry)}
              onOpenClient={() => onOpenClient(entry.client.id)}
            />
          ))}
        </ul>
      )}
    </ModuleCard>
  );
}

export function FollowUpRow({
  entry,
  onComplete,
  onOpenClient,
  dense,
}: {
  entry: FollowUpEntry;
  onComplete: () => void;
  onOpenClient: () => void;
  dense?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-btn border border-ink-100 bg-white px-2.5 py-2 transition-colors hover:border-ink-200 hover:bg-ink-50/50",
        dense && "py-1.5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
          BUCKET_TONE[entry.bucket],
        )}
      >
        {entry.bucket === "atrasado" || entry.bucket === "hoje" ? (
          <Clock className="h-3 w-3" strokeWidth={2.4} />
        ) : (
          <Calendar className="h-3 w-3" strokeWidth={2.4} />
        )}
      </span>
      <button
        type="button"
        onClick={onOpenClient}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[12.5px] font-semibold text-ink-900">
            {entry.client.companyName ?? entry.client.name}
          </p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-500">
            {FOLLOW_UP_BUCKET_LABEL[entry.bucket]}
          </span>
        </div>
        <p className="truncate text-[11px] text-ink-500">
          {entry.title}
          {entry.dueAt
            ? ` · ${formatRelative(entry.dueAt)} (${formatDateTime(entry.dueAt)})`
            : ""}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {entry.task && (
          <button
            type="button"
            onClick={onComplete}
            aria-label="Concluir"
            className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-success-700"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenClient}
          aria-label="Abrir cliente"
          className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </li>
  );
}
