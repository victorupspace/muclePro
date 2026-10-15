"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Account } from "./types";

// Assinatura das academias (backoffice): catálogo de planos, faturas e as
// ações de cobrança. A situação de cada conta é recalculada pelo banco.

export type PlanInterval = "mensal" | "trimestral" | "semestral" | "anual";

export type SubscriptionPlan = {
  id: string;
  name: string;
  interval: PlanInterval;
  months: number;
  price?: number;
  description?: string;
  active: boolean;
};

export type InvoiceStatus = "aberta" | "paga" | "cancelada";
export type InvoiceMethod = "pix" | "boleto" | "cartao" | "transferencia" | "outro";

export type Invoice = {
  id: string;
  accountId: string;
  planName?: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  amount: number;
  status: InvoiceStatus;
  paidAt?: string;
  paidAmount?: number;
  method?: InvoiceMethod;
  notes?: string;
  gatewayUrl?: string;
};

export const INVOICE_METHOD_LABEL: Record<InvoiceMethod, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : Number(v));

type PlanRow = { id: string; name: string; interval: PlanInterval; months: number; price: number | string | null; description: string | null; active: boolean };
type InvoiceRow = {
  id: string;
  account_id: string;
  plan_name: string | null;
  period_start: string;
  period_end: string;
  due_on: string;
  amount: number | string;
  status: InvoiceStatus;
  paid_at: string | null;
  paid_amount: number | string | null;
  method: InvoiceMethod | null;
  notes: string | null;
  gateway_url: string | null;
};

const mapPlan = (r: PlanRow): SubscriptionPlan => ({
  id: r.id,
  name: r.name,
  interval: r.interval,
  months: r.months,
  price: num(r.price),
  description: r.description ?? undefined,
  active: r.active,
});

const mapInvoice = (r: InvoiceRow): Invoice => ({
  id: r.id,
  accountId: r.account_id,
  planName: r.plan_name ?? undefined,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  dueOn: r.due_on,
  amount: Number(r.amount),
  status: r.status,
  paidAt: r.paid_at ?? undefined,
  paidAmount: num(r.paid_amount),
  method: r.method ?? undefined,
  notes: r.notes ?? undefined,
  gatewayUrl: r.gateway_url ?? undefined,
});

export const todayBrt = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export type AccountBillingView = {
  readOnly: boolean;
  overdueSince?: string;
  overdueDays: number;
  trialDaysLeft?: number;
  missingPrice: boolean;
};

// Mesma regra do banco (account_read_only), para mostrar na tela.
export function billingView(account: Account, invoices: Invoice[], plans: SubscriptionPlan[]): AccountBillingView {
  const today = todayBrt();
  const p = account.payment;
  const mine = invoices.filter((i) => i.accountId === account.id);
  const overdue = mine.filter((i) => i.status === "aberta" && i.dueOn < today).sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
  const paidAny = mine.some((i) => i.status === "paga");
  const trialEnd = p.trialEndsAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(p.trialEndsAt)) : undefined;
  const plan = plans.find((x) => x.id === p.planId);
  const readOnly =
    Boolean(p.canceledAt) ||
    Boolean(overdue && addDays(overdue.dueOn, p.graceDays) < today) ||
    Boolean(!p.planId && trialEnd && addDays(trialEnd, p.graceDays) < today && !paidAny);
  const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
  return {
    readOnly,
    overdueSince: overdue?.dueOn,
    overdueDays: overdue ? daysBetween(overdue.dueOn, today) : 0,
    trialDaysLeft: trialEnd && p.status === "trial" ? daysBetween(today, trialEnd) : undefined,
    missingPrice: Boolean(p.planId && p.customPrice === undefined && plan?.price === undefined),
  };
}

async function audit(accountId: string, label: string) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_events").insert({
    resource_type: "account",
    resource_id: accountId,
    label,
    actor_id: data.user?.id ?? null,
    actor_label: data.user?.email ?? "admin",
  });
}

export type SubscriptionPatch = {
  planId?: string | null;
  customPrice?: number | null;
  trialEndsAt?: string | null;
  subscriptionStartedAt?: string | null;
  graceDays?: number;
};

