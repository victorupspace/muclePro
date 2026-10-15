"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Cake,
  Check,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  ListTodo,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  RefreshCcw,
  Smartphone,
  StickyNote,
} from "lucide-react";
import { BillingBadge, RiskBadge, StudentStatusBadge } from "./Badges";
import { ChurnReasonModal } from "./ChurnReasonModal";
import { StudentAppDialog, studentAppState } from "./StudentAppDialog";
import { cn } from "@/lib/cn";
import {
  CHURN_REASON_LABEL,
  STUDENT_STATUS_LABEL,
  ageFromBirthDate,
  formatCurrency,
  formatDocument,
  isBirthdayToday,
  planCadenceLabel,
} from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Plan, Student, StudentBilling, StudentStatus, Unit } from "@/lib/plataforma/types";

type Props = {
  student: Student;
  billing: StudentBilling;
  plan?: Plan;
  unit?: Unit;
  onEdit: () => void;
  onAddTask: () => void;
  onAddNote: () => void;
  onRegisterPayment: () => void;
  onCharge: () => void;
  onAssignPlan: () => void;
};

const STATUS_TONE: Record<StudentStatus, { dot: string; text: string }> = {
  ativo: { dot: "bg-success-500", text: "text-success-700" },
  inativo: { dot: "bg-ink-400", text: "text-ink-500" },
};

