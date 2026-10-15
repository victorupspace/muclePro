import { daysFromToday, toDateValue } from "./format";
import type { Lead, LeadStage } from "./types";

// Funil de matrículas: ordem das etapas, prazo de cada uma e conversão.

export const LEAD_STAGES: LeadStage[] = ["novo", "contato", "agendada", "experimental", "matriculado", "perdido"];
export const OPEN_STAGES: LeadStage[] = ["novo", "contato", "agendada", "experimental"];
// Etapas finais mostram só o que aconteceu nos últimos dias, para o quadro
// não virar arquivo morto.
export const CLOSED_WINDOW_DAYS = 30;

export const LEAD_STAGE_DOT: Record<LeadStage, string> = {
  novo: "bg-info-500",
  contato: "bg-brand-light",
  agendada: "bg-warning-500",
  experimental: "bg-brand",
  matriculado: "bg-success-500",
  perdido: "bg-ink-400",
};

// Dias sem andar até pedir atenção / considerar atrasado.
const SLA: Partial<Record<LeadStage, [number, number]>> = {
  novo: [1, 3],
  contato: [3, 7],
  experimental: [2, 5],
};

export type LeadSla = "ok" | "atencao" | "atrasado";

export function daysInStage(lead: Lead) {
  return Math.max(0, Math.floor((Date.now() - new Date(lead.stageChangedAt).getTime()) / 86_400_000));
}

export function leadSla(lead: Lead): LeadSla {
  if (lead.stage === "agendada") {
    if (!lead.trialAt) return "atencao";
    // Aula marcada que já passou e ninguém atualizou.
    return new Date(lead.trialAt).getTime() < Date.now() - 2 * 3_600_000 ? "atrasado" : "ok";
  }
  const limits = SLA[lead.stage];
  if (!limits) return "ok";
  const days = daysInStage(lead);
  if (days > limits[1]) return "atrasado";
  if (days > limits[0]) return "atencao";
  return "ok";
}

export function trialLabel(trialAt?: string) {
  if (!trialAt) return null;
  const date = new Date(trialAt);
  const days = daysFromToday(toDateValue(date));
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return { text: `Hoje, ${time}`, tone: date.getTime() < Date.now() ? "past" : "today" } as const;
  if (days === 1) return { text: `Amanhã, ${time}`, tone: "soon" } as const;
  if (days < 0) return { text: `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}, ${time}`, tone: "past" } as const;
  return {
    text: `${date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "")}, ${time}`,
    tone: "later",
  } as const;
}

export function isVisibleOnBoard(lead: Lead) {
  if (OPEN_STAGES.includes(lead.stage)) return true;
  return daysInStage(lead) <= CLOSED_WINDOW_DAYS;
}

export type FunnelStats = {
  open: number;
  trialsThisWeek: number;
  enrolledThisMonth: number;
  conversion: number | null;
  createdInWindow: number;
};

// Conversão = matriculados entre os leads criados nos últimos `days` dias.
export function funnelStats(leads: Lead[], days = 90): FunnelStats {
  const since = Date.now() - days * 86_400_000;
  const now = new Date();
  const monthPrefix = toDateValue(now).slice(0, 7);
  const weekEnd = Date.now() + 7 * 86_400_000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const recent = leads.filter((l) => new Date(l.createdAt).getTime() >= since);
  const enrolled = recent.filter((l) => l.stage === "matriculado").length;

  return {
    open: leads.filter((l) => OPEN_STAGES.includes(l.stage)).length,
    trialsThisWeek: leads.filter((l) => {
      if (l.stage !== "agendada" || !l.trialAt) return false;
      const t = new Date(l.trialAt).getTime();
      return t >= startOfToday && t <= weekEnd;
    }).length,
    enrolledThisMonth: leads.filter((l) => l.convertedAt && toDateValue(new Date(l.convertedAt)).startsWith(monthPrefix)).length,
    conversion: recent.length > 0 ? Math.round((enrolled / recent.length) * 100) : null,
    createdInWindow: recent.length,
  };
}

// Próxima etapa natural (botão "Avançar" no cartão).
export function nextStage(stage: LeadStage): LeadStage | null {
  const i = OPEN_STAGES.indexOf(stage);
  if (i === -1) return null;
  return i === OPEN_STAGES.length - 1 ? "matriculado" : OPEN_STAGES[i + 1];
}

// Valor para <input type="datetime-local"> a partir de ISO, no fuso local.
export function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : "";
}
