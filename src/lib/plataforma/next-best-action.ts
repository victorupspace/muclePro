import type {
  Client,
  ClientProfile,
  Proposal,
  Simulation,
  Task,
} from "./types";
import {
  daysInStage,
  pickLatestProposal,
  pickLatestSimulation,
  proposalCardStatus,
  proposalExpiresAt,
} from "./crm";

export type NextBestActionType =
  | "proposal_expiring"
  | "proposal_opened"
  | "proposal_opened_multiple_times"
  | "simulation_without_pdf"
  | "inactive_client"
  | "high_savings_opportunity"
  | "pending_document"
  | "migration_stalled";

export type NextBestActionPriority = "low" | "medium" | "high" | "critical";

export type NextBestActionCta =
  | "register_contact"
  | "generate_pdf"
  | "create_followup"
  | "request_document"
  | "open_timeline"
  | "open_client"
  | "new_simulation";

export type NextBestAction = {
  id: string;
  clientId: string;
  type: NextBestActionType;
  title: string;
  reason: string;
  priority: NextBestActionPriority;
  ctaLabel: string;
  ctaAction: NextBestActionCta;
  dueAt?: string;
  createdAt: string;
};

const TYPE_RANK: Record<NextBestActionType, number> = {
  proposal_expiring: 0,
  proposal_opened_multiple_times: 1,
  pending_document: 2,
  migration_stalled: 3,
  simulation_without_pdf: 4,
  proposal_opened: 5,
  high_savings_opportunity: 6,
  inactive_client: 7,
};

const PRIORITY_RANK: Record<NextBestActionPriority, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

const HIGH_SAVINGS_THRESHOLD = 5_000;
const INACTIVITY_DAYS = 5;
const MIGRATION_STALE_DAYS = 7;

type ProposalEngagement = {
  opened?: boolean;
  openCount?: number;
};

function getEngagement(
  proposal: Proposal | undefined,
  engagementMap?: Record<string, ProposalEngagement>,
): ProposalEngagement {
  if (!proposal || !engagementMap) return {};
  return engagementMap[proposal.id] ?? {};
}