export function useBilling() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [plansRes, invoicesRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("months"),
      supabase.from("account_invoices").select("*").order("due_on", { ascending: false }).limit(2000),
    ]);
    if (plansRes.error || invoicesRes.error) {
      setError(plansRes.error?.message ?? invoicesRes.error?.message ?? "Erro ao carregar");
    } else {
      setPlans(((plansRes.data ?? []) as PlanRow[]).map(mapPlan));
      setInvoices(((invoicesRes.data ?? []) as InvoiceRow[]).map(mapInvoice));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (fn: () => Promise<{ error: { message: string } | null }>, after?: () => Promise<void>) => {
      const { error: e } = await fn();
      if (e) {
        setError(e.message);
        return false;
      }
      await after?.();
      await reload();
      return true;
    },
    [reload],
  );

  const savePlan = useCallback(
    (id: string, patch: { name?: string; price?: number | null; description?: string; active?: boolean }) =>
      run(async () =>
        supabase
          .from("subscription_plans")
          .update({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.price !== undefined ? { price: patch.price } : {}),
            ...(patch.description !== undefined ? { description: patch.description || null } : {}),
            ...(patch.active !== undefined ? { active: patch.active } : {}),
          })
          .eq("id", id),
      ),
    [run],
  );

  const saveSubscription = useCallback(
    (account: Account, patch: SubscriptionPatch, label: string) =>
      run(
        async () => {
          const row: Record<string, unknown> = {};
          if (patch.planId !== undefined) row.plan_id = patch.planId;
          if (patch.customPrice !== undefined) row.custom_price = patch.customPrice;
          if (patch.trialEndsAt !== undefined) row.trial_ends_at = patch.trialEndsAt;
          if (patch.subscriptionStartedAt !== undefined) row.subscription_started_at = patch.subscriptionStartedAt;
          if (patch.graceDays !== undefined) row.grace_days = patch.graceDays;
          return supabase.from("accounts").update(row).eq("id", account.id);
        },
        () => audit(account.id, label),
      ),
    [run],
  );

  const setCanceled = useCallback(
    (account: Account, canceled: boolean) =>
      run(
        async () => supabase.from("accounts").update({ canceled_at: canceled ? new Date().toISOString() : null }).eq("id", account.id),
        () => audit(account.id, canceled ? "Assinatura cancelada (modo leitura)" : "Assinatura reativada"),
      ),
    [run],
  );

  const payInvoice = useCallback(
    (invoice: Invoice, input: { paidOn: string; amount: number; method: InvoiceMethod; notes?: string }) =>
      run(
        async () =>
          supabase
            .from("account_invoices")
            .update({
              status: "paga",
              paid_at: new Date(`${input.paidOn}T12:00:00-03:00`).toISOString(),
              paid_amount: input.amount,
              method: input.method,
              notes: input.notes || invoice.notes || null,
            })
            .eq("id", invoice.id),
        () => audit(invoice.accountId, `Pagamento registrado: fatura de ${invoice.periodStart} (${INVOICE_METHOD_LABEL[input.method]})`),
      ),
    [run],
  );

  const cancelInvoice = useCallback(
    (invoice: Invoice) =>
      run(
        async () => supabase.from("account_invoices").update({ status: "cancelada" }).eq("id", invoice.id),
        () => audit(invoice.accountId, `Fatura de ${invoice.periodStart} cancelada`),
      ),
    [run],
  );

  const reopenInvoice = useCallback(
    (invoice: Invoice) =>
      run(
        async () =>
          supabase
            .from("account_invoices")
            .update({ status: "aberta", paid_at: null, paid_amount: null, method: null })
            .eq("id", invoice.id),
        () => audit(invoice.accountId, `Pagamento da fatura de ${invoice.periodStart} desfeito`),
      ),
    [run],
  );

  // Gera agora as faturas pendentes e recalcula todas as contas.
  const refreshAll = useCallback(() => run(async () => supabase.rpc("refresh_all_billing")), [run]);

  return { plans, invoices, loading, error, clearError: () => setError(null), reload, savePlan, saveSubscription, setCanceled, payInvoice, cancelInvoice, reopenInvoice, refreshAll };
}
