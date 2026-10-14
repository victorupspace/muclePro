"use client";

import { AlertTriangle, Building2, Clock, FileWarning, Flame, Mail, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDocument, formatRelative } from "@/lib/plataforma/format";
import {
  FOLLOW_UP_LABEL,
  PROPOSAL_CARD_LABEL,
  daysInStage,
  followUpStatusFor,
  formatProposalCountdown,
  pickLatestProposal,
  pickLatestSimulation,
  priorityLevel,
  proposalCardStatus,
  proposalExpiresAt,
  slaStatus,
  type FollowUpStatus,
  type ProposalCardStatus,
} from "@/lib/plataforma/crm";
import type { NextBestAction } from "@/lib/plataforma/next-best-action";
import type { Client, ClientProfile, Proposal, Simulation } from "@/lib/plataforma/types";

type Props = {
  client: Client;
  profile: ClientProfile;
  proposals: Proposal[];
  simulations: Simulation[];
  followUpAt?: string;
  stageUpdatedAt?: string;
  isDragging?: boolean;
  priorityScore?: number;
  priorityReason?: string;
  docPendingCount?: number;
  alertCount?: number;
  nextAction?: NextBestAction | null;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
};

const FOLLOW_UP_TONE: Record<FollowUpStatus, string> = {
  em_dia: "bg-success-50 text-success-700 ring-success-200",
  hoje: "bg-warning-50 text-warning-800 ring-warning-200",
  atrasado: "bg-danger-50 text-danger-700 ring-danger-200",
  sem: "bg-ink-100 text-ink-500 ring-ink-200",
};

const PROPOSAL_TONE: Record<ProposalCardStatus, string> = {
  sem_proposta: "bg-ink-100 text-ink-500 ring-ink-200",
  rascunho: "bg-ink-100 text-ink-700 ring-ink-200",
  enviada: "bg-info-50 text-info-700 ring-info-200",
  aceita: "bg-success-50 text-success-700 ring-success-200",
  recusada: "bg-danger-50 text-danger-700 ring-danger-200",
  expirada: "bg-danger-50 text-danger-700 ring-danger-200",
};

