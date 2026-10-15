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
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { clearSessionTimeout, useSessionTimeout } from "@/lib/session-timeout";
import type { AccountBilling, AccountProfile, BusinessType, DocumentType, Permissions, StaffRole } from "./types";

type Status = "checking" | "authenticated" | "blocked" | "unauthenticated";

type Ctx = {
  status: Status;
  profile: AccountProfile | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

const OWNER_PERMISSIONS: Permissions = {
  isManager: true,
  canRegisterStudents: true,
  canSendPaymentLinks: true,
  canCreateWorkouts: true,
  canManageTeam: true,
  canManagePlans: true,
  canManageUnits: true,
  canDeleteRecords: true,
  canManageCompany: true,
  canViewReports: true,
  readOnly: false,
};

// Modo leitura: mantém o que dá para ver, tira tudo o que grava.
function readOnlyPermissions(p: Permissions): Permissions {
  return {
    ...p,
    canRegisterStudents: false,
    canSendPaymentLinks: false,
    canCreateWorkouts: false,
    canManageTeam: false,
    canManagePlans: false,
    canManageUnits: false,
    canDeleteRecords: false,
    canManageCompany: false,
    readOnly: true,
  };
}

type BillingRaw = Record<string, unknown> | null;

async function loadBilling(): Promise<AccountBilling | undefined> {
  const { data, error } = await supabase.rpc("current_account_billing");
  if (error || !data) return undefined;
  const r = data as NonNullable<BillingRaw>;
  const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
  const str = (v: unknown) => (v === null || v === undefined ? undefined : String(v));
  return {
    status: (r.status as AccountBilling["status"]) ?? "trial",
    readOnly: Boolean(r.readOnly),
    trialEndsAt: str(r.trialEndsAt),
    graceDays: Number(r.graceDays ?? 5),
    planName: str(r.planName),
    planMonths: num(r.planMonths),
    price: num(r.price),
    nextDueOn: str(r.nextDueOn)?.slice(0, 10),
    overdueSince: str(r.overdueSince),
    canceledAt: str(r.canceledAt),
    invoices: ((r.invoices as Record<string, unknown>[]) ?? []).map((i) => ({
      id: String(i.id),
      planName: str(i.planName),
      periodStart: String(i.periodStart),
      periodEnd: String(i.periodEnd),
      dueOn: String(i.dueOn),
      amount: Number(i.amount),
      status: i.status as AccountBilling["invoices"][number]["status"],
      paidAt: str(i.paidAt),
      gatewayUrl: str(i.gatewayUrl),
    })),
  };
}

async function withBilling(profile: AccountProfile | null): Promise<AccountProfile | null> {
  if (!profile) return null;
  const billing = await loadBilling();
  return {
    ...profile,
    billing,
    permissions: billing?.readOnly ? readOnlyPermissions(profile.permissions) : profile.permissions,
  };
}

function staffPermissions(staff: StaffRow): Permissions {
  const isManager = staff.role === "gestao";
  return {
    isManager,
    canRegisterStudents: isManager || staff.can_register_students,
    canSendPaymentLinks: isManager || staff.can_send_payment_links,
    canCreateWorkouts: isManager || staff.can_create_workouts,
    canManageTeam: isManager,
    canManagePlans: isManager,
    canManageUnits: isManager,
    canDeleteRecords: isManager,
    canManageCompany: false,
    canViewReports: isManager || staff.role === "contabilidade",
    readOnly: false,
  };
}

type AccountRow = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  business_type: BusinessType | null;
  document_type: DocumentType | null;
  document: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  payment_status: string | null;
  payment_plan: string | null;
  payment_next_due_at: string | null;
};

type StaffRow = {
  id: string;
  account_id: string;
  unit_id: string | null;
  full_name: string;
  email: string | null;
  can_register_students: boolean;
  can_send_payment_links: boolean;
  can_create_workouts: boolean;
  role: StaffRole;
  role_label: string | null;
};

