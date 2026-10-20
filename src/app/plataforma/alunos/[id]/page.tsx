"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, CreditCard, Dumbbell, HeartPulse, LayoutDashboard, ShieldAlert } from "lucide-react";
import { AddNoteModal } from "@/components/plataforma/AddNoteModal";
import { AddTaskModal } from "@/components/plataforma/AddTaskModal";
import { AddChargeModal, AssignPlanModal, RegisterPaymentModal } from "@/components/plataforma/PaymentModals";
import { StudentAtividadesTab } from "@/components/plataforma/StudentAtividadesTab";
import { StudentFormModal } from "@/components/plataforma/StudentFormModal";
import { StudentHeader } from "@/components/plataforma/StudentHeader";
import { StudentPagamentosTab } from "@/components/plataforma/StudentPagamentosTab";
import { StudentResumoTab } from "@/components/plataforma/StudentResumoTab";
import { StudentHealthTab } from "@/components/plataforma/health/StudentHealthTab";
import { StudentWorkoutsTab } from "@/components/plataforma/workouts/StudentWorkoutsTab";
import { Tabs } from "@/components/plataforma/Tabs";
import { useToast } from "@/components/plataforma/Toast";
import { firstName, formatCurrencyDetailed, formatDateValue, whatsappLink } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Payment } from "@/lib/plataforma/types";

type TabValue = "resumo" | "saude" | "treinos" | "pagamentos" | "atividades";

