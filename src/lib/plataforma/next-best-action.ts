import { computeBilling } from "./billing";
import { daysFromToday, formatCurrency, isBirthdayToday } from "./format";
import type { Payment, Plan, Staff, Student, StudentBilling, Task, Unit } from "./types";

// Ações recomendadas ao gestor. Cada regra olha para a base e devolve no
// máximo uma ação por aluno (a mais urgente), para a lista não virar ruído.

export type NextBestActionPriority = "low" | "medium" | "high" | "critical";

export type NextBestActionType =
  | "overdue_payment"
  | "due_soon"
  | "no_plan"
  | "missing_emergency_contact"
  | "birthday"
  | "staff_without_unit"
  | "overdue_task";

export type NextBestActionCta =
  | "register_payment"
  | "send_charge"
  | "send_reminder"
  | "assign_plan"
  | "complete_profile"
  | "congratulate"
  | "link_unit"
  | "open_tasks";

export type NextBestAction = {
  id: string;
  type: NextBestActionType;
  priority: NextBestActionPriority;
  title: string;
  reason: string;
  ctaLabel: string;
  ctaAction: NextBestActionCta;
  studentId?: string;
  staffId?: string;
  taskId?: string;
};

type Input = {
  students: Student[];
  payments: Payment[];
  plans: Plan[];
  units: Unit[];
  staff: Staff[];
  tasks: Task[];
  billingFor?: (studentId: string) => StudentBilling;
};

const PRIORITY_RANK: Record<NextBestActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildNextBestActions(input: Input): NextBestAction[] {
  const actions: NextBestAction[] = [];
  const billingFor =
    input.billingFor ?? ((id: string) => computeBilling(input.students.find((s) => s.id === id)!, input.payments));

  for (const student of input.students) {
    if (student.status !== "ativo") continue;
    const billing = billingFor(student.id);
    const action =
      overduePaymentAction(student, billing) ??
      noPlanAction(student, billing) ??
      dueSoonAction(student, billing) ??
      missingEmergencyContactAction(student) ??
      birthdayAction(student);
    if (action) actions.push(action);
  }

  const activeUnits = input.units.filter((u) => u.active);
  if (activeUnits.length > 1) {
    for (const member of input.staff) {
      if (!member.active || member.unitId) continue;
      actions.push({
        id: `staff-unit-${member.id}`,
        type: "staff_without_unit",
        priority: "low",
        title: `${member.fullName} sem unidade`,
        reason: "Com mais de uma filial, cada funcionário precisa estar vinculado à sua unidade.",
        ctaLabel: "Vincular unidade",
        ctaAction: "link_unit",
        staffId: member.id,
      });
    }
  }

  const overdueTasks = input.tasks.filter((t) => !t.done && t.dueAt && new Date(t.dueAt).getTime() < Date.now());
  if (overdueTasks.length > 0) {
    actions.push({
      id: "tasks-overdue",
      type: "overdue_task",
      priority: overdueTasks.length >= 3 ? "high" : "medium",
      title: `${overdueTasks.length} tarefa${overdueTasks.length === 1 ? "" : "s"} atrasada${overdueTasks.length === 1 ? "" : "s"}`,
      reason: "Tarefas com prazo vencido perdem o efeito. Conclua ou reagende.",
      ctaLabel: "Ver tarefas",
      ctaAction: "open_tasks",
    });
  }

  return actions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

function overduePaymentAction(student: Student, billing: StudentBilling): NextBestAction | null {
  if (billing.state !== "inadimplente" || !billing.overduePayment) return null;
  const days = billing.overdueDays;
  return {
    id: `overdue-${student.id}`,
    type: "overdue_payment",
    priority: days >= 7 ? "critical" : "high",
    title: `Cobrar ${student.fullName}`,
    reason: `${formatCurrency(billing.overdueAmount)} em atraso há ${days} dia${days === 1 ? "" : "s"}.`,
    ctaLabel: "Enviar cobrança",
    ctaAction: "send_charge",
    studentId: student.id,
  };
}

function noPlanAction(student: Student, billing: StudentBilling): NextBestAction | null {
  if (billing.state !== "sem_plano") return null;
  return {
    id: `no-plan-${student.id}`,
    type: "no_plan",
    priority: "high",
    title: `${student.fullName} está sem plano`,
    reason: "Aluno ativo sem plano não gera cobrança. Vincule um plano para iniciar o ciclo.",
    ctaLabel: "Vincular plano",
    ctaAction: "assign_plan",
    studentId: student.id,
  };
}

function dueSoonAction(student: Student, billing: StudentBilling): NextBestAction | null {
  if (billing.state !== "a_vencer" || !billing.nextPayment) return null;
  const days = billing.daysUntilDue ?? daysFromToday(billing.nextPayment.dueAt);
  const when = days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`;
  return {
    id: `due-soon-${student.id}`,
    type: "due_soon",
    priority: days <= 1 ? "high" : "medium",
    title: `Lembrar ${student.fullName}`,
    reason: `${formatCurrency(billing.nextPayment.amount)} vence ${when}. Um lembrete evita o atraso.`,
    ctaLabel: "Enviar lembrete",
    ctaAction: "send_reminder",
    studentId: student.id,
  };
}

function missingEmergencyContactAction(student: Student): NextBestAction | null {
  if (student.emergencyContactName && student.emergencyContactPhone) return null;
  return {
    id: `emergency-${student.id}`,
    type: "missing_emergency_contact",
    priority: "medium",
    title: `Completar cadastro de ${student.fullName}`,
    reason: "Sem contato de emergência. É a informação mais crítica num atendimento.",
    ctaLabel: "Completar cadastro",
    ctaAction: "complete_profile",
    studentId: student.id,
  };
}

function birthdayAction(student: Student): NextBestAction | null {
  if (!isBirthdayToday(student.birthDate)) return null;
  return {
    id: `birthday-${student.id}`,
    type: "birthday",
    priority: "low",
    title: `Aniversário de ${student.fullName}`,
    reason: "É hoje. Uma mensagem rápida ajuda a manter o aluno por perto.",
    ctaLabel: "Parabenizar",
    ctaAction: "congratulate",
    studentId: student.id,
  };
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
