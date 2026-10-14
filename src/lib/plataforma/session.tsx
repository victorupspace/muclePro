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
import type { ConsultorProfile } from "./types";

type Status = "checking" | "authenticated" | "blocked" | "unauthenticated";

type Ctx = {
  status: Status;
  profile: ConsultorProfile | null;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function ConsultorSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [profile, setProfile] = useState<ConsultorProfile | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  const expireSession = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSessionStartedAt(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      if (!data.session) {
        setStatus("unauthenticated");
        setProfile(null);
        setSessionStartedAt(null);
        router.replace("/login");
        return;
      }

      const { data: account, error } = await supabase
        .from("accounts")
        .select(
          "id, full_name, email, company_name, auth_user_id, payment_status, payment_plan, payment_next_due_at",
        )
        .eq("auth_user_id", data.session.user.id)
        .eq("status", "criada")
        .eq("active", true)
        .maybeSingle();

      if (!mounted) return;

      if (error || !account) {
        await supabase.auth.signOut();
        setProfile(null);
        setSessionStartedAt(null);
        setStatus("blocked");
        return;
      }

      const { error: profileError } = await supabase.from("users").upsert(
        {
          auth_user_id: data.session.user.id,
          account_id: account.id,
          full_name: account.full_name,
          email: account.email,
          company_name: account.company_name,
          role: "owner",
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" },
      );

      if (profileError) {
        await supabase.auth.signOut();
        setProfile(null);
        setSessionStartedAt(null);
        setStatus("blocked");
        return;
      }

      setSessionStartedAt(data.session.user.last_sign_in_at ?? null);
      setProfile({
        id: account.id,
        authUserId: account.auth_user_id,
        fullName: account.full_name,
        email: account.email,
        companyName: account.company_name ?? undefined,
        paymentStatus: account.payment_status ?? undefined,
        paymentPlan: account.payment_plan ?? undefined,
        paymentNextDueAt: account.payment_next_due_at ?? undefined,
      });
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

  const value = useMemo(() => ({ status, profile, signOut }), [status, profile, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useConsultorSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useConsultorSession must be used inside ConsultorSessionProvider");
  return ctx;
}
