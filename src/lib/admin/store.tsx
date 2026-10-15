"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Account,
  AccountStatus,
  BusinessType,
  DocumentKind,
  HistoryEvent,
  LandingLead,
  LeadStatus,
  PaymentStatus,
} from "./types";

type AccountRow = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  document_type: DocumentKind;
  document: string;
  company_name: string | null;
  business_type: BusinessType | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  units_range: string | null;
  active_students_range: string | null;
  status: AccountStatus;
  active: boolean;
  approved_at: string | null;
  payment_status: PaymentStatus;
  payment_plan: string | null;
  payment_monthly_amount: number | null;
  payment_next_due_at: string | null;
  payment_last_paid_at: string | null;
};

type LandingLeadRow = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  business_type: BusinessType;
  units_range: string | null;
  active_students_range: string | null;
  status: LeadStatus;
  handled_at: string | null;
};

type AuditEventRow = {
  id: string;
  created_at: string;
  resource_type: "account" | "hero_form_submission";
  resource_id: string;
  label: string;
  actor_label: string | null;
};

type Ctx = {
  accounts: Account[];
  landingLeads: LandingLead[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approve: (id: string) => Promise<{ setupLink: string } | null>;
  generatePasswordLink: (id: string) => Promise<{ setupLink: string } | null>;
  toggleActive: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setPaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  markPaid: (id: string) => Promise<void>;
  setLandingLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  removeLandingLead: (id: string) => Promise<void>;
};

const AdminStoreCtx = createContext<Ctx | null>(null);

function groupEvents(events: AuditEventRow[]) {
  return events.reduce<Record<string, HistoryEvent[]>>((acc, row) => {
    const key = `${row.resource_type}:${row.resource_id}`;
    acc[key] ??= [];
    acc[key].push({
      id: row.id,
      at: row.created_at,
      label: row.label,
      by: row.actor_label ?? undefined,
    });
    return acc;
  }, {});
}

function sortedHistory(history: HistoryEvent[]) {
  return [...history].sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

function mapAccount(row: AccountRow, eventsByResource: Record<string, HistoryEvent[]>): Account {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    documentKind: row.document_type,
    document: row.document,
    companyName: row.company_name ?? undefined,
    businessType: row.business_type ?? undefined,
    address: row.address ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    unitsRange: row.units_range ?? undefined,
    activeStudentsRange: row.active_students_range ?? undefined,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    status: row.status,
    active: row.active,
    payment: {
      status: row.payment_status,
      plan: row.payment_plan ?? undefined,
      monthlyAmount: row.payment_monthly_amount ?? undefined,
      nextDueAt: row.payment_next_due_at ?? undefined,
      lastPaidAt: row.payment_last_paid_at ?? undefined,
    },
    history: sortedHistory([
      ...(eventsByResource[`account:${row.id}`] ?? []),
      { id: `${row.id}:created`, at: row.created_at, label: "Cadastro recebido" },
    ]),
  };
}

function mapLandingLead(
  row: LandingLeadRow,
  eventsByResource: Record<string, HistoryEvent[]>,
): LandingLead {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    businessType: row.business_type,
    unitsRange: row.units_range ?? undefined,
    activeStudentsRange: row.active_students_range ?? undefined,
    requestedAt: row.created_at,
    status: row.status,
    handledAt: row.handled_at ?? undefined,
    history: sortedHistory([
      ...(eventsByResource[`hero_form_submission:${row.id}`] ?? []),
      { id: `${row.id}:created`, at: row.created_at, label: "Lead recebido" },
    ]),
  };
}

