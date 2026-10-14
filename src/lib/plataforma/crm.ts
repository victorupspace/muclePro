import type {
  Client,
  ClientMigrationStage,
  ClientProfile,
  ClientStatus,
  Proposal,
  Simulation,
  Task,
} from "./types";

export type PipelineStage = ClientStatus;

export const PIPELINE_STAGES: PipelineStage[] = [
  "novo",
  "qualificando",
  "proposta_enviada",
  "em_negociacao",
  "assinado",
  "migrando",
  "ativo",
  "inativo",
];

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  novo: "Novo",
  qualificando: "Qualificando",
  proposta_enviada: "Proposta enviada",
  em_negociacao: "Em negociação",
  assinado: "Assinado",
  migrando: "Migrando",
  ativo: "Ativo",
  inativo: "Inativo",
};

export const PIPELINE_STAGE_HINT: Record<PipelineStage, string> = {
  novo: "Primeiro contato e prospecção",
  qualificando: "Diagnóstico e simulação inicial",
  proposta_enviada: "Proposta formal enviada",
  em_negociacao: "Proposta enviada e em discussão",
  assinado: "Contrato assinado e pronto para migração",
  migrando: "Etapas operacionais em andamento",
  ativo: "Contrato fechado e cliente ativo",
  inativo: "Sem operação no momento",
};

export const PIPELINE_STAGE_DOT: Record<PipelineStage, string> = {
  novo: "bg-brand",
  qualificando: "bg-warning-500",
  proposta_enviada: "bg-info-500",
  em_negociacao: "bg-warning-500",
  assinado: "bg-success-500",
  migrando: "bg-info-500",
  ativo: "bg-success-500",
  inativo: "bg-ink-400",
};

export type PipelineStageOrder = "novo" | "qualificando" | "em_negociacao" | "proposta_enviada" | "assinado" | "migrando" | "ativo" | "inativo";

const STAGE_RANK: Record<PipelineStage, number> = {
  novo: 0,
  qualificando: 1,
  proposta_enviada: 2,
  em_negociacao: 3,
  assinado: 4,
  migrando: 5,
  ativo: 6,
  inativo: 7,
};

export function rankStage(s: PipelineStage) {
  return STAGE_RANK[s];
}

export type FollowUpStatus = "em_dia" | "hoje" | "atrasado" | "sem";

export function followUpStatusFor(dueIso?: string | null): FollowUpStatus {
  if (!dueIso) return "sem";
  const due = new Date(dueIso).getTime();
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (due < startOfToday.getTime() && due < now) return "atrasado";
  if (due >= startOfToday.getTime() && due <= endOfToday.getTime()) return "hoje";
  return "em_dia";
}

export const FOLLOW_UP_LABEL: Record<FollowUpStatus, string> = {
  em_dia: "Em dia",
  hoje: "Hoje",
  atrasado: "Atrasado",
  sem: "Sem follow-up",
};

export type ProposalCardStatus =
  | "sem_proposta"
  | "rascunho"
  | "enviada"
  | "aceita"
  | "recusada"
  | "expirada";

export const PROPOSAL_CARD_LABEL: Record<ProposalCardStatus, string> = {
  sem_proposta: "Sem proposta",
  rascunho: "Proposta gerada",
  enviada: "Proposta enviada",
  aceita: "Proposta aceita",
  recusada: "Proposta recusada",
  expirada: "Proposta expirada",
};

const PROPOSAL_VALIDITY_HOURS = 72;

export function proposalExpiresAt(p: Proposal): Date {
  const base = p.sentAt ?? p.createdAt;
  const dt = new Date(base);
  dt.setHours(dt.getHours() + PROPOSAL_VALIDITY_HOURS);
  return dt;
}

export function proposalCardStatus(p?: Proposal): ProposalCardStatus {
  if (!p) return "sem_proposta";
  if (p.status === "rascunho") return "rascunho";
  if (p.status === "aceita") return "aceita";
  if (p.status === "recusada") return "recusada";
  if (p.status === "enviada") {
    const exp = proposalExpiresAt(p).getTime();
    if (exp < Date.now()) return "expirada";
    return "enviada";
  }
  return "sem_proposta";
}

