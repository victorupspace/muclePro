"use client";

import { useMemo, useState } from "react";
import {
  AlertOctagon,
  BarChart3,
  CalendarRange,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Percent,
  ShieldAlert,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SelectFilter } from "@/components/admin/Filters";
import { KpiCard } from "@/components/plataforma/KpiCard";
import { Tabs } from "@/components/plataforma/Tabs";
import { useToast } from "@/components/plataforma/Toast";
import { AnimatedNumber, PageIntro } from "@/components/plataforma/motion";
import { BarList, FlowBars, FunnelSteps, MonthBars, ReportCard } from "@/components/plataforma/reports/Charts";
import { monthlyRecurring } from "@/lib/plataforma/billing";
import { PAYMENT_METHOD_LABEL, formatCurrency, formatNumber, toDateValue } from "@/lib/plataforma/format";
import {
  PERIOD_OPTIONS,
  activeAt,
  averageTenureMonths,
  churnReasons,
  downloadClosingPdf,
  exportLeadsCsv,
  exportOpenChargesCsv,
  exportPaymentsCsv,
  exportStudentsCsv,
  funnelReport,
  groupSum,
  inPeriod,
  lastMonths,
  paidPayments,
  resolvePeriod,
  revenueByMonth,
  studentFlowByMonth,
  type PeriodKey,
  type ReportData,
} from "@/lib/plataforma/reports";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";

type Tab = "financeiro" | "alunos" | "matriculas" | "exportar";

const dayOf = (iso?: string) => (iso ? toDateValue(new Date(iso)) : "");

export default function RelatoriosPage() {
  const { profile } = useAccountSession();
  if (profile && !profile.permissions.canViewReports) {
    return (
      <div className="space-y-6">
        <PageIntro eyebrow="Relatórios" title="Acesso restrito" description="Relatórios ficam com a gestão e a contabilidade." />
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" strokeWidth={2.2} />}
          title="Você não tem acesso a esta página"
          description="Peça ao responsável pela academia se precisar desses números."
        />
      </div>
    );
  }
  return <Reports />;
}

