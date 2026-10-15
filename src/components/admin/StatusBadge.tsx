import { cn } from "@/lib/cn";
import {
  LEAD_STATUS_LABEL,
  PAYMENT_LABEL,
} from "@/lib/admin/format";
import type {
  AccountStatus,
  LeadStatus,
  PaymentStatus,
} from "@/lib/admin/types";

const ACCOUNT_TONE: Record<AccountStatus, string> = {
  nova: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/30",
  criada: "bg-ink-900 text-white",
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  em_dia: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-200",
  pendente: "bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-200",
  atrasado: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-200",
  trial: "bg-ink-100 text-ink-700 ring-1 ring-inset ring-ink-200",
  cancelado: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200 line-through",
  nao_iniciado: "bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200",
};

const LEAD_TONE: Record<LeadStatus, string> = {
  aguardando: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/30",
  em_contato: "bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-200",
  convertida: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-200",
  perdida: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
};

const ACCOUNT_LABEL: Record<AccountStatus, string> = { nova: "Nova", criada: "Aprovada" };

const baseClasses =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]";

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <span className={cn(baseClasses, ACCOUNT_TONE[status])}>{ACCOUNT_LABEL[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn(baseClasses, PAYMENT_TONE[status])}>{PAYMENT_LABEL[status]}</span>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={cn(baseClasses, LEAD_TONE[status])}>{LEAD_STATUS_LABEL[status]}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        baseClasses,
        active
          ? "bg-success-50 text-success-700 ring-1 ring-inset ring-success-200"
          : "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-success-500" : "bg-ink-400")} />
      {active ? "Ativa" : "Inativa"}
    </span>
  );
}
