"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, CheckCheck, Clock, Lock, RefreshCcw, Settings2, TrendingUp, Wallet } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { InvoiceBadge, PayInvoiceModal, SubscriptionModal } from "@/components/admin/billing/SubscriptionModals";
import { CurrencyInput } from "@/components/plataforma/FormKit";
import { Tabs } from "@/components/plataforma/Tabs";
import { cn } from "@/lib/cn";
import { INVOICE_METHOD_LABEL, billingView, todayBrt, useBilling, type Invoice, type SubscriptionPlan } from "@/lib/admin/billing";
import { formatCurrency } from "@/lib/admin/format";
import { useAdminStore } from "@/lib/admin/store";
import { onlyDigits } from "@/lib/cadastro/masks";
import type { Account } from "@/lib/admin/types";

type Tab = "contas" | "faturas" | "planos";

const br = (date?: string) => (date ? date.slice(0, 10).split("-").reverse().join("/") : "—");

const ACCOUNT_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "trial", label: "Em teste grátis" },
  { value: "trial_fim", label: "Teste termina em 7 dias" },
  { value: "em_dia", label: "Em dia" },
  { value: "pendente", label: "Fatura em aberto" },
  { value: "atrasado", label: "Em atraso" },
  { value: "leitura", label: "Modo leitura" },
  { value: "sem_plano", label: "Sem plano" },
];

const INVOICE_FILTERS = [
  { value: "abertas", label: "Em aberto" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "pagas", label: "Pagas" },
  { value: "canceladas", label: "Canceladas" },
  { value: "all", label: "Todas" },
];