function Reports() {
  const { profile } = useAccountSession();
  const { payments, students, plans, units, leads, staff, metrics } = usePlataformaStore();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>(profile?.staffRole === "contabilidade" ? "exportar" : "financeiro");
  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const [unit, setUnit] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);

  // Recorte por unidade: alunos da unidade, cobranças desses alunos e leads da unidade.
  const scoped = useMemo(() => {
    if (unit === "all") return { students, payments, leads };
    const s = students.filter((x) => x.unitId === unit);
    const ids = new Set(s.map((x) => x.id));
    return { students: s, payments: payments.filter((p) => ids.has(p.studentId)), leads: leads.filter((l) => l.unitId === unit) };
  }, [unit, students, payments, leads]);

  const months = useMemo(() => lastMonths(12), []);
  const highlight = (key: string) => key >= period.start.slice(0, 7) && key <= period.end.slice(0, 7);

  // ───────── financeiro
  const fin = useMemo(() => {
    const paid = paidPayments(scoped.payments).filter((p) => inPeriod(dayOf(p.paidAt), period));
    const total = paid.reduce((s, p) => s + p.amount, 0);
    const today = toDateValue(new Date());
    const activeIds = new Set(scoped.students.filter((s) => s.status === "ativo").map((s) => s.id));
    const overdue = scoped.payments.filter((p) => p.status === "pendente" && p.dueAt < today && activeIds.has(p.studentId));
    const studentUnit = new Map(students.map((s) => [s.id, s.unitId]));
    const planName = new Map(plans.map((p) => [p.id, p.name]));
    const unitName = new Map(units.map((u) => [u.id, u.name]));
    return {
      total,
      count: paid.length,
      ticket: paid.length ? total / paid.length : 0,
      overdueAmount: overdue.reduce((s, p) => s + p.amount, 0),
      overdueStudents: new Set(overdue.map((p) => p.studentId)).size,
      recurring: unit === "all" ? metrics.monthlyRecurring : monthlyRecurring(scoped.students, plans),
      byMonth: revenueByMonth(scoped.payments, months).map((m) => ({ ...m, highlight: highlight(m.key) })),
      byMethod: groupSum(paid, (p) => p.method ?? "outro", (k) => PAYMENT_METHOD_LABEL[k as keyof typeof PAYMENT_METHOD_LABEL] ?? "Outro", (p) => p.amount),
      byPlan: groupSum(paid, (p) => p.planId ?? "avulso", (k) => (k === "avulso" ? "Cobrança avulsa" : planName.get(k) ?? "Plano removido"), (p) => p.amount),
      byUnit: groupSum(paid, (p) => studentUnit.get(p.studentId) ?? "sem", (k) => unitName.get(k) ?? "Sem unidade", (p) => p.amount),
    };
  }, [scoped, period, months, students, plans, units, unit, metrics.monthlyRecurring]);

  // ───────── alunos
  const stu = useMemo(() => {
    const dayBefore = toDateValue(new Date(new Date(`${period.start}T12:00:00`).getTime() - 86_400_000));
    const startActive = activeAt(scoped.students, dayBefore);
    const joined = scoped.students.filter((s) => inPeriod(dayOf(s.createdAt), period)).length;
    const left = scoped.students.filter((s) => s.status === "inativo" && s.churnedAt && inPeriod(dayOf(s.churnedAt), period)).length;
    const active = scoped.students.filter((s) => s.status === "ativo");
    const planName = new Map(plans.map((p) => [p.id, p.name]));
    return {
      active: active.length,
      joined,
      left,
      churnRate: startActive > 0 ? (left / startActive) * 100 : null,
      startActive,
      tenure: averageTenureMonths(scoped.students),
      flow: studentFlowByMonth(scoped.students, months).map((m) => ({ ...m, highlight: highlight(m.key) })),
      reasons: churnReasons(scoped.students, period),
      byPlan: groupSum(active, (s) => s.planId ?? "sem", (k) => (k === "sem" ? "Sem plano" : planName.get(k) ?? "Plano removido")),
    };
  }, [scoped, period, months, plans]);

  // ───────── matrículas
  const fun = useMemo(() => {
    const r = funnelReport(scoped.leads, period);
    const staffName = new Map(staff.map((s) => [s.id, s.fullName]));
    return {
      ...r,
      byOwner: groupSum(r.convertedLeads, (l) => l.ownerStaffId ?? "dono", (k) => (k === "dono" ? "Responsável da conta" : staffName.get(k) ?? "Ex-funcionário")),
    };
  }, [scoped, period, staff]);

  const data: ReportData = {
    companyName: profile?.companyName ?? "Academia",
    period,
    payments: scoped.payments,
    students: scoped.students,
    plans,
    units,
    leads: scoped.leads,
  };

  async function run(id: string, fn: () => number | Promise<number>, what: string) {
    setBusy(id);
    try {
      const n = await fn();
      push(
        n > 0
          ? { tone: "success", title: "Arquivo gerado", description: `${formatNumber(n)} ${what} no arquivo.` }
          : { tone: "info", title: "Nada no período", description: `O arquivo foi gerado vazio: nenhum ${what.replace(/s$/, "")} encontrado.` },
      );
    } catch {
      push({ tone: "warn", title: "Não foi possível gerar o arquivo", description: "Tente de novo em instantes." });
    }
    setBusy(null);
  }

  const periodWord = period.label;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Relatórios"
        title="Números da academia"
        description="Receita, alunos e matrículas no período, com exportação para planilha e fechamento em PDF para a contabilidade."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter label="Período" value={periodKey} onChange={(v) => setPeriodKey(v as PeriodKey)} options={PERIOD_OPTIONS} />
          {units.length > 1 && !profile?.unitScopeId && (
            <SelectFilter
              label="Unidade"
              value={unit}
              onChange={setUnit}
              options={[{ value: "all", label: "Todas as unidades" }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
            />
          )}
        </div>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
          <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.2} />
          {new Date(`${period.start}T12:00:00`).toLocaleDateString("pt-BR")} a {new Date(`${period.end}T12:00:00`).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <Tabs
        tabs={[
          { value: "financeiro" as Tab, label: "Financeiro", icon: <Wallet className="h-3.5 w-3.5" strokeWidth={2.2} /> },
          { value: "alunos" as Tab, label: "Alunos", icon: <Users className="h-3.5 w-3.5" strokeWidth={2.2} /> },
          { value: "matriculas" as Tab, label: "Matrículas", icon: <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.2} /> },
          { value: "exportar" as Tab, label: "Exportar", icon: <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "financeiro" && (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Recebido" value={<AnimatedNumber value={fin.total} format={formatCurrency} />} hint={`Em ${periodWord}`} highlight icon={<Wallet className="h-3.5 w-3.5" strokeWidth={2.4} />} />
            <KpiCard
              label="Pagamentos"
              value={<AnimatedNumber value={fin.count} />}
              hint={fin.count ? `Ticket médio ${formatCurrency(fin.ticket)}` : "Nenhum no período"}
              icon={<CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />}
            />
            <KpiCard
              label="Em atraso hoje"
              value={<AnimatedNumber value={fin.overdueAmount} format={formatCurrency} />}
              hint={`${fin.overdueStudents} aluno${fin.overdueStudents === 1 ? "" : "s"}`}
              tone={fin.overdueAmount > 0 ? "danger" : undefined}
              icon={<AlertOctagon className="h-3.5 w-3.5" strokeWidth={2.4} />}
              href="/plataforma/alunos?situacao=inadimplente"
            />
            <KpiCard
              label="Receita recorrente"
              value={<AnimatedNumber value={fin.recurring} format={formatCurrency} />}
              hint="Por mês, com os planos ativos"
              icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />}
            />
          </section>
          <ReportCard title="Recebido por mês" hint="Últimos 12 meses. Em destaque, os meses do período escolhido.">
            <MonthBars data={fin.byMonth} format={formatCurrency} />
          </ReportCard>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <ReportCard title="Por forma de pagamento" hint={`Recebido em ${periodWord}`}>
              <BarList rows={fin.byMethod} format={formatCurrency} empty="Nenhum pagamento no período." />
            </ReportCard>
            <ReportCard title="Por plano" hint={`Recebido em ${periodWord}`}>
              <BarList rows={fin.byPlan} format={formatCurrency} empty="Nenhum pagamento no período." />
            </ReportCard>
            {units.length > 1 && unit === "all" && (
              <ReportCard title="Por unidade" hint={`Recebido em ${periodWord}`}>
                <BarList rows={fin.byUnit} format={formatCurrency} empty="Nenhum pagamento no período." />
              </ReportCard>
            )}
          </div>
        </div>
      )}

      {tab === "alunos" && (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Ativos hoje" value={<AnimatedNumber value={stu.active} />} hint={`${stu.startActive} no início do período`} icon={<Users className="h-3.5 w-3.5" strokeWidth={2.4} />} />
            <KpiCard label="Entradas" value={<AnimatedNumber value={stu.joined} />} hint={`Cadastros em ${periodWord}`} highlight icon={<UserPlus className="h-3.5 w-3.5" strokeWidth={2.4} />} />
            <KpiCard
              label="Saídas"
              value={<AnimatedNumber value={stu.left} />}
              hint={stu.churnRate === null ? "Sem base no início do período" : `Evasão de ${stu.churnRate.toFixed(1).replace(".", ",")}%`}
              tone={stu.left > 0 ? "danger" : undefined}
              icon={<UserMinus className="h-3.5 w-3.5" strokeWidth={2.4} />}
            />
            <KpiCard
              label="Permanência média"
              value={`${stu.tenure.toFixed(1).replace(".", ",")} meses`}
              hint="Do início do plano até a saída ou hoje"
              icon={<Clock className="h-3.5 w-3.5" strokeWidth={2.4} />}
            />
          </section>
          <ReportCard title="Entradas e saídas por mês" hint="Últimos 12 meses.">
            <FlowBars data={stu.flow} />
          </ReportCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title="Por que saíram" hint={`Saídas em ${periodWord}`}>
              <BarList rows={stu.reasons} format={(v) => String(v)} empty="Nenhuma saída no período." tone="danger" />
            </ReportCard>
            <ReportCard title="Alunos ativos por plano" hint="Hoje">
              <BarList rows={stu.byPlan} format={(v) => String(v)} empty="Nenhum aluno ativo." />
            </ReportCard>
          </div>
        </div>
      )}

      {tab === "matriculas" && (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Novos interessados" value={<AnimatedNumber value={fun.created} />} hint={`Entraram em ${periodWord}`} icon={<UserPlus className="h-3.5 w-3.5" strokeWidth={2.4} />} />
            <KpiCard label="Matrículas" value={<AnimatedNumber value={fun.converted} />} hint="Vindas do funil no período" highlight icon={<GraduationCap className="h-3.5 w-3.5" strokeWidth={2.4} />} />
            <KpiCard
              label="Conversão"
              value={fun.conversion === null ? "—" : `${fun.conversion}%`}
              hint="Dos interessados do período, quantos já são alunos"
              icon={<Percent className="h-3.5 w-3.5" strokeWidth={2.4} />}
            />
            <KpiCard
              label="Tempo até matricular"
              value={fun.avgDaysToConvert === null ? "—" : `${Math.round(fun.avgDaysToConvert)} dia${Math.round(fun.avgDaysToConvert) === 1 ? "" : "s"}`}
              hint="Média do primeiro contato à matrícula"
              icon={<Clock className="h-3.5 w-3.5" strokeWidth={2.4} />}
            />
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard title="Funil do período" hint="Interessados que entraram no período e até onde chegaram.">
              {fun.created === 0 ? (
                <p className="py-6 text-center text-[12px] text-ink-500">Nenhum interessado entrou no período.</p>
              ) : (
                <FunnelSteps steps={fun.reached} />
              )}
            </ReportCard>
            <ReportCard title="De onde vêm" hint="Interessados por origem e quantos viraram alunos.">
              <BarList
                rows={fun.bySource.map((s) => ({ ...s, detail: `${s.converted} matrícula${s.converted === 1 ? "" : "s"}` }))}
                format={(v) => String(v)}
                empty="Nenhum interessado no período."
              />
            </ReportCard>
            <ReportCard title="Por que não fecharam" hint={`Perdidos em ${periodWord}`}>
              <BarList rows={fun.lostReasons} format={(v) => String(v)} empty="Nenhuma perda no período." tone="ink" />
            </ReportCard>
            <ReportCard title="Matrículas por responsável" hint={`Em ${periodWord}`}>
              <BarList rows={fun.byOwner} format={(v) => String(v)} empty="Nenhuma matrícula pelo funil no período." />
            </ReportCard>
          </div>
        </div>
      )}

      {tab === "exportar" && (
        <div className="grid gap-3 md:grid-cols-2">
          <ExportCard
            icon={<FileText className="h-4 w-4" strokeWidth={2.2} />}
            title="Fechamento do período (PDF)"
            description={`Total recebido, por forma de pagamento, por plano e a lista de pagamentos de ${periodWord}. Pronto para mandar ao contador.`}
            label="Baixar PDF"
            busy={busy === "pdf"}
            primary
            onClick={() => void run("pdf", () => downloadClosingPdf(data), "pagamentos")}
          />
          <ExportCard
            icon={<FileSpreadsheet className="h-4 w-4" strokeWidth={2.2} />}
            title="Recebimentos (CSV)"
            description={`Cada pagamento recebido em ${periodWord}: data, aluno, CPF, plano, unidade, forma e valor.`}
            label="Baixar planilha"
            busy={busy === "pay"}
            onClick={() => void run("pay", () => exportPaymentsCsv(data), "pagamentos")}
          />
          <ExportCard
            icon={<AlertOctagon className="h-4 w-4" strokeWidth={2.2} />}
            title="Cobranças em aberto (CSV)"
            description="Tudo o que está pendente hoje, em atraso ou a vencer, com WhatsApp do aluno."
            label="Baixar planilha"
            busy={busy === "open"}
            onClick={() => void run("open", () => exportOpenChargesCsv(data), "cobranças")}
          />
          <ExportCard
            icon={<Users className="h-4 w-4" strokeWidth={2.2} />}
            title="Alunos (CSV)"
            description="Cadastro completo: contato, situação, plano, unidade, datas de entrada e saída."
            label="Baixar planilha"
            busy={busy === "students"}
            onClick={() => void run("students", () => exportStudentsCsv(data), "alunos")}
          />
          <ExportCard
            icon={<BarChart3 className="h-4 w-4" strokeWidth={2.2} />}
            title="Interessados do funil (CSV)"
            description={`Quem entrou no funil em ${periodWord}, origem, etapa e motivo de perda.`}
            label="Baixar planilha"
            busy={busy === "leads"}
            onClick={() => void run("leads", () => exportLeadsCsv(data), "interessados")}
          />
        </div>
      )}
    </div>
  );
}

function ExportCard({
  icon,
  title,
  description,
  label,
  busy,
  primary,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  label: string;
  busy: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <section className="flex flex-col justify-between gap-4 rounded-card border border-ink-200 bg-white p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">{icon}</span>
        <div>
          <h2 className="text-[13.5px] font-bold text-ink-900">{title}</h2>
          <p className="mt-1 text-[12px] leading-[1.55] text-ink-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={
          primary
            ? "inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 sm:self-start"
            : "inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-4 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 disabled:opacity-60 sm:self-start"
        }
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
        {busy ? "Gerando..." : label}
      </button>
    </section>
  );
}