function buildOne(
  client: Client,
  profile: ClientProfile,
  proposals: Proposal[],
  simulations: Simulation[],
  tasks: Task[],
  followUpAt?: string,
  stageUpdatedAt?: string,
  docPendingCount = 0,
  engagementMap?: Record<string, ProposalEngagement>,
): NextBestAction | null {
  const now = Date.now();
  const proposal = pickLatestProposal(client, proposals);
  const proposalState = proposalCardStatus(proposal);
  const simulation = pickLatestSimulation(client, simulations);
  const lastInteraction = profile.lastInteractionAt
    ? +new Date(profile.lastInteractionAt)
    : +new Date(client.createdAt);
  const engagement = getEngagement(proposal, engagementMap);

  const candidates: NextBestAction[] = [];
  const baseId = `${client.id}-nba`;
  const nowIso = new Date(now).toISOString();

  // Regra 1 — Proposta vencendo (<24h)
  if (proposal && proposalState === "enviada") {
    const exp = proposalExpiresAt(proposal).getTime();
    const diffH = (exp - now) / 3_600_000;
    if (diffH > 0 && diffH <= 24) {
      candidates.push({
        id: `${baseId}-prop-exp`,
        clientId: client.id,
        type: "proposal_expiring",
        title: "Fazer follow-up antes da proposta vencer",
        reason: `A proposta vence em ${Math.max(1, Math.floor(diffH))}h e ainda não foi aceita.`,
        priority: "critical",
        ctaLabel: "Registrar contato",
        ctaAction: "register_contact",
        dueAt: new Date(exp).toISOString(),
        createdAt: nowIso,
      });
    }
  }

  // Regra 3 — Proposta aberta múltiplas vezes
  if (proposal && (engagement.openCount ?? 0) >= 2) {
    candidates.push({
      id: `${baseId}-prop-multi`,
      clientId: client.id,
      type: "proposal_opened_multiple_times",
      title: "Ligar para o cliente agora",
      reason: `O cliente visualizou a proposta ${engagement.openCount}× — sinalizando alto interesse.`,
      priority: "critical",
      ctaLabel: "Registrar ligação",
      ctaAction: "register_contact",
      createdAt: nowIso,
    });
  }

  // Regra 7 — Documento pendente
  if (
    docPendingCount > 0 &&
    (client.status === "assinado" ||
      client.status === "migrando" ||
      client.status === "ativo" ||
      client.status === "em_negociacao" ||
      client.status === "proposta_enviada")
  ) {
    candidates.push({
      id: `${baseId}-doc`,
      clientId: client.id,
      type: "pending_document",
      title: "Solicitar documento pendente",
      reason: `${docPendingCount} documento${docPendingCount > 1 ? "s" : ""} bloqueando a próxima etapa.`,
      priority: "high",
      ctaLabel: "Solicitar documento",
      ctaAction: "request_document",
      createdAt: nowIso,
    });
  }

  // Regra 8 — Cliente em migração parado
  if (client.status === "migrando" && stageUpdatedAt) {
    const days = daysInStage(stageUpdatedAt);
    if (days >= MIGRATION_STALE_DAYS) {
      candidates.push({
        id: `${baseId}-mig-stall`,
        clientId: client.id,
        type: "migration_stalled",
        title: "Atualizar etapa de migração",
        reason: `Migração parada há ${days} dias sem atualização operacional.`,
        priority: "high",
        ctaLabel: "Abrir timeline",
        ctaAction: "open_timeline",
        createdAt: nowIso,
      });
    }
  }

  // Regra 4 — Simulação sem PDF
  if (simulation && !simulation.pdfUrl && proposalState === "sem_proposta") {
    candidates.push({
      id: `${baseId}-sim-pdf`,
      clientId: client.id,
      type: "simulation_without_pdf",
      title: "Gerar proposta em PDF",
      reason: "A simulação está pronta mas ainda não virou proposta profissional.",
      priority: "high",
      ctaLabel: "Gerar PDF",
      ctaAction: "generate_pdf",
      createdAt: nowIso,
    });
  }

  // Regra 2 — Proposta aberta (1 vez)
  if (proposal && engagement.opened && (engagement.openCount ?? 1) === 1 && proposalState === "enviada") {
    candidates.push({
      id: `${baseId}-prop-open`,
      clientId: client.id,
      type: "proposal_opened",
      title: "Entrar em contato com o cliente",
      reason: "O cliente visualizou a proposta — momento certo para conversar.",
      priority: "high",
      ctaLabel: "Registrar contato",
      ctaAction: "register_contact",
      createdAt: nowIso,
    });
  }

  // Regra 6 — Economia alta
  if (
    simulation &&
    simulation.resultsData.monthlySavings >= HIGH_SAVINGS_THRESHOLD &&
    (client.status === "qualificando" || client.status === "novo")
  ) {
    candidates.push({
      id: `${baseId}-savings`,
      clientId: client.id,
      type: "high_savings_opportunity",
      title: "Priorizar oportunidade",
      reason: `Economia projetada de ${formatBrl(simulation.resultsData.monthlySavings)}/mês — alto potencial.`,
      priority: "high",
      ctaLabel: "Abrir cliente",
      ctaAction: "open_client",
      createdAt: nowIso,
    });
  }

  // Regra 5 — Cliente sem interação recente
  const daysSince = Math.floor((now - lastInteraction) / 86_400_000);
  if (
    daysSince >= INACTIVITY_DAYS &&
    !["ativo", "inativo"].includes(client.status) &&
    !followUpAt
  ) {
    candidates.push({
      id: `${baseId}-inactive`,
      clientId: client.id,
      type: "inactive_client",
      title: "Retomar contato com o cliente",
      reason: `Sem interação há ${daysSince} dias — manter o ritmo da negociação.`,
      priority: "medium",
      ctaLabel: "Criar follow-up",
      ctaAction: "create_followup",
      createdAt: nowIso,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (pr !== 0) return pr;
    return TYPE_RANK[a.type] - TYPE_RANK[b.type];
  });

  return candidates[0];
}

export function buildNextBestActions(
  clients: Client[],
  getProfile: (id: string) => ClientProfile | null,
  proposals: Proposal[],
  simulations: Simulation[],
  tasks: Task[],
  followUps: Record<string, string | null>,
  stageTimes: Record<string, string>,
  docPendingByClient: Map<string, number>,
  engagementMap?: Record<string, ProposalEngagement>,
): NextBestAction[] {
  const out: NextBestAction[] = [];
  clients.forEach((client) => {
    if (client.status === "inativo") return;
    const profile = getProfile(client.id);
    if (!profile) return;
    const action = buildOne(
      client,
      profile,
      proposals,
      simulations,
      tasks,
      followUps[client.id] ?? undefined,
      stageTimes[client.id] ?? client.createdAt,
      docPendingByClient.get(client.id) ?? 0,
      engagementMap,
    );
    if (action) out.push(action);
  });

  out.sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      TYPE_RANK[a.type] - TYPE_RANK[b.type],
  );

  return out;
}

export const PRIORITY_LABEL_NBA: Record<NextBestActionPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const PRIORITY_TONE_NBA: Record<NextBestActionPriority, string> = {
  low: "bg-ink-100 text-ink-600 ring-ink-200",
  medium: "bg-info-50 text-info-700 ring-info-200",
  high: "bg-warning-50 text-warning-800 ring-warning-200",
  critical: "bg-danger-50 text-danger-700 ring-danger-200",
};

function formatBrl(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