export function formatProposalCountdown(p: Proposal): string {
  const exp = proposalExpiresAt(p).getTime();
  const diff = exp - Date.now();
  if (diff <= 0) return "Proposta expirada";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) {
    const min = Math.max(1, Math.floor(diff / 60_000));
    return `Expira em ${min} min`;
  }
  if (hours < 48) return `Expira em ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Expira em ${days}d`;
}

export function pickLatestProposal(client: Client, proposals: Proposal[]) {
  return proposals
    .filter((p) => p.clientId === client.id)
    .sort((a, b) => +new Date(b.sentAt ?? b.createdAt) - +new Date(a.sentAt ?? a.createdAt))[0];
}

export function pickLatestSimulation(client: Client, simulations: Simulation[]) {
  return simulations
    .filter((s) => s.clientId === client.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
}

export function daysInStage(updatedAtIso?: string) {
  if (!updatedAtIso) return 0;
  const diff = Date.now() - new Date(updatedAtIso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export const STAGE_SLA_DAYS: Record<PipelineStage, number> = {
  novo: 5,
  qualificando: 7,
  proposta_enviada: 7,
  em_negociacao: 10,
  assinado: 7,
  migrando: 14,
  ativo: 30,
  inativo: 30,
};

export type CardSla = "ok" | "atencao" | "atrasado";

export function slaStatus(stage: PipelineStage, days: number): CardSla {
  const limit = STAGE_SLA_DAYS[stage];
  if (days >= limit) return "atrasado";
  if (days >= Math.max(2, Math.floor(limit * 0.7))) return "atencao";
  return "ok";
}

// ───────────────────────────────────────────────────────────────────────────
// Follow-ups derivados das tasks vinculadas ao cliente

export type FollowUpBucket = "atrasado" | "hoje" | "proximos" | "sem";

export const FOLLOW_UP_BUCKET_LABEL: Record<FollowUpBucket, string> = {
  atrasado: "Atrasados",
  hoje: "Hoje",
  proximos: "Próximos 7 dias",
  sem: "Sem próximo contato",
};

export type FollowUpEntry = {
  client: Client;
  task?: Task;
  dueAt?: string;
  bucket: FollowUpBucket;
  title: string;
};

export function buildFollowUps(
  clients: Client[],
  tasks: Task[],
  followUpsOverride: Record<string, string | null>,
): FollowUpEntry[] {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const in7d = startOfToday.getTime() + 7 * 86_400_000;

  return clients
    .filter((c) => c.status !== "inativo")
    .map<FollowUpEntry>((client) => {
      const override = followUpsOverride[client.id];
      const task = tasks
        .filter((t) => t.clientId === client.id && !t.done)
        .sort((a, b) => {
          const aDue = a.dueAt ? +new Date(a.dueAt) : Number.POSITIVE_INFINITY;
          const bDue = b.dueAt ? +new Date(b.dueAt) : Number.POSITIVE_INFINITY;
          return aDue - bDue;
        })[0];
      const dueAt = override ?? task?.dueAt ?? undefined;
      let bucket: FollowUpBucket = "sem";
      if (dueAt) {
        const t = +new Date(dueAt);
        if (t < startOfToday.getTime() && t < now) bucket = "atrasado";
        else if (t >= startOfToday.getTime() && t <= endOfToday.getTime()) bucket = "hoje";
        else if (t <= in7d) bucket = "proximos";
        else bucket = "proximos";
      }
      return {
        client,
        task,
        dueAt,
        bucket,
        title: task?.title ?? "Definir próximo passo",
      };
    });
}

// ───────────────────────────────────────────────────────────────────────────
// Propostas — agrupamento por urgência

export type ProposalUrgencyBucket = "vencida" | "vencendo_24h" | "vencendo_48h" | "ativa";

export function proposalUrgencyBucket(p: Proposal): ProposalUrgencyBucket {
  if (p.status !== "enviada") return "ativa";
  const diffH = (proposalExpiresAt(p).getTime() - Date.now()) / 3_600_000;
  if (diffH <= 0) return "vencida";
  if (diffH <= 24) return "vencendo_24h";
  if (diffH <= 48) return "vencendo_48h";
  return "ativa";
}

// ───────────────────────────────────────────────────────────────────────────
// Documentos pendentes (derivados das etapas de migração)

export type DocPendingType =
  | "fatura"
  | "procuracao"
  | "contrato_assinado"
  | "carta_denuncia"
  | "smf"
  | "cusd_ccer"
  | "ccee";

export const DOC_PENDING_LABEL: Record<DocPendingType, string> = {
  fatura: "Fatura recente",
  procuracao: "Procuração",
  contrato_assinado: "Contrato assinado",
  carta_denuncia: "Carta de denúncia",
  smf: "Documento técnico SMF",
  cusd_ccer: "CUSD/CCER",
  ccee: "Modelagem CCEE",
};

export const DOC_PENDING_STAGE: Record<DocPendingType, ClientMigrationStage> = {
  fatura: "diagnostico",
  procuracao: "diagnostico",
  carta_denuncia: "denuncia",
  contrato_assinado: "contratos",
  cusd_ccer: "contratos",
  smf: "smf",
  ccee: "ccee",
};

export type DocSeverity = "baixa" | "media" | "alta" | "critica";

export type DocPendingEntry = {
  client: Client;
  type: DocPendingType;
  stage: ClientMigrationStage;
  severity: DocSeverity;
  reason: string;
};

export function buildDocPendings(
  clients: Client[],
  getProfile: (id: string) => ClientProfile | null,
): DocPendingEntry[] {
  const out: DocPendingEntry[] = [];
  clients.forEach((client) => {
    if (client.status === "inativo" || client.status === "novo") return;
    const profile = getProfile(client.id);
    if (!profile) return;
    const lifecycleHigh = client.status === "assinado" || client.status === "migrando" || client.status === "ativo";

    (Object.keys(DOC_PENDING_STAGE) as DocPendingType[]).forEach((type) => {
      const stageName = DOC_PENDING_STAGE[type];
      const step = profile.migrationSteps.find((s) => s.stepName === stageName);
      if (!step) return;

      const stageActive =
        client.status === "qualificando" ||
        client.status === "proposta_enviada" ||
        client.status === "em_negociacao" ||
        client.status === "assinado" ||
        client.status === "migrando" ||
        client.status === "ativo";
      if (!stageActive) return;

      // Required-by-stage filtering
      if (type === "fatura" || type === "procuracao") {
        if (step.documents.length > 0) return;
        if (client.status === "novo") return;
      } else if (type === "carta_denuncia") {
        if (client.status !== "assinado" && client.status !== "migrando" && client.status !== "ativo") return;
        if (step.status === "concluido" && step.documents.length > 0) return;
      } else if (type === "contrato_assinado" || type === "cusd_ccer") {
        if (client.status !== "assinado" && client.status !== "migrando" && client.status !== "ativo") return;
        if (step.status === "concluido" && step.documents.length > 0) return;
      } else if (type === "smf") {
        if (client.status !== "migrando" && client.status !== "ativo") return;
        if (step.status === "concluido") return;
      } else if (type === "ccee") {
        if (client.status !== "migrando" && client.status !== "ativo") return;
        if (step.status === "concluido") return;
      }

      const severity: DocSeverity = lifecycleHigh
        ? type === "carta_denuncia" || type === "smf"
          ? "critica"
          : "alta"
        : "media";

      const reason = (() => {
        if (type === "fatura") return "Necessária para diagnóstico e simulação";
        if (type === "procuracao") return "Permite formalizar pedidos junto à distribuidora";
        if (type === "carta_denuncia") return "Sem este documento a denúncia não avança";
        if (type === "contrato_assinado") return "Necessário para iniciar a migração";
        if (type === "cusd_ccer") return "Aguardando assinatura do uso/comercialização";
        if (type === "smf") return "Adequação técnica obrigatória pela CCEE";
        return "Modelagem necessária para operar no ML";
      })();

      out.push({ client, type, stage: stageName, severity, reason });
    });
  });
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Alertas regulatórios e de migração

export type MigrationAlertType =
  | "etapa_parada"
  | "denuncia_atrasada"
  | "smf_pendente"
  | "ccee_pendente"
  | "contrato_vencendo"
  | "etapa_sem_atualizacao";

export const MIGRATION_ALERT_LABEL: Record<MigrationAlertType, string> = {
  etapa_parada: "Cliente parado em Migrando",
  denuncia_atrasada: "Denúncia à distribuidora pendente",
  smf_pendente: "SMF pendente",
  ccee_pendente: "Modelagem CCEE pendente",
  contrato_vencendo: "Contrato próximo do vencimento",
  etapa_sem_atualizacao: "Etapa sem atualização recente",
};

export type AlertSeverity = DocSeverity;

export type MigrationAlertEntry = {
  client: Client;
  type: MigrationAlertType;
  severity: AlertSeverity;
  description: string;
  stage?: ClientMigrationStage;
};

export function buildMigrationAlerts(
  clients: Client[],
  getProfile: (id: string) => ClientProfile | null,
): MigrationAlertEntry[] {
  const out: MigrationAlertEntry[] = [];
  const now = Date.now();

  clients.forEach((client) => {
    if (client.status !== "assinado" && client.status !== "migrando" && client.status !== "ativo") return;
    const profile = getProfile(client.id);
    if (!profile) return;

    profile.migrationSteps.forEach((step) => {
      const ageDays = Math.floor((now - new Date(step.updatedAt).getTime()) / 86_400_000);
      const isCritical = step.stepName === "denuncia" || step.stepName === "smf";
      if (step.status !== "concluido" && step.status !== "pendente") {
        if (ageDays >= 14) {
          out.push({
            client,
            type: "etapa_sem_atualizacao",
            severity: ageDays >= 30 ? "alta" : "media",
            description: `${stageLabel(step.stepName)} parada há ${ageDays} dias`,
            stage: step.stepName,
          });
        }
      }

      if (step.stepName === "denuncia" && step.status !== "concluido" && (client.status === "assinado" || client.status === "migrando")) {
        out.push({
          client,
          type: "denuncia_atrasada",
          severity: ageDays >= 7 ? "critica" : "alta",
          description: "Sem registro de denúncia formalizada",
          stage: step.stepName,
        });
      }
      if (step.stepName === "smf" && step.status !== "concluido" && client.status === "migrando") {
        out.push({
          client,
          type: "smf_pendente",
          severity: isCritical ? "alta" : "media",
          description: "Adequação SMF não concluída",
          stage: step.stepName,
        });
      }
      if (step.stepName === "ccee" && step.status !== "concluido" && client.status === "migrando") {
        out.push({
          client,
          type: "ccee_pendente",
          severity: "media",
          description: "Modelagem na CCEE pendente",
          stage: step.stepName,
        });
      }
    });

    profile.units.forEach((unit) => {
      if (!unit.contractEndAt) return;
      const days = Math.floor((+new Date(unit.contractEndAt) - now) / 86_400_000);
      if (days <= 60 && days >= 0) {
        out.push({
          client,
          type: "contrato_vencendo",
          severity: days <= 30 ? "alta" : "media",
          description: `${unit.ucCode} vence em ${days} dias`,
        });
      }
    });
  });

  return out.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

export function severityRank(s: AlertSeverity): number {
  return { baixa: 0, media: 1, alta: 2, critica: 3 }[s];
}

const STAGE_LABEL_FALLBACK: Record<ClientMigrationStage, string> = {
  diagnostico: "Diagnóstico",
  simulacao: "Simulação",
  proposta_enviada: "Proposta enviada",
  proposta_aceita: "Proposta aceita",
  denuncia: "Denúncia",
  contratos: "Contratos",
  smf: "SMF",
  ccee: "CCEE",
  ativo_ml: "Ativo no ML",
};

function stageLabel(stage: ClientMigrationStage) {
  return STAGE_LABEL_FALLBACK[stage];
}

// ───────────────────────────────────────────────────────────────────────────
// Score de prioridade

export type PriorityEntry = {
  client: Client;
  profile: ClientProfile;
  score: number;
  reason: string;
};

export function computePriority(
  client: Client,
  profile: ClientProfile,
  proposals: Proposal[],
  simulations: Simulation[],
  followUpAt?: string,
  stageUpdatedAt?: string,
): PriorityEntry {
  const sim = pickLatestSimulation(client, simulations);
  const projected = sim?.resultsData.monthlySavings ?? client.monthlySavings ?? 0;
  const consumption = profile.averageConsumptionKwh ?? 0;

  const economyScore = Math.min(40, projected / 250);
  const consumptionScore = Math.min(10, consumption / 20_000);

  const proposal = pickLatestProposal(client, proposals);
  let proposalScore = 0;
  let primaryReason = "";
  if (proposal && proposal.status === "enviada") {
    const diffH = (proposalExpiresAt(proposal).getTime() - Date.now()) / 3_600_000;
    if (diffH > 0 && diffH <= 24) {
      proposalScore = 25;
      primaryReason = `Proposta vence em ${Math.max(1, Math.floor(diffH))}h e economia projetada é de ${formatCurrencyBrief(projected)}/mês`;
    } else if (diffH > 0 && diffH <= 48) {
      proposalScore = 20;
      primaryReason = `Proposta vence em ${Math.floor(diffH)}h`;
    } else if (diffH <= 0) {
      proposalScore = 10;
      primaryReason = "Proposta expirada — gerar nova";
    }
  }

  let followScore = 0;
  if (followUpAt) {
    const t = +new Date(followUpAt);
    if (t < Date.now()) {
      followScore = 15;
      if (!primaryReason) primaryReason = "Follow-up em atraso";
    } else {
      const diffD = (t - Date.now()) / 86_400_000;
      if (diffD <= 1) followScore = 10;
    }
  }

  const stageScore =
    client.status === "ativo"
      ? 0
      : client.status === "migrando"
        ? 8
        : client.status === "assinado"
          ? 9
          : client.status === "em_negociacao"
            ? 10
            : client.status === "proposta_enviada"
              ? 9
              : client.status === "qualificando"
                ? 6
                : client.status === "novo"
                  ? 4
                  : 0;

  const sla = stageUpdatedAt
    ? slaStatus(client.status, daysInStage(stageUpdatedAt))
    : "ok";
  const slaScore = sla === "atrasado" ? 6 : sla === "atencao" ? 3 : 0;
  if (!primaryReason && sla === "atrasado") primaryReason = `Parado há mais de ${STAGE_SLA_DAYS[client.status]}d nesta etapa`;

  if (!primaryReason) {
    if (projected > 0) primaryReason = `Economia projetada de ${formatCurrencyBrief(projected)}/mês`;
    else primaryReason = "Em qualificação";
  }

  const score = Math.round(
    economyScore + proposalScore + followScore + stageScore + slaScore + consumptionScore,
  );

  return { client, profile, score, reason: primaryReason };
}

export type PriorityLevel = "alta" | "media" | "baixa";

export function priorityLevel(score: number): PriorityLevel {
  if (score >= 55) return "alta";
  if (score >= 30) return "media";
  return "baixa";
}

export const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  alta: "Alta prioridade",
  media: "Média prioridade",
  baixa: "Baixa prioridade",
};

function formatCurrencyBrief(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// Quick filter modes used by summary cards
export type QuickFilter =
  | null
  | "follow_pendente"
  | "proposta_vencendo"
  | "doc_pendente"
  | "migrando"
  | "alta_prioridade";

export const SEVERITY_TONE: Record<AlertSeverity, string> = {
  baixa: "bg-ink-100 text-ink-600 ring-ink-200",
  media: "bg-info-50 text-info-700 ring-info-200",
  alta: "bg-warning-50 text-warning-800 ring-warning-200",
  critica: "bg-danger-50 text-danger-700 ring-danger-200",
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};
