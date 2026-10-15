"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Pencil, Target, Wallet } from "lucide-react";
import { CurrencyInput, Field, ModalFooter, inputClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { AnimatedNumber, ProgressBar, prefersReducedMotion } from "./motion";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDateShort, todayValue } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";

// Caixa do mês: o que entrou, o que ainda entra e a distância até a meta.
export function ForecastCard({ canEditGoals }: { canEditGoals: boolean }) {
  const { forecast, settings, metrics, loading, payments, students } = usePlataformaStore();
  const [goalOpen, setGoalOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const goal = settings.revenueGoal ?? 0;
  // A barra usa a meta como 100%; sem meta, usa o projetado mais o atraso.
  const scale = Math.max(goal, forecast.projected + forecast.overdue, 1);
  const receivedPct = (forecast.received / scale) * 100;
  const duePct = (forecast.dueRest / scale) * 100;
  const overduePct = (forecast.overdue / scale) * 100;
  const goalPct = goal > 0 ? Math.min(100, (goal / scale) * 100) : null;
  const projectedOfGoal = goal > 0 ? Math.round((forecast.projected / goal) * 100) : null;
  const missing = goal > 0 ? Math.max(0, goal - forecast.projected) : 0;

  // Próximas entradas do mês, em ordem de vencimento.
  const upcoming = useMemo(() => {
    const today = todayValue();
    const monthPrefix = today.slice(0, 7);
    const byId = new Map(students.map((s) => [s.id, s]));
    return payments
      .filter((p) => p.status === "pendente" && p.dueAt >= today && p.dueAt.startsWith(monthPrefix))
      .filter((p) => byId.get(p.studentId)?.status === "ativo")
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((p) => ({ payment: p, student: byId.get(p.studentId)! }));
  }, [payments, students]);

  useGSAP(
    () => {
      const root = barRef.current;
      if (!root || loading || prefersReducedMotion()) return;
      gsap.from(root.querySelectorAll("[data-seg]"), {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { scope: barRef, dependencies: [loading, forecast.received, forecast.dueRest, forecast.overdue, goal], revertOnUpdate: true },
  );

  const verdict = loading
    ? "Calculando…"
    : goal === 0
      ? "Defina uma meta para acompanhar o mês."
      : missing === 0
        ? "Com o que está previsto, a meta do mês fecha."
        : forecast.projected + forecast.overdue >= goal
          ? `Faltam ${formatCurrency(missing)}. Cobrar os atrasados fecha a meta.`
          : `Faltam ${formatCurrency(missing)} além do previsto para bater a meta.`;

  return (
    <section className="flex flex-col rounded-card border border-ink-200 bg-white p-4 md:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Wallet className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-[-0.005em] text-ink-900">Caixa de {forecast.monthLabel.toLowerCase()}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-500">
              {forecast.daysLeft === 1 ? "Último dia do mês" : `${forecast.daysLeft} dias para fechar o mês`}
            </p>
          </div>
        </div>
        {canEditGoals && (
          <button
            type="button"
            onClick={() => setGoalOpen(true)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-btn border border-ink-200 px-2.5 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
          >
            {goal > 0 ? <Pencil className="h-3 w-3" strokeWidth={2.4} /> : <Target className="h-3 w-3" strokeWidth={2.4} />}
            {goal > 0 ? "Editar metas" : "Definir meta"}
          </button>
        )}
      </header>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Previsto no mês</p>
          <p className="mt-1 text-[28px] font-bold leading-none tracking-[-0.025em] text-ink-900 tabular-nums md:text-[32px]">
            <AnimatedNumber value={forecast.projected} format={formatCurrency} />
          </p>
        </div>
        {goal > 0 && (
          <div className="pb-0.5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Meta</p>
            <p className="mt-1 text-[15px] font-bold tabular-nums text-ink-700">
              {formatCurrency(goal)}
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ring-1 ring-inset",
                  (projectedOfGoal ?? 0) >= 100
                    ? "bg-success-50 text-success-700 ring-success-200"
                    : (projectedOfGoal ?? 0) >= 80
                      ? "bg-warning-50 text-warning-800 ring-warning-200"
                      : "bg-danger-50 text-danger-700 ring-danger-200",
                )}
              >
                {projectedOfGoal}%
              </span>
            </p>
          </div>
        )}
      </div>

      <div ref={barRef} className="relative mt-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-100">
          <div data-seg className="h-full bg-brand" style={{ width: `${receivedPct}%` }} />
          <div data-seg className="h-full bg-brand-light" style={{ width: `${duePct}%` }} />
          <div
            data-seg
            className="h-full bg-[repeating-linear-gradient(135deg,#FF7575_0_4px,#FFBABA_4px_8px)]"
            style={{ width: `${overduePct}%` }}
          />
        </div>
        {goalPct !== null && (
          <div className="pointer-events-none absolute -top-1 bottom-[-4px] w-px bg-ink-900" style={{ left: `${goalPct}%` }}>
            <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ink-900" />
          </div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Legend swatch="bg-brand" label="Já recebido" value={forecast.received} />
        <Legend swatch="bg-brand-light" label="A receber no mês" value={forecast.dueRest} />
        <Legend swatch="bg-danger-400" label="Em atraso" value={forecast.overdue} tone="danger" href="/plataforma/alunos?situacao=inadimplente" />
      </dl>

      <p className="mt-3 border-t border-ink-100 pt-3 text-[12px] leading-[1.5] text-ink-600">{verdict}</p>

      {upcoming.length > 0 && (
        <div className="mt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Próximas entradas</p>
          <ul className="mt-2 divide-y divide-ink-100 rounded-btn border border-ink-100">
            {upcoming.slice(0, 4).map(({ payment, student }) => (
              <li key={payment.id}>
                <Link
                  href={`/plataforma/alunos/${student.id}`}
                  className="flex items-center gap-3 px-3 py-2 text-[12.5px] transition-colors hover:bg-ink-50"
                >
                  <span className="w-[52px] shrink-0 text-[11.5px] font-semibold tabular-nums text-ink-500">
                    {formatDateShort(payment.dueAt).replace(".", "")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{student.fullName}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink-900">{formatCurrency(payment.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {upcoming.length > 4 && (
            <p className="mt-1.5 text-[11.5px] text-ink-500">
              e mais {upcoming.length - 4} até o fim do mês
            </p>
          )}
        </div>
      )}

      {settings.activeStudentsGoal ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[11.5px]">
            <span className="font-semibold text-ink-700">Alunos ativos</span>
            <span className="tabular-nums text-ink-500">
              <span className="font-bold text-ink-900">{metrics.activeStudents}</span> de {settings.activeStudentsGoal}
            </span>
          </div>
          <ProgressBar
            className="mt-1.5"
            percent={(metrics.activeStudents / settings.activeStudentsGoal) * 100}
            tone={metrics.activeStudents >= settings.activeStudentsGoal ? "success" : "brand"}
          />
        </div>
      ) : null}

      <GoalModal open={goalOpen} onClose={() => setGoalOpen(false)} />
    </section>
  );
}

function Legend({
  swatch,
  label,
  value,
  tone,
  href,
}: {
  swatch: string;
  label: string;
  value: number;
  tone?: "danger";
  href?: string;
}) {
  const content = (
    <>
      <dt className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">
        <span className={cn("h-2 w-2 rounded-full", swatch)} />
        {label}
      </dt>
      <dd className={cn("mt-1 text-[15px] font-bold tabular-nums", tone === "danger" && value > 0 ? "text-danger-700" : "text-ink-900")}>
        {formatCurrency(value)}
      </dd>
    </>
  );
  if (href && value > 0) {
    return (
      <Link href={href} className="group rounded-btn border border-ink-100 px-3 py-2 transition-colors hover:border-ink-300">
        {content}
        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-danger-700">
          Cobrar agora
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
        </span>
      </Link>
    );
  }
  return <div className="rounded-btn border border-ink-100 px-3 py-2">{content}</div>;
}

function GoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, metrics } = usePlataformaStore();
  const { push } = useToast();
  const [revenue, setRevenue] = useState<number | "">("");
  const [studentsGoal, setStudentsGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRevenue(settings.revenueGoal ?? "");
    setStudentsGoal(settings.activeStudentsGoal ? String(settings.activeStudentsGoal) : "");
  }, [open, settings.revenueGoal, settings.activeStudentsGoal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await updateSettings({
      revenueGoal: revenue === "" ? 0 : revenue,
      activeStudentsGoal: studentsGoal ? Number(studentsGoal) : 0,
    });
    setSubmitting(false);
    if (ok) {
      push({ tone: "success", title: "Metas salvas", description: "O painel já mostra a distância até elas." });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Metas do mês"
      description="Valem para todos os meses até você mudar. Deixe em branco para não acompanhar."
      footer={<ModalFooter onCancel={onClose} formId="goal-form" submitting={submitting} submitLabel="Salvar metas" />}
    >
      <form id="goal-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Meta de faturamento" hint={`Receita recorrente hoje: ${formatCurrency(metrics.monthlyRecurring)} por mês.`}>
          <CurrencyInput value={revenue} onChange={setRevenue} />
        </Field>
        <Field label="Meta de alunos ativos" hint={`Hoje: ${metrics.activeStudents} ativos.`}>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={studentsGoal}
            onChange={(e) => setStudentsGoal(e.target.value.replace(/\D/g, ""))}
            placeholder="Ex.: 120"
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
      </form>
    </Modal>
  );
}
