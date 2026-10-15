"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Cake,
  CalendarDays,
  Check,
  CreditCard,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Siren,
  StickyNote,
  UserRound,
} from "lucide-react";
import { PaymentStatusBadge } from "./Badges";
import { useRevealList } from "./motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  BILLING_STATE_LABEL,
  PLAN_FREQUENCY_LABEL,
  ageFromBirthDate,
  daysFromToday,
  formatCurrency,
  formatCurrencyDetailed,
  formatDateLong,
  formatDateValue,
  formatDocument,
  formatRelative,
  planCadenceLabel,
  whatsappLink,
} from "@/lib/plataforma/format";
import type { Payment, Plan, Student, StudentActivity, StudentBilling, Task, Unit } from "@/lib/plataforma/types";

type Props = {
  student: Student;
  billing: StudentBilling;
  plan?: Plan;
  unit?: Unit;
  payments: Payment[];
  tasks: Task[];
  activities: StudentActivity[];
  onCompleteProfile: () => void;
  onAssignPlan: () => void;
  onRegisterPayment: (payment: Payment) => void;
  onToggleTask: (id: string) => void;
  canEdit: boolean;
  canCharge: boolean;
};

export function StudentResumoTab({
  student,
  billing,
  plan,
  unit,
  payments,
  tasks,
  activities,
  onCompleteProfile,
  onAssignPlan,
  onRegisterPayment,
  onToggleTask,
  canEdit,
  canCharge,
}: Props) {
  const age = ageFromBirthDate(student.birthDate);
  const recentPayments = payments.slice(0, 4);
  const openTasks = tasks.filter((t) => !t.done);
  const lastActivity = activities[0];
  const hasEmergency = Boolean(student.emergencyContactName && student.emergencyContactPhone);
  const statsRef = useRevealList<HTMLDivElement>([student.id]);

  const billingTone =
    student.status === "inativo"
      ? "text-ink-500"
      : billing.state === "inadimplente"
        ? "text-danger-700"
        : billing.state === "a_vencer"
          ? "text-warning-800"
          : "text-ink-900";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-4"
    >
      <div ref={statsRef} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Situação"
          value={student.status === "inativo" ? "Inativo" : BILLING_STATE_LABEL[billing.state]}
          valueClass={billingTone}
          hint={
            billing.state === "inadimplente"
              ? `${formatCurrency(billing.overdueAmount)} há ${billing.overdueDays} dia${billing.overdueDays === 1 ? "" : "s"}`
              : billing.state === "a_vencer" && billing.daysUntilDue !== undefined
                ? billing.daysUntilDue === 0
                  ? "Vence hoje"
                  : `Vence em ${billing.daysUntilDue} dia${billing.daysUntilDue === 1 ? "" : "s"}`
                : billing.state === "sem_plano"
                  ? "Nenhuma cobrança ativa"
                  : "Nada em atraso"
          }
        />
        <Stat
          label="Plano"
          value={plan ? plan.name : "Sem plano"}
          hint={plan ? `${formatCurrency(plan.amount)} ${planCadenceLabel(plan.frequency)}` : "Vincule para iniciar o ciclo"}
        />
        <Stat
          label="Próximo vencimento"
          value={billing.nextPayment ? formatDateValue(billing.nextPayment.dueAt) : "—"}
          hint={billing.nextPayment ? formatCurrency(billing.nextPayment.amount) : "Sem cobrança pendente"}
        />
        <Stat
          label="Última atividade"
          value={lastActivity ? formatRelative(lastActivity.at) : "—"}
          hint={lastActivity ? lastActivity.title : "Sem registros"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Card title="Contato" icon={<Phone className="h-3.5 w-3.5" strokeWidth={2.4} />}>
            <Row
              label="WhatsApp"
              value={student.whatsapp ?? "—"}
              action={
                student.whatsapp ? (
                  <a
                    href={whatsappLink(student.whatsapp, `Oi ${student.fullName.split(" ")[0]}, tudo bem?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center gap-1 rounded-btn bg-success-50 px-2 text-[11px] font-semibold text-success-700 ring-1 ring-inset ring-success-200 transition-colors hover:bg-success-100"
                  >
                    <MessageCircle className="h-3 w-3" strokeWidth={2.4} />
                    Abrir conversa
                  </a>
                ) : undefined
              }
            />
            <Row label="E-mail" value={student.email ?? "—"} icon={<Mail className="h-3.5 w-3.5" />} />
            <Row label="Unidade" value={unit?.name ?? "—"} icon={<MapPin className="h-3.5 w-3.5" />} />
          </Card>

          <Card title="Dados pessoais" icon={<UserRound className="h-3.5 w-3.5" strokeWidth={2.4} />}>
            <Row label="CPF" value={formatDocument(student.cpf)} />
            <Row
              label="Nascimento"
              value={
                student.birthDate ? `${formatDateValue(student.birthDate)}${age !== null ? ` · ${age} anos` : ""}` : "—"
              }
              icon={<Cake className="h-3.5 w-3.5" />}
            />
            <Row label="Aluno desde" value={formatDateLong(student.createdAt)} icon={<CalendarDays className="h-3.5 w-3.5" />} />
          </Card>

          <Card
            title="Condição médica"
            icon={<HeartPulse className="h-3.5 w-3.5" strokeWidth={2.4} />}
            tone={student.medicalNotes ? "warning" : undefined}
          >
            {student.medicalNotes ? (
              <p className="text-[13px] leading-[1.6] text-warning-800">{student.medicalNotes}</p>
            ) : (
              <p className="text-[12.5px] text-ink-500">Nenhuma condição registrada.</p>
            )}
          </Card>

          <Card
            title="Contato de emergência"
            icon={<Siren className="h-3.5 w-3.5" strokeWidth={2.4} />}
            tone={hasEmergency ? undefined : "danger"}
          >
            {hasEmergency ? (
              <>
                <Row label="Nome" value={student.emergencyContactName!} />
                <Row label="Telefone" value={student.emergencyContactPhone!} />
              </>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] leading-[1.5] text-danger-700">
                  Sem contato de emergência. Em um atendimento, é o dado que mais faz falta.
                </p>
                {canEdit && (
                <button
                  type="button"
                  onClick={onCompleteProfile}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-btn bg-danger-600 px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-danger-700"
                >
                  <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
                  Completar cadastro
                </button>
                )}
              </div>
            )}
          </Card>

          {student.notes && (
            <Card title="Observações" icon={<StickyNote className="h-3.5 w-3.5" strokeWidth={2.4} />}>
              <p className="text-[13px] leading-[1.6] text-ink-700">{student.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Cobranças recentes" icon={<CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />}>
            {recentPayments.length === 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] text-ink-500">Nenhuma cobrança ainda.</p>
                {student.status === "ativo" && canCharge && (
                  <button
                    type="button"
                    onClick={onAssignPlan}
                    className="inline-flex h-8 items-center gap-1 rounded-btn bg-brand px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    <CreditCard className="h-3 w-3" strokeWidth={2.4} />
                    Vincular plano
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentPayments.map((p) => {
                  const overdue = p.status === "pendente" && daysFromToday(p.dueAt) < 0;
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-ink-900">
                          {p.referenceLabel ?? (plan ? PLAN_FREQUENCY_LABEL[plan.frequency] : "Cobrança")}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {p.status === "pago" && p.paidAt ? `Pago em ${formatDateValue(p.paidAt.slice(0, 10))}` : `Vence ${formatDateValue(p.dueAt)}`}
                        </p>
                      </div>
                      <span className="text-[12.5px] font-semibold tabular-nums text-ink-900">
                        {formatCurrencyDetailed(p.amount)}
                      </span>
                      {p.status === "pendente" && student.status === "ativo" && canCharge ? (
                        <button
                          type="button"
                          onClick={() => onRegisterPayment(p)}
                          className={cn(
                            "inline-flex h-7 items-center rounded-btn px-2 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset transition-colors",
                            overdue
                              ? "bg-danger-50 text-danger-700 ring-danger-200 hover:bg-danger-100"
                              : "bg-warning-50 text-warning-800 ring-warning-200 hover:bg-warning-100",
                          )}
                        >
                          Receber
                        </button>
                      ) : (
                        <PaymentStatusBadge payment={p} overdue={overdue} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Tarefas abertas" icon={<Check className="h-3.5 w-3.5" strokeWidth={2.4} />}>
            {openTasks.length === 0 ? (
              <p className="text-[12.5px] text-ink-500">Nenhuma tarefa aberta para este aluno.</p>
            ) : (
              <ul className="space-y-1.5">
                {openTasks.map((t) => {
                  const overdue = t.dueAt ? new Date(t.dueAt).getTime() < Date.now() : false;
                  return (
                    <li key={t.id} className="flex items-start gap-2.5 rounded-btn border border-ink-100 p-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleTask(t.id)}
                        aria-label="Concluir tarefa"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-300 text-transparent transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-ink-900">{t.title}</p>
                        {t.dueAt && (
                          <p className={cn("text-[10.5px] font-semibold", overdue ? "text-danger-700" : "text-ink-500")}>
                            {overdue ? "Atrasada · " : ""}
                            {formatDateLong(t.dueAt)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/plataforma/tarefas"
              className="mt-3 inline-flex text-[11.5px] font-semibold text-ink-600 transition-colors hover:text-ink-900"
            >
              Ver todas as tarefas
            </Link>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className={cn("mt-2 truncate text-[18px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900", valueClass)}>
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-[11.5px] text-ink-500">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: "warning" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-card border bg-white p-4 md:p-5",
        tone === "warning" ? "border-warning-200 bg-warning-50/40" : tone === "danger" ? "border-danger-200 bg-danger-50/40" : "border-ink-200",
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        {icon && (
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full",
              tone === "warning"
                ? "bg-warning-100 text-warning-800"
                : tone === "danger"
                  ? "bg-danger-100 text-danger-700"
                  : "bg-ink-100 text-ink-700",
            )}
          >
            {icon}
          </span>
        )}
        <h2 className="text-[13px] font-bold tracking-[-0.005em] text-ink-900">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  icon,
  action,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-100 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="text-ink-400">{icon}</span>}
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-500">{label}</span>
        <span className="truncate text-[13px] font-medium text-ink-900">{value}</span>
      </div>
      {action}
    </div>
  );
}
