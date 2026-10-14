"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/plataforma/format";
import { PIPELINE_STAGE_DOT, PIPELINE_STAGE_HINT, PIPELINE_STAGE_LABEL, type PipelineStage } from "@/lib/plataforma/crm";

type Props = {
  stage: PipelineStage;
  count: number;
  totalSavings: number;
  totalConsumptionMwh?: number;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  children: ReactNode;
  emptyHint?: ReactNode;
};

export function PipelineColumn({
  stage,
  count,
  totalSavings,
  totalConsumptionMwh,
  isOver,
  onDragOver,
  onDrop,
  onDragLeave,
  children,
  emptyHint,
}: Props) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex h-full min-w-0 flex-col rounded-panel border bg-ink-50/40 transition-colors",
        isOver ? "border-brand bg-brand/5" : "border-ink-200",
      )}
    >
      <header className="border-b border-ink-200/70 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PIPELINE_STAGE_DOT[stage])} />
            <p className="truncate text-[12px] font-bold tracking-[-0.005em] text-ink-900">
              {PIPELINE_STAGE_LABEL[stage]}
            </p>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-ink-700 ring-1 ring-inset ring-ink-200">
            {count}
          </span>
        </div>
        <p className="mt-0.5 text-[10.5px] text-ink-500">
          {count === 0 ? PIPELINE_STAGE_HINT[stage] : (
            <>
              {formatCurrency(totalSavings)}/mês projetados
              {totalConsumptionMwh ? ` · ${totalConsumptionMwh.toFixed(0)} MWh` : ""}
            </>
          )}
        </p>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {count === 0 ? <div>{emptyHint}</div> : children}
      </div>
    </div>
  );
}
