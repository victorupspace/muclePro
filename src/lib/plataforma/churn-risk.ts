import { PLAN_FREQUENCY_MONTHS, daysFromToday, formatCurrency } from "./format";
import type { ChurnRisk, Payment, Plan, Student, StudentActivity, StudentBilling } from "./types";

// Radar de risco de saída. Pontuação simples e explicável: cada sinal soma
// pontos e vira um motivo em português, para o gestor saber por que agir.
//
//   em atraso agora .................. 35 (+15 se passar de 15 dias)
//   pagou atrasado (últimos 6 meses) .  8 por vez, até 24
//   ativo sem plano .................. 25
//   plano longo renovando em ≤30 dias  15
//   sem interação há mais de 45 dias . 10
//   nos primeiros 60 dias ............ 10
//
// alto ≥ 45 · médio ≥ 25

export const RISK_HIGH = 45;
export const RISK_MEDIUM = 25;

const INTERACTION_KINDS = new Set(["contato", "nota", "cobranca", "pagamento"]);

export function computeChurnRisk(
  student: Student,
  billing: StudentBilling,
  payments: Payment[],
  activities: StudentActivity[],
  plan?: Plan,
): ChurnRisk {
  if (student.status !== "ativo") return { score: 0, level: "baixo", reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  if (billing.state === "inadimplente") {
    score += 35;
    if (billing.overdueDays >= 15) score += 15;
    reasons.push(`${formatCurrency(billing.overdueAmount)} em atraso há ${billing.overdueDays} dia${billing.overdueDays === 1 ? "" : "s"}`);
  }

  const sixMonthsAgo = Date.now() - 180 * 86_400_000;
  const latePaid = payments.filter((p) => {
    if (p.studentId !== student.id || p.status !== "pago" || !p.paidAt) return false;
    const paid = new Date(p.paidAt).getTime();
    if (paid < sixMonthsAgo) return false;
    const due = new Date(`${p.dueAt}T23:59:59`).getTime();
    return paid - due > 3 * 86_400_000;
  }).length;
  if (latePaid > 0) {
    score += Math.min(24, latePaid * 8);
    reasons.push(`Pagou com atraso ${latePaid} vez${latePaid === 1 ? "" : "es"} nos últimos 6 meses`);
  }

  if (billing.state === "sem_plano") {
    score += 25;
    reasons.push("Ativo sem plano: não gera cobrança");
  }

  if (plan && PLAN_FREQUENCY_MONTHS[plan.frequency] >= 3 && billing.nextPayment && billing.state !== "inadimplente") {
    const days = daysFromToday(billing.nextPayment.dueAt);
    if (days >= 0 && days <= 30) {
      score += 15;
      reasons.push(`Renovação do plano ${plan.name} em ${days === 0 ? "hoje" : `${days} dia${days === 1 ? "" : "s"}`}`);
    }
  }

  const lastInteraction = activities
    .filter((a) => a.studentId === student.id && INTERACTION_KINDS.has(a.kind))
    .reduce<number>((latest, a) => Math.max(latest, new Date(a.at).getTime()), 0);
  const since = lastInteraction || new Date(student.planStartedAt ?? student.createdAt).getTime();
  const quietDays = Math.floor((Date.now() - since) / 86_400_000);
  if (quietDays > 45) {
    score += 10;
    reasons.push(`Sem interação há ${quietDays} dias`);
  }

  const start = student.planStartedAt ?? student.createdAt.slice(0, 10);
  const tenure = -daysFromToday(start);
  if (tenure >= 0 && tenure < 60) {
    score += 10;
    reasons.push("Nos primeiros 60 dias, fase em que mais alunos desistem");
  }

  const level = score >= RISK_HIGH ? "alto" : score >= RISK_MEDIUM ? "medio" : "baixo";
  return { score, level, reasons };
}

export const RISK_LEVEL_LABEL = { alto: "Risco alto", medio: "Risco médio", baixo: "Risco baixo" } as const;
