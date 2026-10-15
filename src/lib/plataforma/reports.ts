import { MARK_STROKES, MARK_VIEWBOX, markPathToPdfOps } from "@/lib/brand/mark";
import {
  CHURN_REASON_LABEL,
  LEAD_LOST_REASON_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STAGE_LABEL,
  PAYMENT_METHOD_LABEL,
  formatCurrencyDetailed,
  formatDateValue,
  toDateValue,
} from "./format";
import type { Lead, Payment, Plan, Student, Unit } from "./types";

// Relatórios: períodos, séries mensais, agrupamentos e exportações (CSV para
// planilha/contador e PDF de fechamento). Tudo calculado no navegador a partir
// do que o usuário já pode ver.

export type PeriodKey = "this_month" | "last_month" | "last_3" | "last_12" | "this_year";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_3", label: "Últimos 3 meses" },
  { value: "this_year", label: "Este ano" },
  { value: "last_12", label: "Últimos 12 meses" },
];

export type Period = { start: string; end: string; label: string };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => toDateValue(new Date(y, m, d));

export function resolvePeriod(key: PeriodKey, now = new Date()): Period {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = toDateValue(now);
  const monthName = (yy: number, mm: number) =>
    new Date(yy, mm, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  switch (key) {
    case "this_month":
      return { start: ymd(y, m, 1), end: today, label: monthName(y, m) };
    case "last_month":
      return { start: ymd(y, m - 1, 1), end: ymd(y, m, 0), label: monthName(y, m - 1) };
    case "last_3":
      return { start: ymd(y, m - 2, 1), end: today, label: "últimos 3 meses" };
    case "this_year":
      return { start: `${y}-01-01`, end: today, label: String(y) };
    case "last_12":
      return { start: ymd(y, m - 11, 1), end: today, label: "últimos 12 meses" };
  }
}

const dayOf = (iso?: string) => (iso ? toDateValue(new Date(iso)) : "");
export const inPeriod = (date: string, p: Period) => Boolean(date) && date >= p.start && date <= p.end;

export type MonthBucket = { key: string; label: string; short: string };

// Últimos `count` meses terminando no mês atual.
export function lastMonths(count = 12, now = new Date()): MonthBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const short = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      short: short.charAt(0).toUpperCase() + short.slice(1),
    };
  });
}

export function paidPayments(payments: Payment[]) {
  return payments.filter((p) => p.status === "pago" && p.paidAt);
}

export function revenueByMonth(payments: Payment[], months: MonthBucket[]) {
  const totals = new Map(months.map((m) => [m.key, 0]));
  for (const p of paidPayments(payments)) {
    const key = dayOf(p.paidAt).slice(0, 7);
    if (totals.has(key)) totals.set(key, totals.get(key)! + p.amount);
  }
  return months.map((m) => ({ ...m, value: totals.get(m.key) ?? 0 }));
}

export type Slice = { key: string; label: string; value: number; count: number };

