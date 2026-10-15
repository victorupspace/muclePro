import { PLAN_FREQUENCY_MONTHS, addMonthsToDateValue, daysFromToday } from "./format";
import type { Payment, Plan, Student, StudentBilling } from "./types";

// Regra de cobrança (v1): cada plano gera uma cobrança por ciclo. Quando a
// cobrança é paga, a próxima nasce com vencimento = vencimento anterior +
// frequência do plano. "Inadimplente" = pelo menos uma cobrança pendente
// vencida; "a vencer" = próxima cobrança em até 7 dias.

export const DUE_SOON_DAYS = 7;

export function computeBilling(student: Student, payments: Payment[]): StudentBilling {
  const pending = payments
    .filter((p) => p.studentId === student.id && p.status === "pendente")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const overdue = pending.filter((p) => daysFromToday(p.dueAt) < 0);

  if (overdue.length > 0) {
    const first = overdue[0];
    return {
      state: "inadimplente",
      overduePayment: first,
      nextPayment: first,
      overdueDays: Math.abs(daysFromToday(first.dueAt)),
      overdueAmount: overdue.reduce((sum, p) => sum + p.amount, 0),
    };
  }

  const next = pending[0];
  if (next) {
    const daysUntilDue = daysFromToday(next.dueAt);
    return {
      state: daysUntilDue <= DUE_SOON_DAYS ? "a_vencer" : "em_dia",
      nextPayment: next,
      overdueDays: 0,
      overdueAmount: 0,
      daysUntilDue,
    };
  }

  if (!student.planId) {
    return { state: "sem_plano", overdueDays: 0, overdueAmount: 0 };
  }

  return { state: "em_dia", overdueDays: 0, overdueAmount: 0 };
}

// Vencimento da cobrança seguinte a partir da atual.
export function nextDueDate(currentDue: string, plan: Plan) {
  return addMonthsToDateValue(currentDue, PLAN_FREQUENCY_MONTHS[plan.frequency]);
}

// Rótulo do ciclo: "Jan/2026" para mensal, "Jan–Mar/2026" para períodos maiores.
export function cycleLabel(dueAt: string, plan: Plan) {
  const months = PLAN_FREQUENCY_MONTHS[plan.frequency];
  const [year, month] = dueAt.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month - 1 + months - 1, 1);
  const fmt = (d: Date) => {
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  if (months === 1) return `${fmt(start)}/${start.getFullYear()}`;
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmt(start)}–${fmt(end)}/${end.getFullYear()}`;
  }
  return `${fmt(start)}/${start.getFullYear()}–${fmt(end)}/${end.getFullYear()}`;
}

// Receita recorrente mensalizada dos alunos ativos com plano.
export function monthlyRecurring(students: Student[], plans: Plan[]) {
  const planById = new Map(plans.map((p) => [p.id, p]));
  return students.reduce((sum, s) => {
    if (s.status !== "ativo" || !s.planId) return sum;
    const plan = planById.get(s.planId);
    if (!plan) return sum;
    return sum + plan.amount / PLAN_FREQUENCY_MONTHS[plan.frequency];
  }, 0);
}