async function getActor() {
  const { data } = await supabase.auth.getUser();
  return {
    actor_id: data.user?.id ?? null,
    actor_label: data.user?.email ?? "admin",
  };
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [landingLeads, setLandingLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [accountsResult, landingLeadsResult, eventsResult] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("hero_form_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_events").select("*").order("created_at", { ascending: false }),
    ]);

    if (accountsResult.error || landingLeadsResult.error || eventsResult.error) {
      setError(
        accountsResult.error?.message ??
          landingLeadsResult.error?.message ??
          eventsResult.error?.message ??
          "Não foi possível carregar o backoffice.",
      );
      setAccounts([]);
      setLandingLeads([]);
      setLoading(false);
      return;
    }

    const eventsByResource = groupEvents((eventsResult.data ?? []) as AuditEventRow[]);
    setAccounts(((accountsResult.data ?? []) as AccountRow[]).map((row) => mapAccount(row, eventsByResource)));
    setLandingLeads(
      ((landingLeadsResult.data ?? []) as LandingLeadRow[]).map((row) => mapLandingLead(row, eventsByResource)),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refresh();
      }
      if (event === "SIGNED_OUT") {
        setAccounts([]);
        setLandingLeads([]);
        setError(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [refresh]);

  const recordEvent = useCallback(
    async (resourceType: AuditEventRow["resource_type"], resourceId: string, label: string) => {
      const actor = await getActor();
      const { error: eventError } = await supabase.from("audit_events").insert({
        resource_type: resourceType,
        resource_id: resourceId,
        label,
        ...actor,
      });
      if (eventError) throw eventError;
    },
    [],
  );

  const approve = useCallback(
    async (id: string) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("Sessão admin expirada. Faça login novamente.");
        return null;
      }

      const response = await fetch(`/api/internal-musclepro-admin/accounts/${id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        setupLink?: string;
      } | null;

      if (!response.ok) {
        setError(result?.error ?? "Não foi possível aprovar a conta.");
        return null;
      }

      await refresh();
      return result?.setupLink ? { setupLink: result.setupLink } : null;
    },
    [refresh],
  );

  const generatePasswordLink = useCallback(
    async (id: string) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("Sessão admin expirada. Faça login novamente.");
        return null;
      }

      const response = await fetch(`/api/internal-musclepro-admin/accounts/${id}/password-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        setupLink?: string;
      } | null;

      if (!response.ok) {
        setError(result?.error ?? "Não foi possível gerar o link de senha.");
        return null;
      }

      await refresh();
      return result?.setupLink ? { setupLink: result.setupLink } : null;
    },
    [refresh],
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const current = accounts.find((a) => a.id === id);
      if (!current) return;
      const nextActive = !current.active;
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ active: nextActive })
        .eq("id", id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await recordEvent("account", id, nextActive ? "Conta ativada" : "Conta desativada");
      await refresh();
    },
    [accounts, recordEvent, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("accounts").delete().eq("id", id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const setPaymentStatus = useCallback(
    async (id: string, status: PaymentStatus) => {
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ payment_status: status })
        .eq("id", id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await recordEvent("account", id, `Pagamento atualizado para "${status}"`);
      await refresh();
    },
    [recordEvent, refresh],
  );

  const markPaid = useCallback(
    async (id: string) => {
      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          payment_status: "em_dia",
          payment_last_paid_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await recordEvent("account", id, "Pagamento marcado como em dia");
      await refresh();
    },
    [recordEvent, refresh],
  );

  const setLandingLeadStatus = useCallback(
    async (id: string, status: LeadStatus) => {
      const { error: updateError } = await supabase
        .from("hero_form_submissions")
        .update({
          status,
          handled_at: status === "aguardando" ? null : new Date().toISOString(),
        })
        .eq("id", id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await recordEvent("hero_form_submission", id, `Status alterado para "${status}"`);
      await refresh();
    },
    [recordEvent, refresh],
  );

  const removeLandingLead = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("hero_form_submissions").delete().eq("id", id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<Ctx>(
    () => ({
      accounts,
      landingLeads,
      loading,
      error,
      refresh,
      approve,
      generatePasswordLink,
      toggleActive,
      remove,
      setPaymentStatus,
      markPaid,
      setLandingLeadStatus,
      removeLandingLead,
    }),
    [
      accounts,
      landingLeads,
      loading,
      error,
      refresh,
      approve,
      generatePasswordLink,
      toggleActive,
      remove,
      setPaymentStatus,
      markPaid,
      setLandingLeadStatus,
      removeLandingLead,
    ],
  );

  return <AdminStoreCtx.Provider value={value}>{children}</AdminStoreCtx.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreCtx);
  if (!ctx) throw new Error("useAdminStore deve ser usado dentro de AdminStoreProvider");
  return ctx;
}