const ACCOUNT_COLUMNS =
  "id, auth_user_id, full_name, email, phone, company_name, business_type, document_type, document, address, contact_phone, contact_email, payment_status, payment_plan, payment_next_due_at";

// Resolve o perfil: dono da conta (accounts.auth_user_id) ou, se não for,
// funcionário com login (staff.auth_user_id) herdando as alçadas do cadastro.
async function loadProfile(userId: string): Promise<AccountProfile | null> {
  const { data: owned } = await supabase
    .from("accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (owned) {
    return mapProfile(owned as AccountRow, userId, { isOwner: true, permissions: OWNER_PERMISSIONS });
  }

  const { data: member } = await supabase
    .from("staff")
    .select("id, account_id, unit_id, full_name, email, can_register_students, can_send_payment_links, can_create_workouts, role, role_label")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (!member) return null;
  const staff = member as StaffRow;

  const { data: account } = await supabase
    .from("accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("id", staff.account_id)
    .maybeSingle();

  if (!account) return null;

  const permissions = staffPermissions(staff);
  return mapProfile(account as AccountRow, userId, {
    isOwner: false,
    staffId: staff.id,
    staffRole: staff.role,
    staffRoleLabel: staff.role_label ?? undefined,
    unitScopeId: permissions.isManager ? undefined : staff.unit_id ?? undefined,
    fullName: staff.full_name,
    email: staff.email ?? undefined,
    permissions,
  });
}

function mapProfile(
  row: AccountRow,
  authUserId: string,
  extra: {
    isOwner: boolean;
    staffId?: string;
    staffRole?: StaffRole;
    staffRoleLabel?: string;
    unitScopeId?: string;
    fullName?: string;
    email?: string;
    permissions: Permissions;
  },
): AccountProfile {
  return {
    id: row.id,
    authUserId,
    isOwner: extra.isOwner,
    staffId: extra.staffId,
    staffRole: extra.staffRole,
    staffRoleLabel: extra.staffRoleLabel,
    unitScopeId: extra.unitScopeId,
    permissions: extra.permissions,
    fullName: extra.fullName ?? row.full_name,
    email: extra.email ?? row.email,
    phone: row.phone ?? undefined,
    companyName: row.company_name ?? undefined,
    businessType: row.business_type ?? undefined,
    documentType: row.document_type ?? undefined,
    document: row.document ?? undefined,
    address: row.address ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    paymentPlan: row.payment_plan ?? undefined,
    paymentNextDueAt: row.payment_next_due_at ?? undefined,
  };
}

export function AccountSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  const expireSession = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSessionStartedAt(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const next = await withBilling(await loadProfile(data.user.id));
    if (next) setProfile(next);
  }, []);

  useEffect(() => {
    let mounted = true;

    // getUser() valida a sessão no servidor (getSession confia só no storage).
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;

      if (!data.user) {
        setStatus("unauthenticated");
        setProfile(null);
        setSessionStartedAt(null);
        router.replace("/login");
        return;
      }

      const next = await withBilling(await loadProfile(data.user.id));
      if (!mounted) return;

      if (!next) {
        await supabase.auth.signOut();
        setProfile(null);
        setSessionStartedAt(null);
        setStatus("blocked");
        return;
      }

      setSessionStartedAt(data.user.last_sign_in_at ?? null);
      setProfile(next);
      setStatus("authenticated");
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  useSessionTimeout({
    scope: "platform",
    userId: profile?.authUserId,
    startedAt: sessionStartedAt,
    enabled: status === "authenticated",
    onExpire: expireSession,
  });

  const signOut = useCallback(async () => {
    clearSessionTimeout("platform", profile?.authUserId);
    await supabase.auth.signOut();
    setProfile(null);
    setSessionStartedAt(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [profile?.authUserId, router]);

  const value = useMemo(
    () => ({ status, profile, signOut, refreshProfile }),
    [status, profile, signOut, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAccountSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAccountSession must be used inside AccountSessionProvider");
  return ctx;
}