export default function PagamentosPage() {
  const { accounts, refresh } = useAdminStore();
  const billing = useBilling();
  const { plans, invoices } = billing;

  const [tab, setTab] = useState<Tab>("contas");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("abertas");
  const [manageId, setManageId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [cancelInvoice, setCancelInvoice] = useState<Invoice | null>(null);
  const [reopenInvoice, setReopenInvoice] = useState<Invoice | null>(null);

  const today = todayBrt();
  const active = useMemo(() => accounts.filter((a) => a.status === "criada"), [accounts]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const views = useMemo(() => new Map(active.map((a) => [a.id, billingView(a, invoices, plans)])), [active, invoices, plans]);

  // Depois de cada ação, o banco recalcula a conta: relê as contas também.
  const after = async (ok: boolean) => {
    if (ok) await refresh();
    return ok;
  };

  const stats = useMemo(() => {
    const month = today.slice(0, 7);
    const planById = new Map(plans.map((p) => [p.id, p]));
    let mrr = 0;
    for (const a of active) {
      const p = a.payment.planId ? planById.get(a.payment.planId) : undefined;
      const price = a.payment.customPrice ?? p?.price;
      if (p && price !== undefined && !a.payment.canceledAt && a.payment.status !== "trial") mrr += price / p.months;
    }
    const open = invoices.filter((i) => i.status === "aberta");
    const overdue = open.filter((i) => i.dueOn < today);
    return {
      mrr,
      receivedMonth: invoices.filter((i) => i.status === "paga" && (i.paidAt ?? "").slice(0, 7) === month).reduce((s, i) => s + (i.paidAmount ?? i.amount), 0),
      openAmount: open.filter((i) => i.dueOn >= today).reduce((s, i) => s + i.amount, 0),
      overdueAmount: overdue.reduce((s, i) => s + i.amount, 0),
      overdueAccounts: new Set(overdue.map((i) => i.accountId)).size,
      trialsEnding: active.filter((a) => {
        const v = views.get(a.id);
        return v?.trialDaysLeft !== undefined && v.trialDaysLeft <= 7;
      }).length,
      readOnly: active.filter((a) => views.get(a.id)?.readOnly).length,
    };
  }, [active, invoices, plans, views, today]);

  const accountRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return active
      .filter((a) => {
        const v = views.get(a.id)!;
        switch (accountFilter) {
          case "trial":
            return a.payment.status === "trial";
          case "trial_fim":
            return v.trialDaysLeft !== undefined && v.trialDaysLeft <= 7;
          case "em_dia":
          case "pendente":
          case "atrasado":
            return a.payment.status === accountFilter && !v.readOnly;
          case "leitura":
            return v.readOnly;
          case "sem_plano":
            return !a.payment.planId;
          default:
            return true;
        }
      })
      .filter(
        (a) =>
          !q ||
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.companyName?.toLowerCase().includes(q) ?? false) ||
          (qDigits.length > 0 && onlyDigits(a.document).includes(qDigits)),
      )
      .sort((x, y) => {
        const rank = (a: Account) => {
          const v = views.get(a.id)!;
          return v.readOnly ? 0 : a.payment.status === "atrasado" ? 1 : v.trialDaysLeft !== undefined && v.trialDaysLeft <= 7 ? 2 : 3;
        };
        return rank(x) - rank(y) || (x.companyName ?? x.fullName).localeCompare(y.companyName ?? y.fullName);
      });
  }, [active, views, accountFilter, search]);

  const invoiceRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter((i) => {
        switch (invoiceFilter) {
          case "abertas":
            return i.status === "aberta";
          case "atrasadas":
            return i.status === "aberta" && i.dueOn < today;
          case "pagas":
            return i.status === "paga";
          case "canceladas":
            return i.status === "cancelada";
          default:
            return true;
        }
      })
      .filter((i) => {
        if (!q) return true;
        const a = accountById.get(i.accountId);
        return (a?.companyName ?? "").toLowerCase().includes(q) || (a?.fullName ?? "").toLowerCase().includes(q);
      })
      .sort((x, y) => (invoiceFilter === "pagas" ? (y.paidAt ?? "").localeCompare(x.paidAt ?? "") : x.dueOn.localeCompare(y.dueOn)));
  }, [invoices, invoiceFilter, search, accountById, today]);

  const accountColumns: Column<Account>[] = [
    {
      key: "name",
      header: "Academia",
      mobilePrimary: true,
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{a.companyName ?? a.fullName}</p>
          <p className="truncate text-[11.5px] text-ink-500">
            {a.fullName} · {a.email}
          </p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plano",
      render: (a) => {
        const v = views.get(a.id)!;
        const plan = plans.find((p) => p.id === a.payment.planId);
        const price = a.payment.customPrice ?? plan?.price;
        return plan ? (
          <div>
            <p className="text-[12.5px] font-semibold text-ink-900">{plan.name}</p>
            <p className={cn("text-[11px]", v.missingPrice ? "font-semibold text-warning-800" : "text-ink-500")}>
              {price !== undefined ? `${formatCurrency(price)}${a.payment.customPrice !== undefined ? " · negociado" : ""}` : "Valor a definir"}
            </p>
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-400">Sem plano</span>
        );
      },
    },
    {
      key: "status",
      header: "Situação",
      mobileLabel: "Situação",
      render: (a) => <AccountStatus account={a} view={views.get(a.id)!} />,
    },
    {
      key: "next",
      header: "Próx. vencimento",
      mobileLabel: "Vencimento",
      render: (a) => <span className="text-[12.5px] text-ink-700">{br(a.payment.nextDueAt)}</span>,
    },
    {
      key: "last",
      header: "Último pagamento",
      mobileLabel: "Último pago",
      hideOnMobile: true,
      render: (a) => <span className="text-[12px] text-ink-500">{a.payment.lastPaidAt ? br(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(a.payment.lastPaidAt))) : "—"}</span>,
    },
  ];

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "account",
      header: "Academia",
      mobilePrimary: true,
      render: (i) => {
        const a = accountById.get(i.accountId);
        return (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{a?.companyName ?? a?.fullName ?? "Conta removida"}</p>
            <p className="text-[11.5px] text-ink-500">
              {i.planName ?? "Assinatura"} · {br(i.periodStart)} a {br(i.periodEnd)}
            </p>
          </div>
        );
      },
    },
    { key: "amount", header: "Valor", render: (i) => <span className="text-[12.5px] font-semibold tabular-nums text-ink-900">{formatCurrency(i.amount)}</span> },
    {
      key: "due",
      header: "Vencimento",
      mobileLabel: "Vence",
      render: (i) => (
        <div>
          <p className={cn("text-[12.5px] font-semibold", i.status === "aberta" && i.dueOn < today ? "text-danger-700" : "text-ink-900")}>{br(i.dueOn)}</p>
          {i.status === "paga" && (
            <p className="text-[11px] text-ink-500">
              Paga {br(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(i.paidAt!)))}
              {i.method ? ` · ${INVOICE_METHOD_LABEL[i.method]}` : ""}
            </p>
          )}
        </div>
      ),
    },
    { key: "status", header: "Situação", hideOnMobile: true, render: (i) => <InvoiceBadge invoice={i} /> },
  ];

  const manageAccount = manageId ? accountById.get(manageId) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas e pagamentos"
        description="Planos do musclePro, assinatura de cada academia e faturas. A baixa é manual até a integração com o Asaas; o banco cuida de trial, atraso e modo leitura."
        actions={
          <button
            type="button"
            onClick={async () => after(await billing.refreshAll())}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
            Gerar faturas agora
          </button>
        }
      />

      {billing.error && (
        <div className="flex items-start justify-between gap-3 rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[13px] text-danger-700">
          <span>{billing.error}</span>
          <button type="button" onClick={billing.clearError} className="font-semibold underline">
            Fechar
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Receita recorrente" value={formatCurrency(stats.mrr)} hint="Por mês, contas pagantes" highlight icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />} />
        <StatCard label="Recebido no mês" value={formatCurrency(stats.receivedMonth)} hint="Faturas pagas" icon={<Wallet className="h-3.5 w-3.5" strokeWidth={2.4} />} />
        <StatCard label="A vencer" value={formatCurrency(stats.openAmount)} hint="Faturas em aberto" icon={<Clock className="h-3.5 w-3.5" strokeWidth={2.4} />} />
        <StatCard
          label="Em atraso"
          value={formatCurrency(stats.overdueAmount)}
          hint={`${stats.overdueAccounts} academia${stats.overdueAccounts === 1 ? "" : "s"}`}
          icon={<AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />}
        />
        <StatCard label="Teste termina em 7 dias" value={stats.trialsEnding} hint="Hora de ativar o plano" icon={<Clock className="h-3.5 w-3.5" strokeWidth={2.4} />} />
        <StatCard label="Modo leitura" value={stats.readOnly} hint="Bloqueadas para edição" icon={<Lock className="h-3.5 w-3.5" strokeWidth={2.4} />} />
      </section>

      <Tabs
        tabs={[
          { value: "contas" as Tab, label: "Academias", count: active.length },
          { value: "faturas" as Tab, label: "Faturas", count: invoices.filter((i) => i.status === "aberta").length },
          { value: "planos" as Tab, label: "Planos", count: plans.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== "planos" && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={search} onChange={setSearch} className="w-full lg:max-w-[380px]" placeholder="Buscar academia, responsável ou documento" />
          {tab === "contas" ? (
            <SelectFilter label="Situação" value={accountFilter} onChange={setAccountFilter} options={ACCOUNT_FILTERS} />
          ) : (
            <SelectFilter label="Faturas" value={invoiceFilter} onChange={setInvoiceFilter} options={INVOICE_FILTERS} />
          )}
        </div>
      )}

      {tab === "contas" && (
        <DataTable
          rows={accountRows}
          columns={accountColumns}
          rowKey={(a) => a.id}
          emptyState={<EmptyState title="Nenhuma academia com esse filtro" description="Ajuste a busca ou o filtro de situação." />}
          actions={(a) => (
            <TableButton tone="primary" onClick={() => setManageId(a.id)}>
              <Settings2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Gerenciar
            </TableButton>
          )}
        />
      )}

      {tab === "faturas" && (
        <DataTable
          rows={invoiceRows}
          columns={invoiceColumns}
          rowKey={(i) => i.id}
          emptyState={
            <EmptyState
              title="Nenhuma fatura aqui"
              description="As faturas nascem 10 dias antes de cada vencimento, para as academias com plano e valor definidos."
            />
          }
          actions={(i) =>
            i.status === "aberta" ? (
              <>
                <TableButton tone="success" onClick={() => setPayInvoice(i)}>
                  <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Registrar pagamento
                </TableButton>
                <TableButton tone="danger" onClick={() => setCancelInvoice(i)}>
                  <Ban className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Cancelar
                </TableButton>
              </>
            ) : i.status === "paga" ? (
              <TableButton onClick={() => setReopenInvoice(i)}>Desfazer pagamento</TableButton>
            ) : null
          }
        />
      )}

      {tab === "planos" && <PlansEditor plans={plans} accounts={active} onSave={async (id, patch) => after(await billing.savePlan(id, patch))} />}

      <SubscriptionModal
        open={!!manageAccount}
        onClose={() => setManageId(null)}
        account={manageAccount}
        plans={plans}
        invoices={invoices}
        onSave={async (account, patch, label) => after(await billing.saveSubscription(account, patch, label))}
        onCancelToggle={async (account, canceled) => after(await billing.setCanceled(account, canceled))}
        onPay={setPayInvoice}
        onCancelInvoice={setCancelInvoice}
        onReopenInvoice={setReopenInvoice}
      />
      <PayInvoiceModal
        open={!!payInvoice}
        onClose={() => setPayInvoice(null)}
        invoice={payInvoice}
        accountName={payInvoice ? accountById.get(payInvoice.accountId)?.companyName : undefined}
        onConfirm={async (inv, input) => after(await billing.payInvoice(inv, input))}
      />
      <ConfirmDialog
        open={!!cancelInvoice}
        title="Cancelar esta fatura?"
        description="Ela deixa de contar como dívida da academia. Use quando o período foi perdoado ou cobrado de outra forma."
        confirmLabel="Cancelar fatura"
        cancelLabel="Manter"
        tone="danger"
        onCancel={() => setCancelInvoice(null)}
        onConfirm={async () => {
          if (cancelInvoice) await after(await billing.cancelInvoice(cancelInvoice));
          setCancelInvoice(null);
        }}
      />
      <ConfirmDialog
        open={!!reopenInvoice}
        title="Desfazer pagamento?"
        description="A fatura volta para em aberto. Se já estiver vencida além da carência, a academia entra em modo leitura."
        confirmLabel="Desfazer"
        cancelLabel="Manter pago"
        tone="danger"
        onCancel={() => setReopenInvoice(null)}
        onConfirm={async () => {
          if (reopenInvoice) await after(await billing.reopenInvoice(reopenInvoice));
          setReopenInvoice(null);
        }}
      />
    </div>
  );
}

function AccountStatus({ account, view }: { account: Account; view: ReturnType<typeof billingView> }) {
  const p = account.payment;
  const [label, tone] = view.readOnly
    ? [p.canceledAt ? "Cancelada · leitura" : `Modo leitura${view.overdueDays ? ` · ${view.overdueDays}d` : ""}`, "bg-danger-600 text-white ring-danger-700"]
    : p.status === "atrasado"
      ? [`Atrasada · ${view.overdueDays}d`, "bg-danger-50 text-danger-700 ring-danger-200"]
      : p.status === "trial"
        ? [
            view.trialDaysLeft !== undefined ? (view.trialDaysLeft <= 0 ? "Teste termina hoje" : `Teste · ${view.trialDaysLeft}d`) : "Teste grátis",
            view.trialDaysLeft !== undefined && view.trialDaysLeft <= 7 ? "bg-warning-50 text-warning-800 ring-warning-200" : "bg-info-50 text-info-700 ring-info-200",
          ]
        : p.status === "em_dia"
          ? ["Em dia", "bg-success-50 text-success-700 ring-success-200"]
          : !p.planId
            ? ["Teste encerrado · sem plano", "bg-warning-50 text-warning-800 ring-warning-200"]
            : ["Fatura em aberto", "bg-warning-50 text-warning-800 ring-warning-200"];
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset", tone)}>{label}</span>;
}

function PlansEditor({
  plans,
  accounts,
  onSave,
}: {
  plans: SubscriptionPlan[];
  accounts: Account[];
  onSave: (id: string, patch: { price?: number | null; description?: string; active?: boolean }) => Promise<boolean>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-[1.55] text-ink-500">
        Valores por período (ex.: o Trimestral é cobrado a cada 3 meses). Trocar o valor de um plano refaz as faturas em aberto das academias nele;
        faturas pagas não mudam.
      </p>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} count={accounts.filter((a) => a.payment.planId === p.id).length} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  count,
  onSave,
}: {
  plan: SubscriptionPlan;
  count: number;
  onSave: (id: string, patch: { price?: number | null; description?: string; active?: boolean }) => Promise<boolean>;
}) {
  const [price, setPrice] = useState<number | "">(plan.price ?? "");
  const [description, setDescription] = useState(plan.description ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = (plan.price ?? "") !== price || (plan.description ?? "") !== description;
  return (
    <section className={cn("flex flex-col rounded-card border bg-white p-4", plan.active ? "border-ink-200" : "border-dashed border-ink-300 opacity-75")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold text-ink-900">{plan.name}</p>
          <p className="text-[11.5px] text-ink-500">
            Cobrado a cada {plan.months === 1 ? "mês" : `${plan.months} meses`} · {count} academia{count === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onSave(plan.id, { active: !plan.active })}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
            plan.active ? "bg-success-50 text-success-700 ring-success-200" : "bg-ink-100 text-ink-500 ring-ink-200",
          )}
          title={plan.active ? "Desativar (não aparece para novas assinaturas)" : "Ativar"}
        >
          {plan.active ? "Ativo" : "Inativo"}
        </button>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Valor do período</span>
        <CurrencyInput value={price} onChange={setPrice} placeholder="A definir" />
      </label>
      {plan.months > 1 && price !== "" && (
        <p className="mt-1 text-[11.5px] text-ink-500">Equivale a {formatCurrency(price / plan.months)} por mês.</p>
      )}
      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Descrição</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: economia de 10%"
          className="h-10 w-full rounded-btn border border-ink-200 px-3 text-[13px] text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
      </label>
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={async () => {
          setSaving(true);
          await onSave(plan.id, { price: price === "" ? null : price, description });
          setSaving(false);
        }}
        className="mt-3 h-10 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </section>
  );
}