export default function AlunoFichaPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAccountSession();
  const {
    students,
    tasks,
    loading,
    billingFor,
    planById,
    unitById,
    paymentsFor,
    activitiesFor,
    removeStudentActivity,
    cancelPayment,
    logCharge,
    toggleTask,
    workoutsFor,
  } = usePlataformaStore();
  const { push } = useToast();

  const studentId = params?.id ?? "";
  const student = students.find((s) => s.id === studentId) ?? null;

  const [tab, setTab] = useState<TabValue>("resumo");
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Payment | null>(null);

  const billing = billingFor(studentId);
  const payments = useMemo(() => paymentsFor(studentId), [paymentsFor, studentId]);
  const activities = useMemo(() => activitiesFor(studentId), [activitiesFor, studentId]);
  const studentTasks = useMemo(() => tasks.filter((t) => t.studentId === studentId), [tasks, studentId]);

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center py-16 text-[13px] text-ink-500">Carregando ficha do aluno…</div>
    );
  }

  if (!student) {
    return (
      <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-ink-400" strokeWidth={2.2} />
        <h1 className="mt-3 text-[18px] font-bold text-ink-900">Aluno não encontrado</h1>
        <p className="mt-1.5 text-[13px] text-ink-500">Esse aluno não está na sua base ou foi excluído.</p>
        <Link
          href="/plataforma/alunos"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-btn bg-ink-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800"
        >
          Voltar para alunos
        </Link>
      </div>
    );
  }

  const plan = planById(student.planId);
  const unit = unitById(student.unitId);
  const pendingCount = payments.filter((p) => p.status === "pendente").length;

  async function sendCharge() {
    if (!student) return;
    if (!student.whatsapp) {
      push({ tone: "warn", title: "Aluno sem WhatsApp", description: "Cadastre o número para cobrar por aqui." });
      setEditOpen(true);
      return;
    }
    const company = profile?.companyName ?? "nossa equipe";
    const overdue = billing.state === "inadimplente";
    const payment = overdue ? billing.overduePayment : billing.nextPayment;
    const text = overdue
      ? `Oi ${firstName(student.fullName)}, tudo bem? Aqui é da ${company}. ${
          payment ? `Sua mensalidade de ${formatCurrencyDetailed(payment.amount)} venceu em ${formatDateValue(payment.dueAt)}.` : "Há uma cobrança em aberto no seu plano."
        } Me responde por aqui que te passo o link de pagamento!`
      : `Oi ${firstName(student.fullName)}! Lembrete: ${
          payment ? `sua mensalidade de ${formatCurrencyDetailed(payment.amount)} vence em ${formatDateValue(payment.dueAt)}.` : "seu plano vence em breve."
        } Qualquer coisa é só chamar. Bom treino!`;
    window.open(whatsappLink(student.whatsapp, text), "_blank", "noopener,noreferrer");
    await logCharge(student.id, overdue ? "whatsapp" : "lembrete", payment);
    push({ tone: "success", title: overdue ? "Cobrança registrada no histórico" : "Lembrete registrado no histórico" });
  }

  const tabs: { value: TabValue; label: string; count?: number; icon: React.ReactNode }[] = [
    { value: "resumo", label: "Resumo", icon: <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={2.2} /> },
    {
      value: "saude",
      label: "Saúde e medidas",
      icon: <HeartPulse className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      value: "treinos",
      label: "Treinos",
      count: workoutsFor(studentId).filter((w) => w.active).length,
      icon: <Dumbbell className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      value: "pagamentos",
      label: "Pagamentos",
      count: pendingCount,
      icon: <CreditCard className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      value: "atividades",
      label: "Histórico",
      count: activities.length,
      icon: <Activity className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
  ];

  return (
    <div className="space-y-5">
      <StudentHeader
        student={student}
        billing={billing}
        plan={plan}
        unit={unit}
        onEdit={() => setEditOpen(true)}
        onAddTask={() => setTaskOpen(true)}
        onAddNote={() => setNoteOpen(true)}
        onRegisterPayment={() => billing.nextPayment && setPaymentTarget(billing.nextPayment)}
        onCharge={() => void sendCharge()}
        onAssignPlan={() => setPlanOpen(true)}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div>
        {tab === "resumo" && (
          <StudentResumoTab
            student={student}
            billing={billing}
            plan={plan}
            unit={unit}
            payments={payments}
            tasks={studentTasks}
            activities={activities}
            onCompleteProfile={() => setEditOpen(true)}
            onAssignPlan={() => setPlanOpen(true)}
            onRegisterPayment={(p) => setPaymentTarget(p)}
            onToggleTask={(id) => void toggleTask(id)}
            canEdit={Boolean(profile?.permissions.canRegisterStudents)}
            canCharge={Boolean(profile?.permissions.canSendPaymentLinks)}
            canManageApp={Boolean(profile?.permissions.canRegisterStudents || profile?.permissions.canCreateWorkouts)}
          />
        )}
        {tab === "saude" && <StudentHealthTab student={student} />}
        {tab === "treinos" && <StudentWorkoutsTab student={student} />}
        {tab === "pagamentos" && (
          <StudentPagamentosTab
            student={student}
            payments={payments}
            onRegister={(p) => setPaymentTarget(p)}
            onCancel={(p) => cancelPayment(p.id)}
            onAddCharge={() => setChargeOpen(true)}
            onAssignPlan={() => setPlanOpen(true)}
            canCharge={Boolean(profile?.permissions.canSendPaymentLinks)}
          />
        )}
        {tab === "atividades" && (
          <StudentAtividadesTab
            activities={activities}
            onDelete={(id) => void removeStudentActivity(id)}
            canDelete={Boolean(profile?.permissions.canDeleteRecords)}
          />
        )}
      </div>

      <StudentFormModal open={editOpen} onClose={() => setEditOpen(false)} student={student} />
      <AddTaskModal open={taskOpen} onClose={() => setTaskOpen(false)} defaultStudentId={student.id} />
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} studentId={student.id} />
      <AssignPlanModal open={planOpen} onClose={() => setPlanOpen(false)} student={student} />
      <AddChargeModal open={chargeOpen} onClose={() => setChargeOpen(false)} student={student} />
      <RegisterPaymentModal
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        payment={paymentTarget ?? undefined}
        student={student}
      />
    </div>
  );
}
