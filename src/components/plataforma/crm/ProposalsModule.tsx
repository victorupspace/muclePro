"use client";

import { Calculator, Clock, FileText, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency, formatRelative } from "@/lib/plataforma/format";
import {
  formatProposalCountdown,
  proposalUrgencyBucket,
  type ProposalUrgencyBucket,
} from "@/lib/plataforma/crm";
import type { Client, Proposal, Simulation } from "@/lib/plataforma/types";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";

type Props = {
  proposals: Proposal[];
  clients: Client[];
  simulations: Simulation[];
  onOpenClient: (clientId: string) => void;
  onSeeAll: () => void;
  onSimulate: (clientId: string) => void;
};

const BUCKET_TONE: Record<ProposalUrgencyBucket, string> = {
  vencida: "bg-danger-50 text-danger-700 ring-danger-200",
  vencendo_24h: "bg-danger-50 text-danger-700 ring-danger-200",
  vencendo_48h: "bg-warning-50 text-warning-700 ring-warning-200",
  ativa: "bg-info-50 text-info-700 ring-info-200",
};

const BUCKET_LABEL: Record<ProposalUrgencyBucket, string> = {
  vencida: "Vencida",
  vencendo_24h: "Vence em 24h",
  vencendo_48h: "Vence em 48h",
  ativa: "Ativa",
};

const ORDER: ProposalUrgencyBucket[] = ["vencida", "vencendo_24h", "vencendo_48h", "ativa"];

export function ProposalsModule({
  proposals,
  clients,
  simulations,
  onOpenClient,
  onSeeAll,
  onSimulate,
}: Props) {
  const sent = proposals.filter((p) => p.status === "enviada");
  const enriched = sent
    .map((p) => ({
      proposal: p,
      bucket: proposalUrgencyBucket(p),
      client: clients.find((c) => c.id === p.clientId),
    }))
    .filter((e): e is { proposal: Proposal; bucket: ProposalUrgencyBucket; client: Client } => !!e.client)
    .sort((a, b) => ORDER.indexOf(a.bucket) - ORDER.indexOf(b.bucket));

  const expiring = enriched.filter((e) => e.bucket !== "ativa").length;
  const top = enriched.slice(0, 4);

  return (
    <ModuleCard
      title="Propostas"
      hint={
        expiring > 0
          ? `${expiring} precisam de atenção`
          : `${enriched.length} ativas no momento`
      }
      icon={<FileText className="h-3.5 w-3.5" strokeWidth={2.4} />}
      count={enriched.length}
      countTone={
        enriched.some((e) => e.bucket === "vencida")
          ? "danger"
          : enriched.some((e) => e.bucket !== "ativa")
            ? "warn"
            : "default"
      }
      onSeeAll={enriched.length > 0 ? onSeeAll : undefined}
    >
      {top.length === 0 ? (
        <ModuleEmpty>Nenhuma proposta enviada no momento.</ModuleEmpty>
      ) : (
        <ul className="space-y-1.5">
          {top.map(({ proposal, bucket, client }) => {
            const lastSim = simulations
              .filter((s) => s.clientId === client.id)
              .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
            const savings = lastSim?.resultsData.monthlySavings ?? proposal.amount;
            return (
              <li
                key={proposal.id}
                className="flex items-start gap-2.5 rounded-btn border border-ink-100 bg-white px-2.5 py-2 transition-colors hover:border-ink-200 hover:bg-ink-50/50"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                    BUCKET_TONE[bucket],
                  )}
                >
                  {bucket === "ativa" ? (
                    <Send className="h-3 w-3" strokeWidth={2.4} />
                  ) : (
                    <Clock className="h-3 w-3" strokeWidth={2.4} />
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenClient(client.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-semibold text-ink-900">
                      {client.companyName ?? client.name}
                    </p>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-500">
                      {BUCKET_LABEL[bucket]}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-ink-500">
                    {formatCurrency(savings)}/mês ·{" "}
                    {bucket === "vencida"
                      ? "Proposta expirada"
                      : formatProposalCountdown(proposal)}{" "}
                    · enviada {formatRelative(proposal.sentAt ?? proposal.createdAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onSimulate(client.id)}
                  aria-label="Nova simulação"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                >
                  <Calculator className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ModuleCard>
  );
}

export { BUCKET_LABEL as PROPOSAL_BUCKET_LABEL, BUCKET_TONE as PROPOSAL_BUCKET_TONE };
