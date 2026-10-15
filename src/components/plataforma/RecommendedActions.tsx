"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Cake,
  HeartHandshake,
  CreditCard,
  ExternalLink,
  ListChecks,
  MapPin,
  MessageCircle,
  Sparkles,
  UserPen,
  type LucideIcon,
} from "lucide-react";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";
import { AssignPlanModal, RegisterPaymentModal } from "./PaymentModals";
import { StaffFormModal } from "./StaffFormModal";
import { StudentFormModal } from "./StudentFormModal";
import { useToast } from "./Toast";
import { useRevealList } from "./motion";
import { cn } from "@/lib/cn";
import { firstName, formatCurrencyDetailed, formatDateValue, whatsappLink } from "@/lib/plataforma/format";
import {
  PRIORITY_LABEL_NBA,
  PRIORITY_TONE_NBA,
  type NextBestAction,
  type NextBestActionCta,
} from "@/lib/plataforma/next-best-action";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Payment, Staff, Student } from "@/lib/plataforma/types";

const CTA_ICONS: Record<NextBestActionCta, LucideIcon> = {
  register_payment: CreditCard,
  send_charge: MessageCircle,
  send_reminder: MessageCircle,
  assign_plan: CreditCard,
  complete_profile: UserPen,
  congratulate: Cake,
  link_unit: MapPin,
  open_tasks: ListChecks,
  talk_to_student: HeartHandshake,
};

type Props = {
  actions: NextBestAction[];
  limit?: number;
  loading?: boolean;
  className?: string;
  // Quando informado, a lista mostra tudo ao clicar em "Ver todas".
  expandable?: boolean;
};

