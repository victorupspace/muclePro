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
import type { AccountProfile, BusinessType, DocumentType, Permissions } from "./types";

type Status = "checking" | "authenticated" | "blocked" | "unauthenticated";

type Ctx = {
  status: Status;
  profile: AccountProfile | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

const OWNER_PERMISSIONS: Permissions = {
  canRegisterStudents: true,
  canSendPaymentLinks: true,
  canCreateWorkouts: true,
  canManageTeam: true,
  canManageCompany: true,
};

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
  full_name: string;
  email: string | null;
  can_register_students: boolean;
  can_send_payment_links: boolean;
  can_create_workouts: boolean;
  role: string;
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
    .select("id, account_id, full_name, email, can_register_students, can_send_payment_links, can_create_workouts, role")
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

  const isManager = staff.role === "gestao";
  return mapProfile(account as AccountRow, userId, {
    isOwner: false,
    staffId: staff.id,
    fullName: staff.full_name,
    email: staff.email ?? undefined,
    permissions: {
      canRegisterStudents: isManager || staff.can_register_students,
      canSendPaymentLinks: isManager || staff.can_send_payment_links,
      canCreateWorkouts: isManager || staff.can_create_workouts,
      canManageTeam: isManager,
      canManageCompany: false,
    },
  });
}

function mapProfile(
  row: AccountRow,
  authUserId: string,
  extra: { isOwner: boolean; staffId?: string; fullName?: string; email?: string; permissions: Permissions },
): AccountProfile {
  return {
    id: row.id,
    authUserId,
    isOwner: extra.isOwner,
    staffId: extra.staffId,
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
    const next = await loadProfile(data.user.id);
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

      const next = await loadProfile(data.user.id);
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
