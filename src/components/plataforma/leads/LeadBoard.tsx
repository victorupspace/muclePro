"use client";

import type { ReactNode } from "react";
import { CalendarClock, ChevronRight, Clock, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { LEAD_SOURCE_LABEL, LEAD_STAGE_HINT, LEAD_STAGE_LABEL, initials, whatsappLink } from "@/lib/plataforma/format";
import { LEAD_STAGE_DOT, daysInStage, leadSla, nextStage, trialLabel } from "@/lib/plataforma/leads";
import type { Lead, LeadStage } from "@/lib/plataforma/types";

export function LeadColumn({
  stage,
  count,
  isOver,
  canDrop,
  footnote,
  onDragOver,
  onDragLeave,
  onDrop,
  onAdd,
  children,
}: {
  stage: LeadStage;
  count: number;
  isOver: boolean;
  canDrop: boolean;
  footnote?: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={LEAD_STAGE_LABEL[stage]}
      onDragOver={(e) => {
        if (!canDrop) return;
        e.preventDefault();
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[240px] w-[272px] md:min-h-[420px] shrink-0 snap-start flex-col rounded-card border bg-ink-50/50 transition-colors 2xl:w-auto 2xl:min-w-0",
        isOver ? "border-brand bg-brand/[0.04]" : "border-ink-200",
      )}
    >
      <header className="border-b border-ink-200/70 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex min-w-0 items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", LEAD_STAGE_DOT[stage])} />
            <h2 className="truncate text-[12.5px] font-bold tracking-[-0.005em] text-ink-900">{LEAD_STAGE_LABEL[stage]}</h2>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-ink-700 ring-1 ring-inset ring-ink-200">
            {count}
          </span>
        </div>
        <p className="mt-0.5 text-[10.5px] leading-[1.4] text-ink-500">{footnote ?? LEAD_STAGE_HINT[stage]}</p>
      </header>
      <div className="flex-1 space-y-2 p-2.5">
        {children}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-9 w-full items-center justify-center rounded-btn border border-dashed border-ink-300 text-[11.5px] font-semibold text-ink-500 transition-colors hover:border-ink-500 hover:bg-white hover:text-ink-800"
          >
            + Adicionar
          </button>
        )}
      </div>
    </section>
  );
}

// Rótulo curto do botão de avançar (cabe na coluna estreita).
const ADVANCE_LABEL: Record<LeadStage, string> = {
  novo: "Novo contato",
  contato: "Em conversa",
  agendada: "Marcar aula",
  experimental: "Aula feita",
  matriculado: "Matricular",
  perdido: "Perdido",
};

const SLA_BORDER = { ok: "", atencao: "border-warning-300", atrasado: "border-danger-300" } as const;

const TRIAL_TONE = {
  today: "bg-warning-50 text-warning-800 ring-warning-200",
  soon: "bg-info-50 text-info-700 ring-info-200",
  later: "bg-ink-100 text-ink-700 ring-ink-200",
  past: "bg-danger-50 text-danger-700 ring-danger-200",
} as const;

export function LeadCard({
  lead,
  ownerName,
  draggable,
  dragging,
  companyName,
  onOpen,
  onAdvance,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  ownerName?: string;
  draggable: boolean;
  dragging: boolean;
  companyName: string;
  onOpen: () => void;
  onAdvance?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const sla = leadSla(lead);
  const days = daysInStage(lead);
  const trial = lead.stage === "agendada" || lead.stage === "experimental" ? trialLabel(lead.trialAt) : null;
  const next = draggable ? nextStage(lead.stage) : null;

  return (
    <article
      data-row
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-card border border-ink-200 bg-white p-3 transition-all duration-200",
        draggable && "cursor-grab active:cursor-grabbing",
        "hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-[0_14px_36px_-22px_rgba(17,17,17,0.28)]",
        SLA_BORDER[sla],
        dragging && "scale-[0.98] opacity-50",
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <p className="truncate text-[13px] font-bold leading-tight text-ink-900">{lead.fullName}</p>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-[1.45] text-ink-600">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-500">{LEAD_SOURCE_LABEL[lead.source]}</span>
          {lead.interest && <> · {lead.interest}</>}
        </p>
        {lead.stage === "perdido" && lead.lostNotes && (
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-[1.45] text-ink-500">{lead.lostNotes}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {trial && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
                // Na etapa "Aula feita" a data já passou por definição: não é atraso.
                TRIAL_TONE[lead.stage === "experimental" ? "later" : trial.tone],
              )}
            >
              <CalendarClock className="h-3 w-3" strokeWidth={2.4} />
              {trial.text}
            </span>
          )}
          {lead.stage !== "matriculado" && lead.stage !== "perdido" && lead.stage !== "agendada" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10.5px] font-semibold",
                sla === "atrasado" ? "text-danger-700" : sla === "atencao" ? "text-warning-800" : "text-ink-500",
              )}
            >
              <Clock className="h-3 w-3" strokeWidth={2.4} />
              {days === 0 ? "Hoje" : `${days} dia${days === 1 ? "" : "s"} aqui`}
            </span>
          )}
        </div>
      </button>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ink-100 pt-2">
        <span
          title={ownerName ? `Responsável: ${ownerName}` : "Sem responsável"}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-100 px-1.5 text-[9.5px] font-bold text-ink-600"
        >
          {ownerName ? initials(ownerName) : "—"}
        </span>
        <div className="flex min-w-0 items-center gap-0.5">
          {lead.whatsapp && lead.stage !== "matriculado" && (
            <a
              href={whatsappLink(lead.whatsapp, `Oi ${lead.fullName.split(" ")[0]}! Aqui é da ${companyName}. Tudo bem?`)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp de ${lead.fullName}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-success-700 transition-colors hover:bg-success-50"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
            </a>
          )}
          {next && onAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              title={`Mover para ${LEAD_STAGE_LABEL[next]}`}
              className="inline-flex h-7 min-w-0 items-center gap-0.5 whitespace-nowrap rounded-btn px-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/10"
            >
              {ADVANCE_LABEL[next]}
              <ChevronRight className="h-3 w-3" strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
