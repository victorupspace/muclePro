"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCheck, RotateCcw } from "lucide-react";
import { CurrencyInput, Field, ModalFooter, inputClass, selectClass, textareaClass } from "@/components/plataforma/FormKit";
import { Modal } from "@/components/plataforma/Modal";
import { cn } from "@/lib/cn";
import {
  INVOICE_METHOD_LABEL,
  billingView,
  todayBrt,
  type Invoice,
  type InvoiceMethod,
  type SubscriptionPatch,
  type SubscriptionPlan,
} from "@/lib/admin/billing";
import { formatCurrency } from "@/lib/admin/format";
import type { Account } from "@/lib/admin/types";

const toDate = (iso?: string) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "");
const fromDate = (date: string) => (date ? new Date(`${date}T23:59:00-03:00`).toISOString() : null);
const br = (date?: string) => (date ? date.split("-").reverse().join("/") : "—");

export const INVOICE_STATUS_TONE = {
  paga: "bg-success-50 text-success-700 ring-success-200",
  aberta: "bg-warning-50 text-warning-800 ring-warning-200",
  atrasada: "bg-danger-50 text-danger-700 ring-danger-200",
  cancelada: "bg-ink-100 text-ink-500 ring-ink-200",
} as const;

export function InvoiceBadge({ invoice }: { invoice: Invoice }) {
  const late = invoice.status === "aberta" && invoice.dueOn < todayBrt();
  const key = late ? "atrasada" : invoice.status;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset", INVOICE_STATUS_TONE[key])}>
      {late ? "Atrasada" : invoice.status === "paga" ? "Paga" : invoice.status === "aberta" ? "Em aberto" : "Cancelada"}
    </span>
  );
}

type ManageProps = {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  plans: SubscriptionPlan[];
  invoices: Invoice[];
  onSave: (account: Account, patch: SubscriptionPatch, label: string) => Promise<boolean>;
  onCancelToggle: (account: Account, canceled: boolean) => Promise<boolean>;
  onPay: (invoice: Invoice) => void;
  onCancelInvoice: (invoice: Invoice) => void;
  onReopenInvoice: (invoice: Invoice) => void;
};