// Lista de ações recomendadas com os modais e atalhos de cada CTA.
export function RecommendedActions({ actions, limit = 5, loading, className, expandable = true }: Props) {
  const router = useRouter();
  const { profile } = useAccountSession();
  const { students, staff, payments, billingFor, logCharge, addStudentActivity } = usePlataformaStore();
  const { push } = useToast();

  const [showAll, setShowAll] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ student: Student; payment: Payment } | null>(null);
  const [planTarget, setPlanTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [staffTarget, setStaffTarget] = useState<Staff | null>(null);

  const perms = profile?.permissions;
  const allowed = useMemo(
    () =>
      actions.filter((a) => {
        switch (a.ctaAction) {
          case "send_charge":
          case "send_reminder":
          case "register_payment":
          case "assign_plan":
            return Boolean(perms?.canSendPaymentLinks);
          case "complete_profile":
            return Boolean(perms?.canRegisterStudents);
          case "link_unit":
            return Boolean(perms?.canManageTeam);
          default:
            return true;
        }
      }),
    [actions, perms],
  );
  const visible = showAll ? allowed : allowed.slice(0, limit);
  const critical = allowed.filter((a) => a.priority === "critical").length;
  const listRef = useRevealList<HTMLUListElement>([visible.length, showAll]);

  const companyName = profile?.companyName ?? "nossa equipe";

  function openWhatsapp(student: Student, text: string) {
    if (!student.whatsapp) {
      push({
        tone: "warn",
        title: "Aluno sem WhatsApp",
        description: "Cadastre o número para enviar mensagens direto daqui.",
      });
      setEditTarget(student);
      return false;
    }
    window.open(whatsappLink(student.whatsapp, text), "_blank", "noopener,noreferrer");
    return true;
  }

  async function run(action: NextBestAction) {
    const student = action.studentId ? students.find((s) => s.id === action.studentId) : undefined;

    switch (action.ctaAction) {
      case "send_charge": {
        if (!student) return;
        const billing = billingFor(student.id);
        const payment = billing.overduePayment;
        const text = `Oi ${firstName(student.fullName)}, tudo bem? Aqui é da ${companyName}. ${
          payment
            ? `Sua mensalidade de ${formatCurrencyDetailed(payment.amount)} venceu em ${formatDateValue(payment.dueAt)}.`
            : "Identificamos uma cobrança em aberto no seu plano."
        } Me responde por aqui que te passo o link de pagamento. Qualquer dúvida, estou à disposição!`;
        if (openWhatsapp(student, text)) {
          await logCharge(student.id, "whatsapp", payment);
          push({ tone: "success", title: "Cobrança registrada", description: "O envio ficou no histórico do aluno." });
        }
        return;
      }
      case "send_reminder": {
        if (!student) return;
        const billing = billingFor(student.id);
        const payment = billing.nextPayment;
        const text = `Oi ${firstName(student.fullName)}! Passando para lembrar que ${
          payment
            ? `sua mensalidade de ${formatCurrencyDetailed(payment.amount)} vence em ${formatDateValue(payment.dueAt)}.`
            : "seu plano está perto de vencer."
        } Qualquer coisa, é só chamar. Bom treino!`;
        if (openWhatsapp(student, text)) {
          await logCharge(student.id, "lembrete", payment);
          push({ tone: "success", title: "Lembrete registrado" });
        }
        return;
      }
      case "register_payment": {
        if (!student) return;
        const pending = payments
          .filter((p) => p.studentId === student.id && p.status === "pendente")
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
        if (pending) setPaymentTarget({ student, payment: pending });
        return;
      }
      case "assign_plan":
        if (student) setPlanTarget(student);
        return;
      case "complete_profile":
        if (student) setEditTarget(student);
        return;
      case "congratulate": {
        if (!student) return;
        openWhatsapp(
          student,
          `Parabéns, ${firstName(student.fullName)}! Toda a equipe da ${companyName} deseja um ótimo dia. Bom treino!`,
        );
        return;
      }
      case "link_unit": {
        const member = action.staffId ? staff.find((s) => s.id === action.staffId) : undefined;
        if (member) setStaffTarget(member);
        return;
      }
      case "open_tasks":
        router.push("/plataforma/tarefas");
        return;
      case "talk_to_student": {
        if (!student) return;
        const text = `Oi ${firstName(student.fullName)}, tudo bem? Aqui é da ${companyName}. Passando para saber como estão os treinos e se tem algo que a gente possa ajustar para você. Conta pra mim!`;
        if (openWhatsapp(student, text)) {
          await addStudentActivity(student.id, {
            kind: "contato",
            title: "Contato de retenção pelo WhatsApp",
            body: action.reason,
          });
          push({ tone: "success", title: "Contato registrado", description: "Ficou no histórico do aluno." });
        }
        return;
      }
    }
  }

  const hint = useMemo(() => {
    if (loading) return "Analisando sua base…";
    if (allowed.length === 0) return "Nada pendente. Sua operação está em dia.";
    const rest = allowed.length - critical;
    return critical > 0
      ? `${critical} crítica${critical === 1 ? "" : "s"} · ${rest} para esta semana`
      : `${allowed.length} para esta semana`;
  }, [loading, allowed.length, critical]);

  return (
    <>
      <ModuleCard
        title="Ações recomendadas"
        hint={hint}
        icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />}
        count={allowed.length}
        countTone={critical > 0 ? "danger" : allowed.length > 0 ? "warn" : "default"}
        onSeeAll={expandable && allowed.length > limit && !showAll ? () => setShowAll(true) : undefined}
        className={className}
      >
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-btn border border-ink-100 bg-ink-50/60" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <ModuleEmpty>
            Nenhuma ação pendente.
            <span className="mt-0.5 block text-[10.5px] text-ink-500">
              Novas recomendações aparecem conforme cobranças vencem e cadastros mudam.
            </span>
          </ModuleEmpty>
        ) : (
          <ul ref={listRef} className="space-y-1.5">
            {visible.map((action) => {
              const student = action.studentId ? students.find((s) => s.id === action.studentId) : undefined;
              const member = action.staffId ? staff.find((s) => s.id === action.staffId) : undefined;
              return (
                <ActionRow
                  key={action.id}
                  action={action}
                  subject={student?.fullName ?? member?.fullName ?? "Operação"}
                  onExecute={() => void run(action)}
                  onOpen={student ? () => router.push(`/plataforma/alunos/${student.id}`) : undefined}
                />
              );
            })}
          </ul>
        )}
      </ModuleCard>

      <RegisterPaymentModal
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        payment={paymentTarget?.payment}
        student={paymentTarget?.student}
      />
      <AssignPlanModal open={!!planTarget} onClose={() => setPlanTarget(null)} student={planTarget ?? undefined} />
      <StudentFormModal open={!!editTarget} onClose={() => setEditTarget(null)} student={editTarget ?? undefined} />
      <StaffFormModal open={!!staffTarget} onClose={() => setStaffTarget(null)} member={staffTarget ?? undefined} focusUnit />
    </>
  );
}

function ActionRow({
  action,
  subject,
  onExecute,
  onOpen,
}: {
  action: NextBestAction;
  subject: string;
  onExecute: () => void;
  onOpen?: () => void;
}) {
  const Icon = CTA_ICONS[action.ctaAction] ?? ListChecks;
  return (
    <li className="rounded-btn border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50/50">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="min-w-0 flex-1 text-left disabled:cursor-default"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 shrink-0 text-brand" strokeWidth={2.4} />
            <p className="truncate text-[12.5px] font-semibold text-ink-900">{subject}</p>
          </div>
          <p className="mt-0.5 text-[11.5px] font-semibold text-ink-700">{action.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-[1.4] text-ink-500">{action.reason}</p>
        </button>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
            PRIORITY_TONE_NBA[action.priority],
          )}
        >
          {PRIORITY_LABEL_NBA[action.priority]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onExecute}
          className="inline-flex h-7 items-center gap-1 rounded-btn bg-brand px-2.5 text-[10.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Icon className="h-3 w-3" strokeWidth={2.4} />
          {action.ctaLabel}
        </button>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-btn px-2 text-[10.5px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
            Abrir aluno
          </button>
        )}
      </div>
    </li>
  );
}
