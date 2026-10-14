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
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { clearSessionTimeout, useSessionTimeout } from "@/lib/session-timeout";

type AdminProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "operador";
  active: boolean;
};

type Session = {
  userId: string;
  username: string;
  email: string;
  role: AdminProfile["role"];
  startedAt: string;
};

type Ctx = {
  session: Session | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => Promise<void>;
};

const AdminAuthCtx = createContext<Ctx | null>(null);

async function loadAdminSession(user: User | null): Promise<Session | null> {
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("user_id,email,full_name,role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data as AdminProfile;
  return {
    userId: profile.user_id,
    username: profile.full_name || profile.email,
    email: profile.email,
    role: profile.role,
    startedAt: user.last_sign_in_at ?? new Date().toISOString(),
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const expireSession = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const next = await loadAdminSession(data.session?.user ?? null);
      if (!mounted) return;
      setSession(next);
      setHydrated(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadAdminSession(nextSession?.user ?? null).then((next) => {
        if (!mounted) return;
        setSession(next);
        setHydrated(true);
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false as const, reason: "Credenciais inválidas." };
    }

    const next = await loadAdminSession(data.user);
    if (!next) {
      await supabase.auth.signOut();
      setSession(null);
      return { ok: false as const, reason: "Usuário sem permissão de acesso ao backoffice." };
    }

    setSession(next);
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    clearSessionTimeout("admin", session?.userId);
    setSession(null);
    await supabase.auth.signOut();
  }, [session?.userId]);

  useSessionTimeout({
    scope: "admin",
    userId: session?.userId,
    startedAt: session?.startedAt,
    enabled: !!session,
    onExpire: expireSession,
  });

  const value = useMemo<Ctx>(() => ({ session, hydrated, signIn, signOut }), [session, hydrated, signIn, signOut]);

  return <AdminAuthCtx.Provider value={value}>{children}</AdminAuthCtx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) throw new Error("useAdminAuth deve ser usado dentro de AdminAuthProvider");
  return ctx;
}