// Plano, valor, teste grátis, carência e as faturas de uma academia.
export function SubscriptionModal({ open, onClose, account, plans, invoices, onSave, onCancelToggle, onPay, onCancelInvoice, onReopenInvoice }: ManageProps) {
  const [planId, setPlanId] = useState("");
  const [customPrice, setCustomPrice] = useState<number | "">("");
  const [trialEnd, setTrialEnd] = useState("");
  const [startOn, setStartOn] = useState("");
  const [grace, setGrace] = useState("5");
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const accountId = account?.id;
  useEffect(() => {
    if (!open || !account) return;
    setPlanId(account.payment.planId ?? "");
    setCustomPrice(account.payment.customPrice ?? "");
    setTrialEnd(toDate(account.payment.trialEndsAt));
    setStartOn(toDate(account.payment.subscriptionStartedAt));
    setGrace(String(account.payment.graceDays));
    setConfirmCancel(false);
    // Reinicia só ao abrir ou trocar de conta.
  }, [open, accountId]);

  if (!account) return null;
  const mine = invoices.filter((i) => i.accountId === account.id && i.status !== "cancelada");
  const plan = plans.find((p) => p.id === planId);
  const view = billingView(account, invoices, plans);
  const hasInvoices = invoices.some((i) => i.accountId === account.id && i.status !== "cancelada");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    const parts: string[] = [];
    const patch: SubscriptionPatch = {};
    if ((account.payment.planId ?? "") !== planId) {
      patch.planId = planId || null;
      parts.push(`plano ${plan?.name ?? "removido"}`);
    }
    const price = customPrice === "" ? null : customPrice;
    if ((account.payment.customPrice ?? null) !== price) {
      patch.customPrice = price;
      parts.push(price === null ? "valor do catálogo" : `valor negociado ${formatCurrency(price)}`);
    }
    if (toDate(account.payment.trialEndsAt) !== trialEnd) {
      patch.trialEndsAt = fromDate(trialEnd);
      parts.push(`teste grátis até ${br(trialEnd)}`);
    }
    if (toDate(account.payment.subscriptionStartedAt) !== startOn) {
      patch.subscriptionStartedAt = startOn ? new Date(`${startOn}T12:00:00-03:00`).toISOString() : null;
      parts.push(`cobrança a partir de ${br(startOn)}`);
    }
    if (String(account.payment.graceDays) !== grace) {
      patch.graceDays = Number(grace) || 0;
      parts.push(`carência de ${grace} dias`);
    }
    const ok = parts.length === 0 ? true : await onSave(account, patch, `Assinatura: ${parts.join(", ")}`);
    setSaving(false);
    if (ok) onClose();
  }

  function extendTrial(days: number) {
    const base = trialEnd && trialEnd > todayBrt() ? trialEnd : todayBrt();
    const [y, m, d] = base.split("-").map(Number);
    setTrialEnd(new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Assinatura da academia"
      description={`${account.companyName ?? account.fullName} · ${account.email}`}
      footer={<ModalFooter onCancel={onClose} formId="subscription-form" submitting={saving} submitLabel="Salvar assinatura" />}
    >
      <form id="subscription-form" onSubmit={save} className="space-y-4">
        {view.readOnly && (
          <p className="flex items-start gap-2 rounded-btn bg-danger-50 px-3 py-2 text-[12.5px] font-semibold text-danger-700 ring-1 ring-inset ring-danger-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
            Em modo leitura. {account.payment.canceledAt ? "Assinatura cancelada." : "Registre o pagamento da fatura atrasada para liberar."}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Plano">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={selectClass}>
              <option value="">Sem plano (só teste grátis)</option>
              {plans
                .filter((p) => p.active || p.id === planId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.price !== undefined ? formatCurrency(p.price) : "valor a definir"}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Valor negociado" hint={plan ? `Vazio = valor do plano (${plan.price !== undefined ? formatCurrency(plan.price) : "a definir"}).` : undefined}>
            <CurrencyInput value={customPrice} onChange={setCustomPrice} />
          </Field>
          <Field label="Fim do teste grátis">
            <div className="flex gap-1.5">
              <input type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} className={inputClass} />
              <button type="button" onClick={() => extendTrial(7)} className="h-10 shrink-0 rounded-btn border border-ink-200 px-2.5 text-[12px] font-semibold text-ink-700 hover:bg-ink-50">
                +7 dias
              </button>
            </div>
          </Field>
          <Field label="Cobrança a partir de" hint={hasInvoices ? "Já há faturas: o próximo período segue a última." : "Vazio = no fim do teste grátis (ou hoje)."}>
            <input type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} disabled={hasInvoices} className={inputClass} />
          </Field>
          <Field label="Carência (dias)" hint="Depois do vencimento, antes do modo leitura.">
            <input type="number" min={0} max={60} value={grace} onChange={(e) => setGrace(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {plan && plan.price === undefined && customPrice === "" && (
          <p className="rounded-btn bg-warning-50 px-3 py-2 text-[12px] text-warning-800 ring-1 ring-inset ring-warning-200">
            O plano {plan.name} ainda não tem valor. Defina na aba Planos ou informe um valor negociado para as faturas serem geradas.
          </p>
        )}
        <p className="text-[11.5px] leading-[1.5] text-ink-500">
          Ao trocar plano ou valor, as faturas em aberto são refeitas com o novo valor. Faturas pagas não mudam.
        </p>
      </form>

      <div className="mt-5 border-t border-ink-100 pt-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Faturas</p>
        {mine.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-ink-500">Nenhuma fatura. Elas são criadas 10 dias antes de cada vencimento.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink-100 rounded-btn border border-ink-200">
            {mine.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink-900">
                    {br(inv.periodStart)} a {br(inv.periodEnd)} · {formatCurrency(inv.amount)}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {inv.status === "paga"
                      ? `Paga em ${br(toDate(inv.paidAt))}${inv.method ? ` · ${INVOICE_METHOD_LABEL[inv.method]}` : ""}`
                      : `Vence ${br(inv.dueOn)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <InvoiceBadge invoice={inv} />
                  {inv.status === "aberta" ? (
                    <>
                      <button type="button" onClick={() => onPay(inv)} className="inline-flex h-7 items-center gap-1 rounded-btn bg-success-600 px-2 text-[11px] font-semibold text-white hover:bg-success-700">
                        <CheckCheck className="h-3 w-3" strokeWidth={2.6} />
                        Pago
                      </button>
                      <button type="button" onClick={() => onCancelInvoice(inv)} aria-label="Cancelar fatura" className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600">
                        <Ban className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => onReopenInvoice(inv)} title="Desfazer pagamento" aria-label="Desfazer pagamento" className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-400 hover:bg-ink-100 hover:text-ink-800">
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-ink-100 pt-3">
        {confirmCancel ? (
          <div className="flex flex-col gap-2 rounded-btn bg-danger-50 p-3 ring-1 ring-inset ring-danger-200 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-[1.5] text-danger-700">A academia fica em modo leitura e as faturas futuras são canceladas. Nenhum dado é apagado.</p>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={() => setConfirmCancel(false)} className="h-8 rounded-btn px-2.5 text-[12px] font-semibold text-ink-600 hover:bg-white">
                Manter
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (await onCancelToggle(account, true)) onClose();
                }}
                className="h-8 rounded-btn bg-danger-600 px-3 text-[12px] font-semibold text-white hover:bg-danger-700"
              >
                Cancelar assinatura
              </button>
            </div>
          </div>
        ) : account.payment.canceledAt ? (
          <button
            type="button"
            onClick={async () => {
              if (await onCancelToggle(account, false)) onClose();
            }}
            className="text-[12px] font-semibold text-brand hover:underline"
          >
            Reativar assinatura
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmCancel(true)} className="text-[12px] font-semibold text-danger-600 hover:text-danger-700">
            Cancelar assinatura
          </button>
        )}
      </div>
    </Modal>
  );
}

export function PayInvoiceModal({
  open,
  onClose,
  invoice,
  accountName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  accountName?: string;
  onConfirm: (invoice: Invoice, input: { paidOn: string; amount: number; method: InvoiceMethod; notes?: string }) => Promise<boolean>;
}) {
  const [paidOn, setPaidOn] = useState(todayBrt());
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<InvoiceMethod>("pix");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const invoiceId = invoice?.id;
  useEffect(() => {
    if (!open || !invoice) return;
    setPaidOn(todayBrt());
    setAmount(invoice.amount);
    setMethod("pix");
    setNotes("");
    // Reinicia só ao abrir ou trocar de fatura.
  }, [open, invoiceId]);

  if (!invoice) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pagamento"
      description={`${accountName ?? ""} · ${br(invoice.periodStart)} a ${br(invoice.periodEnd)}`}
      footer={<ModalFooter onCancel={onClose} formId="pay-invoice-form" submitting={saving} submitLabel="Registrar pagamento" />}
    >
      <form
        id="pay-invoice-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (amount === "") return;
          setSaving(true);
          const ok = await onConfirm(invoice, { paidOn, amount, method, notes: notes.trim() });
          setSaving(false);
          if (ok) onClose();
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Field label="Pago em">
          <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} max={todayBrt()} className={inputClass} />
        </Field>
        <Field label="Valor recebido">
          <CurrencyInput value={amount} onChange={setAmount} required />
        </Field>
        <Field label="Forma" className="sm:col-span-2">
          <select value={method} onChange={(e) => setMethod(e.target.value as InvoiceMethod)} className={selectClass}>
            {(Object.keys(INVOICE_METHOD_LABEL) as InvoiceMethod[]).map((m) => (
              <option key={m} value={m}>
                {INVOICE_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observação" className="sm:col-span-2">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={textareaClass} placeholder="Ex.: comprovante enviado pelo WhatsApp" />
        </Field>
      </form>
    </Modal>
  );
}
