import type {
  BillingState,
  BusinessType,
  ChurnReason,
  HealthCondition,
  LeadLostReason,
  LeadSource,
  LeadStage,
  PaymentMethod,
  PaymentStatus,
  PlanFrequency,
  StaffRole,
  StudentActivityKind,
  StudentStatus,
  SubscriptionStatus,
  TaskPriority,
  WorkoutLevel,
} from "./types";

// ───────────────────────────── rótulos ─────────────────────────────────────

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  academia: "Academia de musculação",
  estudio: "Estúdio",
  natacao: "Escola de natação",
  crossfit: "Box de crossfit",
  lutas: "Academia de lutas",
  outro: "Outro negócio de saúde",
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  gestao: "Gestão",
  recepcao: "Recepção",
  contabilidade: "Contabilidade",
  personal: "Personal",
  outro: "Outro perfil",
};

export const PLAN_FREQUENCY_LABEL: Record<PlanFrequency, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export const PLAN_FREQUENCY_MONTHS: Record<PlanFrequency, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

// "a cada 3 meses"
export function planCadenceLabel(frequency: PlanFrequency) {
  const months = PLAN_FREQUENCY_MONTHS[frequency];
  return months === 1 ? "por mês" : `a cada ${months} meses`;
}

export const CHURN_REASON_LABEL: Record<ChurnReason, string> = {
  preco: "Preço",
  financeiro: "Situação financeira",
  mudanca: "Mudança de cidade ou bairro",
  horario: "Horário não encaixa",
  saude: "Saúde ou lesão",
  insatisfacao: "Insatisfação com o serviço",
  outro: "Outro motivo",
};

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  novo: "Novo contato",
  contato: "Em conversa",
  agendada: "Aula agendada",
  experimental: "Aula feita",
  matriculado: "Matriculado",
  perdido: "Perdido",
};

export const LEAD_STAGE_HINT: Record<LeadStage, string> = {
  novo: "Chegou agora. Responda no mesmo dia.",
  contato: "Conversando. Ofereça a aula experimental.",
  agendada: "Aula marcada. Confirme na véspera.",
  experimental: "Já treinou. Hora de fechar o plano.",
  matriculado: "Virou aluno.",
  perdido: "Não fechou. O motivo fica registrado.",
};

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  instagram: "Instagram",
  indicacao: "Indicação",
  passante: "Passou na porta",
  whatsapp: "WhatsApp",
  site: "Site",
  google: "Google",
  outro: "Outro",
};

export const LEAD_LOST_REASON_LABEL: Record<LeadLostReason, string> = {
  preco: "Achou caro",
  horario: "Horário não encaixa",
  distancia: "Longe de casa ou do trabalho",
  sem_resposta: "Parou de responder",
  concorrente: "Escolheu outra academia",
  desistiu: "Desistiu de treinar agora",
  outro: "Outro motivo",
};

export const WORKOUT_LEVEL_LABEL: Record<WorkoutLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const HEALTH_CONDITION_LABEL: Record<HealthCondition, string> = {
  coluna: "Problema na coluna",
  joelho: "Lesão no joelho",
  ombro: "Lesão no ombro",
  hipertensao: "Hipertensão",
  diabetes: "Diabetes",
  cardiaco: "Problema cardíaco",
  respiratorio: "Asma ou problema respiratório",
  gestante: "Gestante",
  cirurgia_recente: "Cirurgia recente",
  obesidade: "Obesidade",
  outro: "Outra condição",
};

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function weekdaysLabel(days?: number[]) {
  if (!days || days.length === 0) return "";
  return WEEKDAY_ORDER.filter((d) => days.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(" · ");
}

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

export const BILLING_STATE_LABEL: Record<BillingState, string> = {
  em_dia: "Em dia",
  a_vencer: "A vencer",
  inadimplente: "Inadimplente",
  sem_plano: "Sem plano",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  outro: "Outro",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const ACTIVITY_KIND_LABEL: Record<StudentActivityKind, string> = {
  cadastro: "Cadastro",
  nota: "Nota",
  pagamento: "Pagamento",
  cobranca: "Cobrança",
  plano: "Plano",
  status: "Status",
  contato: "Contato",
  tarefa: "Tarefa",
};

export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  ativo: "Assinatura ativa",
  trial: "Em trial",
  expirado: "Expirada",
};

// ───────────────────────────── números e moeda ─────────────────────────────

export function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatCurrencyDetailed(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(v: number) {
  return v.toLocaleString("pt-BR");
}

// ───────────────────────────── datas ───────────────────────────────────────

// Data local no formato YYYY-MM-DD (o mesmo das colunas `date`).
export function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayValue() {
  return toDateValue(new Date());
}

// Interpreta YYYY-MM-DD como meia-noite local (evita o deslocamento de fuso
// que `new Date("YYYY-MM-DD")` causa).
export function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addMonthsToDateValue(value: string, months: number) {
  const date = parseDateValue(value);
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return toDateValue(next);
}

// Dias inteiros entre hoje e a data (positivo = no futuro).
export function daysFromToday(value: string) {
  const target = parseDateValue(value);
  const today = parseDateValue(todayValue());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDateValue(value?: string | null) {
  if (!value) return "—";
  return parseDateValue(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
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
  const d2 = new Date(iso);
  return d2.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(iso: string) {
  return parseDateValue(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDateLong(iso: string) {
  return parseDateValue(iso).toLocaleDateString("pt-BR", {
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

export function ageFromBirthDate(value?: string | null) {
  if (!value) return null;
  const birth = parseDateValue(value);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function isBirthdayToday(value?: string | null) {
  if (!value) return false;
  const birth = parseDateValue(value);
  const today = new Date();
  return birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth();
}

// ───────────────────────────── documentos e contato ────────────────────────

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

export function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}

// Link do WhatsApp com mensagem pronta. Números sem DDI recebem o 55 do Brasil.
export function whatsappLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string) {
  return name.trim().split(" ")[0] ?? name;
}
