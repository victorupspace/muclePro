import type { BusinessType, LeadStatus, PaymentStatus } from "./types";

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  em_dia: "Em dia",
  pendente: "Pendente",
  atrasado: "Atrasado",
  trial: "Trial",
  cancelado: "Cancelado",
  nao_iniciado: "Não iniciado",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  aguardando: "Aguardando contato",
  em_contato: "Em contato",
  convertida: "Convertida",
  perdida: "Perdida",
};

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  academia: "Academia de musculação",
  estudio: "Estúdio (funcional, pilates, yoga)",
  natacao: "Escola de natação",
  crossfit: "Box de crossfit",
  lutas: "Academia de lutas ou jiu-jitsu",
  outro: "Outro negócio de saúde",
};

// Faixas informadas no formulário da home (valores livres no banco).
export const UNITS_RANGE_LABEL: Record<string, string> = {
  "1": "1 unidade",
  "2-5": "2 a 5",
  "6+": "6 ou mais",
};

export const STUDENTS_RANGE_LABEL: Record<string, string> = {
  "ate-100": "Até 100",
  "100-300": "100 a 300",
  "300-1000": "300 a 1.000",
  "1000+": "Mais de 1.000",
};

function isBusinessType(value: string): value is BusinessType {
  return value in BUSINESS_TYPE_LABEL;
}

export function businessTypeLabel(value?: string | null) {
  if (!value) return "—";
  return isBusinessType(value) ? BUSINESS_TYPE_LABEL[value] : value;
}

export function unitsRangeLabel(value?: string | null) {
  if (!value) return "—";
  return UNITS_RANGE_LABEL[value] ?? value;
}

export function studentsRangeLabel(value?: string | null) {
  if (!value) return "—";
  return STUDENTS_RANGE_LABEL[value] ?? value;
}

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