export function groupSum<T>(items: T[], keyOf: (t: T) => string, labelOf: (key: string) => string, valueOf: (t: T) => number = () => 1): Slice[] {
  const map = new Map<string, Slice>();
  for (const item of items) {
    const key = keyOf(item);
    const slice = map.get(key) ?? { key, label: labelOf(key), value: 0, count: 0 };
    slice.value += valueOf(item);
    slice.count += 1;
    map.set(key, slice);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export function studentFlowByMonth(students: Student[], months: MonthBucket[]) {
  return months.map((m) => ({
    ...m,
    joined: students.filter((s) => dayOf(s.createdAt).startsWith(m.key)).length,
    left: students.filter((s) => s.status === "inativo" && s.churnedAt && dayOf(s.churnedAt).startsWith(m.key)).length,
  }));
}

// Ativos numa data: cadastrados até ela e que não tinham saído.
export function activeAt(students: Student[], date: string) {
  return students.filter(
    (s) => dayOf(s.createdAt) <= date && (s.churnedAt ? dayOf(s.churnedAt) > date : s.status === "ativo"),
  ).length;
}

// Permanência média em meses (até a saída ou até hoje).
export function averageTenureMonths(students: Student[]) {
  if (students.length === 0) return 0;
  const now = Date.now();
  const total = students.reduce((sum, s) => {
    const end = s.status === "inativo" && s.churnedAt ? new Date(s.churnedAt).getTime() : now;
    return sum + Math.max(0, end - new Date(s.planStartedAt ?? s.createdAt).getTime());
  }, 0);
  return total / students.length / (30.44 * 86_400_000);
}

export function churnReasons(students: Student[], p: Period): Slice[] {
  const left = students.filter((s) => s.status === "inativo" && s.churnedAt && inPeriod(dayOf(s.churnedAt), p));
  return groupSum(left, (s) => s.churnReason ?? "outro", (k) => CHURN_REASON_LABEL[k as keyof typeof CHURN_REASON_LABEL] ?? "Sem motivo");
}

export function funnelReport(leads: Lead[], p: Period) {
  const created = leads.filter((l) => inPeriod(dayOf(l.createdAt), p));
  const converted = leads.filter((l) => l.convertedAt && inPeriod(dayOf(l.convertedAt), p));
  const lost = leads.filter((l) => l.stage === "perdido" && inPeriod(dayOf(l.stageChangedAt), p));
  const order = ["novo", "contato", "agendada", "experimental", "matriculado"] as const;
  // Quantos dos criados no período chegaram (ao menos) a cada etapa.
  const reached = order.map((stage, i) => ({
    key: stage,
    label: LEAD_STAGE_LABEL[stage],
    value: created.filter((l) => l.stage !== "perdido" && order.indexOf(l.stage as (typeof order)[number]) >= i).length +
      (i === 0 ? created.filter((l) => l.stage === "perdido").length : 0),
    count: 0,
  }));
  const daysToConvert = converted
    .map((l) => (new Date(l.convertedAt!).getTime() - new Date(l.createdAt).getTime()) / 86_400_000)
    .filter((d) => d >= 0);
  const bySource = groupSum(created, (l) => l.source, (k) => LEAD_SOURCE_LABEL[k as keyof typeof LEAD_SOURCE_LABEL] ?? k).map((s) => ({
    ...s,
    converted: created.filter((l) => l.source === s.key && l.stage === "matriculado").length,
  }));
  return {
    created: created.length,
    converted: converted.length,
    lost: lost.length,
    conversion: created.length ? Math.round((created.filter((l) => l.stage === "matriculado").length / created.length) * 100) : null,
    avgDaysToConvert: daysToConvert.length ? daysToConvert.reduce((a, b) => a + b, 0) / daysToConvert.length : null,
    reached,
    bySource,
    lostReasons: groupSum(lost, (l) => l.lostReason ?? "outro", (k) => LEAD_LOST_REASON_LABEL[k as keyof typeof LEAD_LOST_REASON_LABEL] ?? k),
    convertedLeads: converted,
  };
}

// ───────────────────────────── CSV ─────────────────────────────────────────
// Separador ";" e vírgula decimal: abre direto no Excel em português.

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csvMoney = (n: number) => n.toFixed(2).replace(".", ",");

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ReportData = {
  companyName: string;
  period: Period;
  payments: Payment[];
  students: Student[];
  plans: Plan[];
  units: Unit[];
  leads: Lead[];
};

const fileStamp = (p: Period) => `${p.start}_a_${p.end}`;

export function exportPaymentsCsv(d: ReportData) {
  const student = new Map(d.students.map((s) => [s.id, s]));
  const plan = new Map(d.plans.map((p) => [p.id, p]));
  const unit = new Map(d.units.map((u) => [u.id, u]));
  const rows = paidPayments(d.payments)
    .filter((p) => inPeriod(dayOf(p.paidAt), d.period))
    .sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""))
    .map((p) => {
      const s = student.get(p.studentId);
      return [
        formatDateValue(dayOf(p.paidAt)),
        formatDateValue(p.dueAt),
        s?.fullName ?? "",
        s?.cpf ?? "",
        p.planId ? plan.get(p.planId)?.name ?? "" : "",
        p.referenceLabel ?? "",
        s?.unitId ? unit.get(s.unitId)?.name ?? "" : "",
        p.method ? PAYMENT_METHOD_LABEL[p.method] : "",
        csvMoney(p.amount),
      ];
    });
  downloadCsv(`recebimentos_${fileStamp(d.period)}.csv`, ["Pago em", "Vencimento", "Aluno", "CPF", "Plano", "Referência", "Unidade", "Forma", "Valor (R$)"], rows);
  return rows.length;
}

