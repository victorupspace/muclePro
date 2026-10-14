"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Eye, History } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { AccountDetailDrawer } from "@/components/admin/DetailDrawer";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { useAdminStore } from "@/lib/admin/store";
import {
  formatCurrency,
  formatDate,
} from "@/lib/admin/format";
import { onlyDigits } from "@/lib/cadastro/masks";
import type { Account, PaymentStatus } from "@/lib/admin/types";

const PAYMENT_OPTIONS: { value: "all" | PaymentStatus; label: string }[] = [
  { value: "all", label: "Todos pagamentos" },
  { value: "em_dia", label: "Em dia" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
  { value: "trial", label: "Trial" },
  { value: "cancelado", label: "Cancelado" },
];

export default function PagamentosPage() {
  const { accounts, markPaid } = useAdminStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [confirmPaid, setConfirmPaid] = useState<string | null>(null);

  const billable = useMemo(
    () => accounts.filter((a) => a.status === "criada" && a.payment.status !== "nao_iniciado"),
    [accounts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return billable
      .filter((a) => (status === "all" ? true : a.payment.status === status))
      .filter((a) => {
        if (!q) return true;
        return (
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.companyName?.toLowerCase().includes(q) ?? false) ||
          onlyDigits(a.document).includes(qDigits)
        );
      });
  }, [billable, status, search]);

  const drawerAccount = drawerId ? accounts.find((a) => a.id === drawerId) ?? null : null;
  const paidAcc = confirmPaid ? accounts.find((a) => a.id === confirmPaid) : undefined;

  const columns: Column<Account>[] = [
    {
      key: "name",
      header: "Conta",
      mobilePrimary: true,
      render: (a) => (
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <p className="truncate font-semibold text-ink-900">{a.fullName}</p>
            <span className="shrink-0 md:hidden">
              <PaymentStatusBadge status={a.payment.status} />
            </span>
          </div>
          <p className="truncate text-[11.5px] text-ink-500">
            {a.companyName ?? a.email}
          </p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plano",
      render: (a) => (
        <span className="text-[12.5px] font-semibold text-ink-700">
          {a.payment.plan ?? "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Mensalidade",
      render: (a) => (
        <span className="text-[12.5px] font-semibold text-ink-900">
          {a.payment.monthlyAmount ? formatCurrency(a.payment.monthlyAmount) : "—"}
        </span>
      ),
    },
    {
      key: "next",
      header: "Próx. vencimento",
      mobileLabel: "Vencimento",
      render: (a) => (
        <span className="text-[12.5px] text-ink-700">
          {a.payment.nextDueAt ? formatDate(a.payment.nextDueAt) : "—"}
        </span>
      ),
    },
    {
      key: "last",
      header: "Último pagamento",
      mobileLabel: "Último pago",
      render: (a) => (
        <span className="text-[12px] text-ink-500">
          {a.payment.lastPaidAt ? formatDate(a.payment.lastPaidAt) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (a) => <PaymentStatusBadge status={a.payment.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Visão consolidada dos pagamentos das contas ativas. Estrutura preparada para integração futura com o gateway."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full lg:max-w-[420px]"
          placeholder="Buscar por nome, empresa, email ou documento"
        />
        <SelectFilter label="Pagamento" value={status} onChange={setStatus} options={PAYMENT_OPTIONS} />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(a) => a.id}
        emptyState={
          <EmptyState
            title="Nenhum pagamento encontrado"
            description="Ajuste os filtros ou aprove novas contas para que apareçam aqui."
            icon={<History className="h-5 w-5" strokeWidth={2.2} />}
          />
        }
        actions={(a) => (
          <>
            <TableButton onClick={() => setDrawerId(a.id)}>
              <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
              Histórico
            </TableButton>
            <TableButton
              tone="success"
              onClick={() => setConfirmPaid(a.id)}
              disabled={a.payment.status === "em_dia"}
            >
              <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              Marcar como pago
            </TableButton>
          </>
        )}
      />

      <AccountDetailDrawer
        account={drawerAccount}
        open={!!drawerAccount}
        onClose={() => setDrawerId(null)}
      />

      <ConfirmDialog
        open={!!paidAcc}
        title="Marcar pagamento como em dia?"
        description={
          paidAcc
            ? `O pagamento de ${paidAcc.fullName} será marcado como em dia, com data atual como último pagamento.`
            : ""
        }
        confirmLabel="Marcar como pago"
        onCancel={() => setConfirmPaid(null)}
        onConfirm={() => {
          if (paidAcc) markPaid(paidAcc.id);
          setConfirmPaid(null);
        }}
      />
    </div>
  );
}
