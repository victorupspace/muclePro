"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Ban, CreditCard, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { PaymentStatusBadge } from "./Badges";
import { AnimatedNumber, useRevealRows } from "./motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { PAYMENT_METHOD_LABEL, daysFromToday, formatCurrency, formatCurrencyDetailed, formatDateValue } from "@/lib/plataforma/format";
import type { Payment, Student } from "@/lib/plataforma/types";

type Props = {
  student: Student;
  payments: Payment[];
  onRegister: (payment: Payment) => void;
  onCancel: (payment: Payment) => Promise<boolean>;
  onAddCharge: () => void;
  onAssignPlan: () => void;
  canCharge: boolean;
};

export function StudentPagamentosTab({ student, payments, onRegister, onCancel, onAddCharge, onAssignPlan, canCharge }: Props) {
  const [confirmCancel, setConfirmCancel] = useState<Payment | null>(null);
  const tableRef = useRevealRows<HTMLDivElement>([payments.length]);

  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + p.amount, 0);
    const overdue = payments
      .filter((p) => p.status === "pendente" && daysFromToday(p.dueAt) < 0)
      .reduce((s, p) => s + p.amount, 0);
    const pending = payments.filter((p) => p.status === "pendente").reduce((s, p) => s + p.amount, 0);
    return { paid, overdue, pending };
  }, [payments]);

  const columns: Column<Payment>[] = [
    {
      key: "ref",
      header: "Referência",
      mobilePrimary: true,
      render: (p) => (
        <div className="flex items-start justify-between gap-2 md:block">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{p.referenceLabel ?? "Cobrança"}</p>
            {p.notes && <p className="truncate text-[11.5px] text-ink-500">{p.notes}</p>}
          </div>
          <span className="shrink-0 md:hidden">
            <PaymentStatusBadge payment={p} overdue={p.status === "pendente" && daysFromToday(p.dueAt) < 0} />
          </span>
        </div>
      ),
    },
    {
      key: "due",
      header: "Vencimento",
      mobileLabel: "Vencimento",
      render: (p) => {
        const days = daysFromToday(p.dueAt);
        const overdue = p.status === "pendente" && days < 0;
        return (
          <div>
            <p className={cn("text-[12.5px] font-semibold", overdue ? "text-danger-700" : "text-ink-900")}>
              {formatDateValue(p.dueAt)}
            </p>
            {p.status === "pendente" && (
              <p className="text-[11px] text-ink-500">
                {days < 0 ? `há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}` : days === 0 ? "hoje" : `em ${days} dia${days === 1 ? "" : "s"}`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Valor",
      mobileLabel: "Valor",
      render: (p) => <span className="text-[12.5px] font-semibold tabular-nums text-ink-900">{formatCurrencyDetailed(p.amount)}</span>,
    },
    {
      key: "paid",
      header: "Pagamento",
      mobileLabel: "Pagamento",
      render: (p) =>
        p.status === "pago" && p.paidAt ? (
          <div>
            <p className="text-[12.5px] text-ink-900">{formatDateValue(p.paidAt.slice(0, 10))}</p>
            {p.method && <p className="text-[11px] text-ink-500">{PAYMENT_METHOD_LABEL[p.method]}</p>}
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (p) => <PaymentStatusBadge payment={p} overdue={p.status === "pendente" && daysFromToday(p.dueAt) < 0} />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Total label="Em atraso" value={totals.overdue} tone={totals.overdue > 0 ? "danger" : undefined} />
        <Total label="Pendente" value={totals.pending} hint="Inclui o próximo ciclo" />
        <Total label="Total recebido" value={totals.paid} hint="Desde o cadastro" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-ink-500">
          {payments.length === 0
            ? "Nenhuma cobrança registrada."
            : `${payments.length} cobrança${payments.length === 1 ? "" : "s"} no histórico.`}
        </p>
        {canCharge && (
        <div className="flex gap-2">
          {!student.planId && student.status === "ativo" && (
            <button
              type="button"
              onClick={onAssignPlan}
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />
              Vincular plano
            </button>
          )}
          <button
            type="button"
            onClick={onAddCharge}
            className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Cobrança avulsa
          </button>
        </div>
        )}
      </div>

      <div ref={tableRef}>
        <DataTable
          rows={payments}
          columns={columns}
          rowKey={(p) => p.id}
          mobileActionsCols={2}
          emptyState={
            <EmptyState
              title="Sem cobranças por aqui"
              description={
                student.planId
                  ? "A primeira cobrança nasce quando o plano é vinculado."
                  : "Vincule um plano para iniciar o ciclo de cobrança deste aluno."
              }
            />
          }
          actions={(p) =>
            p.status === "pendente" && canCharge ? (
              <>
                <TableButton tone="primary" onClick={() => onRegister(p)}>
                  <CreditCard className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Registrar pagamento
                </TableButton>
                <TableButton tone="ghost" onClick={() => setConfirmCancel(p)}>
                  <Ban className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Cancelar
                </TableButton>
              </>
            ) : (
              <span className="text-[11px] text-ink-400">—</span>
            )
          }
        />
      </div>

      <ConfirmDialog
        open={!!confirmCancel}
        title="Cancelar esta cobrança?"
        description={
          confirmCancel
            ? `${formatCurrency(confirmCancel.amount)} com vencimento em ${formatDateValue(confirmCancel.dueAt)} deixa de contar como pendente. O aluno não fica inadimplente por ela.`
            : ""
        }
        confirmLabel="Cancelar cobrança"
        cancelLabel="Manter cobrança"
        tone="danger"
        onCancel={() => setConfirmCancel(null)}
        onConfirm={async () => {
          if (confirmCancel) await onCancel(confirmCancel);
          setConfirmCancel(null);
        }}
      />
    </motion.div>
  );
}

function Total({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "danger" }) {
  return (
    <div className={cn("rounded-card border bg-white p-4", tone === "danger" ? "border-danger-200" : "border-ink-200")}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className={cn("mt-2 text-[20px] font-bold leading-none tracking-[-0.02em]", tone === "danger" ? "text-danger-700" : "text-ink-900")}>
        <AnimatedNumber value={value} format={formatCurrency} />
      </p>
      {hint && <p className="mt-1.5 text-[11.5px] text-ink-500">{hint}</p>}
    </div>
  );
}