export function StudentHeader({
  student,
  billing,
  plan,
  unit,
  onEdit,
  onAddTask,
  onAddNote,
  onRegisterPayment,
  onCharge,
  onAssignPlan,
}: Props) {
  const { updateStudent, riskFor } = usePlataformaStore();
  const risk = riskFor(student.id);
  const [churnOpen, setChurnOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const { profile } = useAccountSession();
  const canEdit = Boolean(profile?.permissions.canRegisterStudents);
  const canCharge_ = Boolean(profile?.permissions.canSendPaymentLinks);
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [saving, setSaving] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(student.status);
  }, [student.id, student.status]);

  useEffect(() => {
    if (!statusOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!statusRef.current?.contains(e.target as Node)) setStatusOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStatusOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [statusOpen]);

  async function changeStatus(next: StudentStatus) {
    // Inativar pede o motivo da saída antes de gravar.
    if (next === "inativo") {
      setChurnOpen(true);
      return;
    }
    setStatus(next);
    setSaving(true);
    await updateStudent(student.id, { status: next });
    setSaving(false);
  }

  const age = ageFromBirthDate(student.birthDate);
  const birthday = isBirthdayToday(student.birthDate);
  const statusTone = STATUS_TONE[status];
  const canCharge =
    canCharge_ && student.status === "ativo" && (billing.state === "inadimplente" || billing.state === "a_vencer");
  const canRegister = canCharge_ && student.status === "ativo" && Boolean(billing.nextPayment);

  const secondaryActions = [
    ...(canEdit ? [{ label: "Editar", onClick: onEdit, icon: <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} /> }] : []),
    { label: "Tarefa", onClick: onAddTask, icon: <ListTodo className="h-3.5 w-3.5" strokeWidth={2.2} /> },
    { label: "Nota", onClick: onAddNote, icon: <StickyNote className="h-3.5 w-3.5" strokeWidth={2.2} /> },
    ...(canEdit || profile?.permissions.canCreateWorkouts
      ? [
          {
            label: "App",
            onClick: () => setAppOpen(true),
            icon: (
              <span className="relative inline-flex">
                <Smartphone className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-white",
                    studentAppState(student) === "conectado"
                      ? "bg-success-500"
                      : studentAppState(student) === "convite_enviado"
                        ? "bg-warning-500"
                        : "bg-ink-300",
                  )}
                />
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="sticky top-14 z-20 -mx-3.5 -mt-5 mb-1 border-b border-ink-200 bg-white/85 px-3.5 py-4 backdrop-blur-sm sm:top-[76px] md:-mx-8 md:-mt-8 md:px-8 md:py-5">
        <Link
          href="/plataforma/alunos"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          Voltar para alunos
        </Link>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StudentStatusBadge status={student.status} />
              {student.status === "ativo" && (
                <BillingBadge
                  state={billing.state}
                  detail={
                    billing.state === "inadimplente"
                      ? `há ${billing.overdueDays} dia${billing.overdueDays === 1 ? "" : "s"}`
                      : billing.state === "a_vencer" && billing.daysUntilDue !== undefined
                        ? billing.daysUntilDue === 0
                          ? "vence hoje"
                          : `em ${billing.daysUntilDue} dia${billing.daysUntilDue === 1 ? "" : "s"}`
                        : undefined
                  }
                />
              )}
              {student.status === "ativo" && risk.level !== "baixo" && (
                <RiskBadge level={risk.level} title={risk.reasons.join(" · ")} />
              )}
              {student.status === "inativo" && student.churnReason && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-600 ring-1 ring-inset ring-ink-200">
                  Saiu por: <span className="normal-case tracking-normal">{CHURN_REASON_LABEL[student.churnReason]}</span>
                </span>
              )}
              {unit && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-700 ring-1 ring-inset ring-ink-200">
                  <MapPin className="h-3 w-3" strokeWidth={2.4} />
                  {unit.name}
                </span>
              )}
              {birthday && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/8 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-brand ring-1 ring-inset ring-brand/25">
                  <Cake className="h-3 w-3" strokeWidth={2.4} />
                  Aniversário hoje
                </span>
              )}
            </div>
            <h1 className="mt-2 truncate text-[20px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[26px]">
              {student.fullName}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-500">
              {student.cpf && (
                <>
                  <span className="font-mono text-[11.5px] tracking-tight">{formatDocument(student.cpf)}</span>
                  <span className="text-ink-300">·</span>
                </>
              )}
              {age !== null && (
                <>
                  <span>{age} anos</span>
                  <span className="text-ink-300">·</span>
                </>
              )}
              {student.whatsapp && (
                <>
                  <span>{student.whatsapp}</span>
                  {student.email && <span className="text-ink-300">·</span>}
                </>
              )}
              {student.email && <span className="truncate">{student.email}</span>}
              {!student.whatsapp && !student.email && <span className="text-ink-400">Sem contato cadastrado</span>}
            </p>

            <div className="mt-3 flex flex-wrap items-stretch gap-2">
              <InlineField icon={<CreditCard className="h-3 w-3" strokeWidth={2.4} />} label="Plano">
                <span className="inline-flex h-7 items-center gap-2 px-2 text-[12.5px] font-semibold text-ink-900">
                  {plan ? (
                    <>
                      {plan.name}
                      <span className="font-medium text-ink-500">
                        {formatCurrency(plan.amount)} {planCadenceLabel(plan.frequency)}
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-500">Sem plano</span>
                  )}
                </span>
                {canCharge_ && (
                  <button
                    type="button"
                    onClick={onAssignPlan}
                    className="inline-flex h-7 items-center gap-1 rounded-[5px] px-2 text-[11.5px] font-semibold text-brand transition-colors hover:bg-brand/10"
                  >
                    <RefreshCcw className="h-3 w-3" strokeWidth={2.4} />
                    {plan ? "Trocar" : "Vincular"}
                  </button>
                )}
              </InlineField>

              <div ref={statusRef} className="relative">
                <InlineField icon={<span className={cn("h-2 w-2 rounded-full", statusTone.dot)} />} label="Status">
                  <button
                    type="button"
                    onClick={() => canEdit && setStatusOpen((v) => !v)}
                    disabled={!canEdit}
                    aria-haspopup="listbox"
                    aria-expanded={statusOpen}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-left text-[12.5px] font-semibold transition-colors",
                      statusOpen ? "bg-ink-100" : "hover:bg-ink-100",
                      statusTone.text,
                    )}
                  >
                    <span>{STUDENT_STATUS_LABEL[status]}</span>
                    <ChevronDown
                      className={cn("h-3 w-3 text-ink-400 transition-transform", statusOpen && "rotate-180 text-ink-700")}
                      strokeWidth={2.4}
                    />
                  </button>
                </InlineField>

                {statusOpen && (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[200px] overflow-hidden rounded-card border border-ink-200 bg-white py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]">
                    {(Object.keys(STUDENT_STATUS_LABEL) as StudentStatus[]).map((value) => {
                      const tone = STATUS_TONE[value];
                      const active = value === status;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setStatusOpen(false);
                            if (value !== status) void changeStatus(value);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors",
                            active ? "bg-ink-50" : "hover:bg-ink-50",
                          )}
                        >
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
                          <span className={cn("flex-1 font-semibold", tone.text)}>{STUDENT_STATUS_LABEL[value]}</span>
                          {active && <Check className="h-3.5 w-3.5 text-ink-700" strokeWidth={2.6} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {saving && (
                <span className="inline-flex h-9 items-center gap-1.5 rounded-card border border-dashed border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                  Salvando
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:mt-[26px] lg:flex-nowrap lg:justify-end">
            {canRegister && (
              <button
                type="button"
                onClick={onRegisterPayment}
                className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3.5 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover"
              >
                <CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />
                Registrar pagamento
              </button>
            )}
            {canCharge && (
              <button
                type="button"
                onClick={onCharge}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-btn border px-3.5 text-[12.5px] font-semibold transition-colors",
                  billing.state === "inadimplente"
                    ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
                {billing.state === "inadimplente" ? "Cobrar no WhatsApp" : "Lembrar no WhatsApp"}
              </button>
            )}

            <div className="inline-flex h-9 items-center rounded-btn border border-ink-200 bg-white p-0.5">
              {secondaryActions.map((a, i) => (
                <span key={a.label} className="flex items-center">
                  {i > 0 && <span className="h-4 w-px bg-ink-200" />}
                  <button
                    type="button"
                    onClick={a.onClick}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
                  >
                    {a.icon}
                    {a.label}
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ChurnReasonModal open={churnOpen} onClose={() => setChurnOpen(false)} student={student} />
      <StudentAppDialog open={appOpen} onClose={() => setAppOpen(false)} student={student} />
    </>
  );
}

function InlineField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex h-9 items-center gap-1.5 rounded-card border border-ink-200 bg-white pl-2.5 pr-1 transition-colors hover:border-ink-300">
      <span className="inline-flex h-4 w-4 items-center justify-center text-ink-400">{icon}</span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</span>
      <span className="h-4 w-px bg-ink-200" />
      {children}
    </div>
  );
}
