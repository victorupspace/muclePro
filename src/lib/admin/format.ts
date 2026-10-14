import type {
  AccountKind,
  ComercializadoraStatus,
  LandingLeadKind,
  PaymentStatus,
} from "./types";

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  consultor: "Consultor",
  comercializadora: "Comercializadora",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  em_dia: "Em dia",
  pendente: "Pendente",
  atrasado: "Atrasado",
  trial: "Trial",
  cancelado: "Cancelado",
  nao_iniciado: "Não iniciado",
};

export const LEAD_STATUS_LABEL: Record<ComercializadoraStatus, string> = {
  aguardando: "Aguardando contato",
  em_contato: "Em contato",
  convertida: "Convertida",
  perdida: "Perdida",
};

export const LANDING_LEAD_KIND_LABEL: Record<LandingLeadKind, string> = {
  consultor: "Consultor",
  comercializadora: "Comercializadora",
  consumidor: "Consumidor final",
};

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  return formatDate(iso);
}

export function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
