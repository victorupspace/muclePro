import { cn } from "@/lib/cn";
import {
  BILLING_STATE_LABEL,
  PAYMENT_STATUS_LABEL,
  STAFF_ROLE_LABEL,
  STUDENT_STATUS_LABEL,
} from "@/lib/plataforma/format";
import type { BillingState, Payment, StaffRole, StudentStatus } from "@/lib/plataforma/types";

const BASE =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset";

const BILLING_TONE: Record<BillingState, { wrap: string; dot: string }> = {
  em_dia: { wrap: "bg-success-50 text-success-700 ring-success-200", dot: "bg-success-500" },
  a_vencer: { wrap: "bg-warning-50 text-warning-800 ring-warning-200", dot: "bg-warning-500" },
  inadimplente: { wrap: "bg-danger-50 text-danger-700 ring-danger-200", dot: "bg-danger-500" },
  sem_plano: { wrap: "bg-ink-100 text-ink-500 ring-ink-200", dot: "bg-ink-400" },
};

export function BillingBadge({
  state,
  detail,
  className,
}: {
  state: BillingState;
  detail?: string;
  className?: string;
}) {
  const tone = BILLING_TONE[state];
  return (
    <span className={cn(BASE, tone.wrap, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {BILLING_STATE_LABEL[state]}
      {detail && <span className="font-semibold normal-case tracking-normal opacity-80">· {detail}</span>}
    </span>
  );
}

const STUDENT_TONE: Record<StudentStatus, string> = {
  ativo: "bg-brand/8 text-brand ring-brand/25",
  inativo: "bg-ink-100 text-ink-500 ring-ink-200",
};

export function StudentStatusBadge({ status, className }: { status: StudentStatus; className?: string }) {
  return (
    <span className={cn(BASE, STUDENT_TONE[status], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "ativo" ? "bg-brand" : "bg-ink-400")} />
      {STUDENT_STATUS_LABEL[status]}
    </span>
  );
}

const PAYMENT_TONE: Record<Payment["status"] | "atrasado", string> = {
  pendente: "bg-warning-50 text-warning-800 ring-warning-200",
  atrasado: "bg-danger-50 text-danger-700 ring-danger-200",
  pago: "bg-success-50 text-success-700 ring-success-200",
  cancelado: "bg-ink-100 text-ink-500 ring-ink-200 line-through",
};

export function PaymentStatusBadge({ payment, overdue }: { payment: Payment; overdue: boolean }) {
  const key = payment.status === "pendente" && overdue ? "atrasado" : payment.status;
  return (
    <span className={cn(BASE, PAYMENT_TONE[key])}>
      {key === "atrasado" ? "Atrasado" : PAYMENT_STATUS_LABEL[payment.status]}
    </span>
  );
}

const ROLE_TONE: Record<StaffRole, string> = {
  gestao: "bg-brand/8 text-brand ring-brand/25",
  recepcao: "bg-info-50 text-info-700 ring-info-200",
  contabilidade: "bg-success-50 text-success-700 ring-success-200",
  personal: "bg-warning-50 text-warning-800 ring-warning-200",
  outro: "bg-ink-100 text-ink-600 ring-ink-200",
};

export function RoleBadge({ role, label }: { role: StaffRole; label?: string }) {
  return <span className={cn(BASE, ROLE_TONE[role])}>{role === "outro" && label ? label : STAFF_ROLE_LABEL[role]}</span>;
}

export function ActiveBadge({ active, labels = ["Ativo", "Inativo"] }: { active: boolean; labels?: [string, string] }) {
  return (
    <span
      className={cn(
        BASE,
        active ? "bg-success-50 text-success-700 ring-success-200" : "bg-ink-100 text-ink-500 ring-ink-200",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-success-500" : "bg-ink-400")} />
      {active ? labels[0] : labels[1]}
    </span>
  );
}
