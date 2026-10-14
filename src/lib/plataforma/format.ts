import type {
  ClientLifecycleStatus,
  ClientMigrationStage,
  ClientProfileTag,
  ClientStatus,
  ProposalStatus,
  SimulationStatus,
  SubscriptionStatus,
  TaskPriority,
} from "./types";

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  novo: "Novo",
  qualificando: "Qualificando",
  proposta_enviada: "Proposta enviada",
  em_negociacao: "Em negociação",
  assinado: "Assinado",
  migrando: "Migrando",
  ativo: "Ativo",
  inativo: "Inativo",
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
};

export const SIMULATION_STATUS_LABEL: Record<SimulationStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  arquivada: "Arquivada",
};

export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  ativo: "Assinatura ativa",
  trial: "Em trial",
  expirado: "Expirada",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatCurrencyDetailed(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(v: number) {
  return v.toLocaleString("pt-BR");
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const months = Math.floor(d / 30);
  if (months < 12) return `há ${months} meses`;
  const d2 = new Date(iso);
  return d2.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDocument(doc?: string | null) {
  if (!doc) return "—";
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return doc;
}

export function formatKwh(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
}

export function formatKw(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW`;
}

export const CLIENT_LIFECYCLE_LABEL: Record<ClientLifecycleStatus, string> = {
  novo: "Novo",
  qualificando: "Qualificando",
  proposta_enviada: "Proposta enviada",
  em_negociacao: "Em negociação",
  assinado: "Assinado",
  migrando: "Migrando",
  ativo: "Ativo",
  inativo: "Inativo",
};

export const CLIENT_PROFILE_LABEL: Record<ClientProfileTag, string> = {
  varejista: "Varejista",
  atacadista: "Atacadista",
  industria: "Indústria",
  servicos: "Serviços",
  logistica: "Logística",
  outros: "Outros",
};

export const CLIENT_MIGRATION_STAGES: ClientMigrationStage[] = [
  "diagnostico",
  "simulacao",
  "proposta_enviada",
  "proposta_aceita",
  "denuncia",
  "contratos",
  "smf",
  "ccee",
  "ativo_ml",
];

export const CLIENT_MIGRATION_LABEL: Record<ClientMigrationStage, string> = {
  diagnostico: "Diagnóstico inicial",
  simulacao: "Simulação realizada",
  proposta_enviada: "Proposta enviada",
  proposta_aceita: "Proposta aceita",
  denuncia: "Denúncia à distribuidora",
  contratos: "Assinatura de contratos (CUSD/CCER)",
  smf: "Adequação SMF",
  ccee: "Modelagem CCEE",
  ativo_ml: "Cliente ativo no mercado livre",
};