export function exportOpenChargesCsv(d: ReportData) {
  const today = toDateValue(new Date());
  const student = new Map(d.students.map((s) => [s.id, s]));
  const rows = d.payments
    .filter((p) => p.status === "pendente" && student.get(p.studentId)?.status === "ativo")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((p) => {
      const s = student.get(p.studentId)!;
      const late = p.dueAt < today;
      return [formatDateValue(p.dueAt), s.fullName, s.cpf ?? "", s.whatsapp ?? "", p.referenceLabel ?? "", late ? "Em atraso" : "A vencer", csvMoney(p.amount)];
    });
  downloadCsv(`cobrancas_em_aberto_${today}.csv`, ["Vencimento", "Aluno", "CPF", "WhatsApp", "Referência", "Situação", "Valor (R$)"], rows);
  return rows.length;
}

export function exportStudentsCsv(d: ReportData) {
  const plan = new Map(d.plans.map((p) => [p.id, p]));
  const unit = new Map(d.units.map((u) => [u.id, u]));
  const rows = [...d.students]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((s) => [
      s.fullName,
      s.cpf ?? "",
      s.whatsapp ?? "",
      s.email ?? "",
      s.birthDate ? formatDateValue(s.birthDate) : "",
      s.status === "ativo" ? "Ativo" : "Inativo",
      s.planId ? plan.get(s.planId)?.name ?? "" : "",
      s.unitId ? unit.get(s.unitId)?.name ?? "" : "",
      formatDateValue(dayOf(s.createdAt)),
      s.churnedAt ? formatDateValue(dayOf(s.churnedAt)) : "",
      s.churnReason ? CHURN_REASON_LABEL[s.churnReason] : "",
    ]);
  downloadCsv(`alunos_${toDateValue(new Date())}.csv`, ["Nome", "CPF", "WhatsApp", "E-mail", "Nascimento", "Situação", "Plano", "Unidade", "Cadastro", "Saída", "Motivo da saída"], rows);
  return rows.length;
}

export function exportLeadsCsv(d: ReportData) {
  const rows = d.leads
    .filter((l) => inPeriod(dayOf(l.createdAt), d.period))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((l) => [
      formatDateValue(dayOf(l.createdAt)),
      l.fullName,
      l.whatsapp ?? "",
      l.email ?? "",
      LEAD_SOURCE_LABEL[l.source],
      l.interest ?? "",
      LEAD_STAGE_LABEL[l.stage],
      l.convertedAt ? formatDateValue(dayOf(l.convertedAt)) : "",
      l.lostReason ? LEAD_LOST_REASON_LABEL[l.lostReason] : "",
    ]);
  downloadCsv(`interessados_${fileStamp(d.period)}.csv`, ["Entrada", "Nome", "WhatsApp", "E-mail", "Origem", "Interesse", "Etapa", "Matrícula", "Motivo da perda"], rows);
  return rows.length;
}

// ───────────────────────────── PDF de fechamento ───────────────────────────

const NAVY: [number, number, number] = [1, 33, 92];
const NAVY_LIGHT: [number, number, number] = [141, 168, 224];
const INK: [number, number, number] = [31, 31, 31];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [229, 231, 235];