export function PipelineCard({
  client,
  profile,
  proposals,
  simulations,
  followUpAt,
  stageUpdatedAt,
  isDragging,
  priorityScore,
  priorityReason,
  docPendingCount = 0,
  alertCount = 0,
  nextAction,
  onClick,
  onDragStart,
  onDragEnd,
}: Props) {
  const proposal = pickLatestProposal(client, proposals);
  const proposalState = proposalCardStatus(proposal);
  const followUp = followUpStatusFor(followUpAt);
  const days = daysInStage(stageUpdatedAt ?? client.createdAt);
  const sla = slaStatus(client.status, days);
  const lastSim = pickLatestSimulation(client, simulations);
  const projected = lastSim?.resultsData.monthlySavings ?? client.monthlySavings;
  const consumption = profile.units?.[0]?.averageConsumptionKwh;
  const submercado = profile.units?.[0]?.submercado;
  const isHighPriority = priorityScore !== undefined && priorityLevel(priorityScore) === "alta";

  return (
    <button
      type="button"
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group w-full cursor-grab rounded-card border border-ink-200 bg-white p-3.5 text-left transition-all duration-200 active:cursor-grabbing",
        "hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-[0_14px_36px_-22px_rgba(17,17,17,0.28)]",
        sla === "atrasado" && "border-danger-200",
        sla === "atencao" && "border-warning-200",
        isDragging && "scale-[0.98] border-ink-400 opacity-60 shadow-[0_18px_40px_-22px_rgba(17,17,17,0.4)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight text-ink-900">
            {client.companyName ?? client.name}
          </p>
          {client.companyName && (
            <p className="truncate text-[11px] text-ink-500">{client.name}</p>
          )}
        </div>
        {client.segment && (
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-brand ring-1 ring-inset ring-brand/25">
            {client.segment}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
        {profile.document && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" strokeWidth={2.2} />
            {formatDocument(profile.document)}
          </span>
        )}
        {client.distributor && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" strokeWidth={2.2} />
            {client.distributor}
            {submercado ? ` · ${submercado}` : ""}
          </span>
        )}
        {!profile.document && client.email && (
          <span className="inline-flex items-center gap-1 truncate">
            <Mail className="h-3 w-3" strokeWidth={2.2} />
            <span className="truncate">{client.email}</span>
          </span>
        )}
      </div>

      {(projected || consumption) && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-btn bg-ink-50 px-2.5 py-2">
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-500">Economia/mês</p>
            <p className="mt-0.5 text-[12.5px] font-bold text-ink-900">
              {projected ? formatCurrency(projected) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-500">Consumo</p>
            <p className="mt-0.5 text-[12.5px] font-bold text-ink-900">
              {consumption ? `${(consumption / 1000).toFixed(0)} MWh` : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {isHighPriority && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-danger-700 ring-1 ring-inset ring-danger-200">
            <Flame className="h-2.5 w-2.5" strokeWidth={2.4} />
            Alta prioridade
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
            PROPOSAL_TONE[proposalState],
          )}
        >
          {PROPOSAL_CARD_LABEL[proposalState]}
        </span>
        {followUpAt && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
              FOLLOW_UP_TONE[followUp],
            )}
          >
            <Clock className="h-2.5 w-2.5" strokeWidth={2.4} />
            {FOLLOW_UP_LABEL[followUp]}
          </span>
        )}
        {docPendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-warning-800 ring-1 ring-inset ring-warning-200">
            <FileWarning className="h-2.5 w-2.5" strokeWidth={2.4} />
            {docPendingCount} doc
          </span>
        )}
        {alertCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-danger-700 ring-1 ring-inset ring-danger-200">
            <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.4} />
            {alertCount} alerta{alertCount > 1 ? "s" : ""}
          </span>
        )}
        {client.status === "migrando" && (
          <MigrationBadges profile={profile} />
        )}
      </div>

      {nextAction ? (
        <div className="mt-2.5 inline-flex items-start gap-1.5 rounded-btn bg-brand/8 px-2 py-1.5 ring-1 ring-inset ring-brand/20">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-brand" strokeWidth={2.4} />
          <p className="line-clamp-2 text-[10.5px] font-semibold leading-[1.35] text-brand">
            Próxima ação: {nextAction.title}
          </p>
        </div>
      ) : (
        priorityReason && isHighPriority && (
          <p className="mt-2.5 line-clamp-2 text-[10.5px] font-medium leading-[1.35] text-ink-700">
            {priorityReason}
          </p>
        )
      )}

      {proposalState === "enviada" && proposal && (
        <p className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-warning-700">
          <Clock className="h-3 w-3" strokeWidth={2.4} />
          {formatProposalCountdown(proposal)}
        </p>
      )}
      {proposalState === "expirada" && (
        <p className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-danger-700">
          <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
          Proposta expirada — gerar novamente
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[10.5px]">
        <span className="text-ink-500">
          {profile.lastInteractionAt ? `Última: ${formatRelative(profile.lastInteractionAt)}` : "Sem interações"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold",
            sla === "ok" && "text-ink-500",
            sla === "atencao" && "text-warning-700",
            sla === "atrasado" && "text-danger-700",
          )}
        >
          <TrendingUp className="h-3 w-3" strokeWidth={2.4} />
          {days === 0 ? "Hoje" : `${days}d nesta etapa`}
        </span>
      </div>

      {sla === "atrasado" && (
        <p className="mt-1.5 text-[10px] font-semibold text-danger-700">Follow-up recomendado</p>
      )}
    </button>
  );
}

function MigrationBadges({ profile }: { profile: ClientProfile }) {
  const pending: { label: string; key: string }[] = [];
  if (profile.migration.denuncia !== "concluido") pending.push({ key: "denuncia", label: "Denúncia" });
  if (profile.migration.contratos !== "concluido") pending.push({ key: "contratos", label: "Contratos" });
  if (profile.migration.smf !== "concluido") pending.push({ key: "smf", label: "SMF" });
  if (profile.migration.ccee !== "concluido") pending.push({ key: "ccee", label: "CCEE" });

  if (pending.length === 0) return null;
  const next = pending[0];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-info-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-info-700 ring-1 ring-inset ring-info-200">
      {next.label} pendente
    </span>
  );
}

export { proposalExpiresAt };