export async function downloadClosingPdf(d: ReportData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;

  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 26, "F");
    const scale = 9 / MARK_VIEWBOX.height;
    doc.setLineWidth(3.4 * scale);
    doc.setLineCap("round");
    doc.setLineJoin("round");
    for (const stroke of MARK_STROKES) {
      doc.setDrawColor(...(stroke.tone === "primary" ? ([255, 255, 255] as [number, number, number]) : NAVY_LIGHT));
      doc.path(markPathToPdfOps(stroke.d, margin, 8.5, scale)).stroke();
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(d.companyName, margin + 16, 13.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY_LIGHT);
    doc.text(`Fechamento financeiro · ${formatDateValue(d.period.start)} a ${formatDateValue(d.period.end)}`, margin + 16, 18.5);
    y = 36;
  };
  const ensure = (h: number) => {
    if (y + h > pageH - 16) {
      doc.addPage();
      header();
    }
  };
  const sectionTitle = (t: string) => {
    ensure(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(t, margin, y);
    y += 6;
  };
  const table = (cols: { label: string; w: number; align?: "right" }[], rows: string[][]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    let x = margin;
    for (const c of cols) {
      doc.text(c.label.toUpperCase(), c.align === "right" ? x + c.w - 1 : x + 1, y, { align: c.align === "right" ? "right" : "left" });
      x += c.w;
    }
    y += 2;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4.5;
    doc.setFontSize(9);
    for (const row of rows) {
      ensure(7);
      doc.setTextColor(...INK);
      let cx = margin;
      row.forEach((cell, i) => {
        const c = cols[i];
        const text = (doc.splitTextToSize(cell, c.w - 2) as string[])[0] ?? "";
        doc.text(text, c.align === "right" ? cx + c.w - 1 : cx + 1, y, { align: c.align === "right" ? "right" : "left" });
        cx += c.w;
      });
      y += 5.2;
    }
    y += 3;
  };

  header();
  const paid = paidPayments(d.payments).filter((p) => inPeriod(dayOf(p.paidAt), d.period));
  const total = paid.reduce((s, p) => s + p.amount, 0);
  const student = new Map(d.students.map((s) => [s.id, s]));
  const plan = new Map(d.plans.map((p) => [p.id, p]));

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Total recebido no período", margin, y);
  y += 7;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(formatCurrencyDetailed(total), margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${paid.length} pagamento${paid.length === 1 ? "" : "s"}`, margin + 70, y);
  y += 10;

  const byMethod = groupSum(paid, (p) => p.method ?? "outro", (k) => PAYMENT_METHOD_LABEL[k as keyof typeof PAYMENT_METHOD_LABEL] ?? "Outro", (p) => p.amount);
  sectionTitle("Por forma de pagamento");
  table(
    [{ label: "Forma", w: 100 }, { label: "Pagamentos", w: 40, align: "right" }, { label: "Valor", w: 42, align: "right" }],
    byMethod.map((s) => [s.label, String(s.count), formatCurrencyDetailed(s.value)]),
  );

  const byPlan = groupSum(paid, (p) => p.planId ?? "avulso", (k) => (k === "avulso" ? "Cobrança avulsa" : plan.get(k)?.name ?? "Plano removido"), (p) => p.amount);
  sectionTitle("Por plano");
  table(
    [{ label: "Plano", w: 100 }, { label: "Pagamentos", w: 40, align: "right" }, { label: "Valor", w: 42, align: "right" }],
    byPlan.map((s) => [s.label, String(s.count), formatCurrencyDetailed(s.value)]),
  );

  sectionTitle("Pagamentos recebidos");
  table(
    [
      { label: "Data", w: 22 },
      { label: "Aluno", w: 62 },
      { label: "Referência", w: 40 },
      { label: "Forma", w: 22 },
      { label: "Valor", w: 36, align: "right" },
    ],
    [...paid]
      .sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""))
      .map((p) => [
        formatDateValue(dayOf(p.paidAt)),
        student.get(p.studentId)?.fullName ?? "Aluno removido",
        p.referenceLabel ?? (p.planId ? plan.get(p.planId)?.name ?? "" : ""),
        p.method ? PAYMENT_METHOD_LABEL[p.method] : "—",
        formatCurrencyDetailed(p.amount),
      ]),
  );

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Gerado pelo musclePro em ${new Date().toLocaleString("pt-BR")}`, margin, pageH - 8);
    doc.text(`${i}/${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }
  doc.save(`fechamento_${fileStamp(d.period)}.pdf`);
  return paid.length;
}
