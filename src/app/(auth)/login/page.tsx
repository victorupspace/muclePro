"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm, type LoginPayload } from "@/components/auth/LoginForm";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { supabase } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lockedUntil] = useState<number | null>(null);

  async function handleLogin(data: LoginPayload) {
    setGlobalError(null);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setGlobalError("Email ou senha inválidos.");
      return;
    }

    // Dono da conta ou funcionário com acesso ativo (a função resolve os dois).
    const { data: accountId, error: accountError } = await supabase.rpc("current_platform_account_id");

    if (accountError || !accountId) {
      await supabase.auth.signOut();
      setGlobalError("Seu acesso ainda não foi liberado ou está desativado.");
      return;
    }

    router.push("/dashboard");
  }

  async function handleMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      throw error;
    }
  }

  return (
    <AuthShell
      mediaVariant={mode === "magic" ? "magic" : "login"}
      footerSlot={<LoginFooter />}
    >
      <AnimatePresence mode="wait">
        {mode === "password" ? (
          <LoginForm
            key="password"
            onSubmit={handleLogin}
            onRequestMagicLink={() => {
              setGlobalError(null);
              setMode("magic");
            }}
            globalError={globalError}
            lockedUntil={lockedUntil}
          />
        ) : (
          <MagicLinkForm
            key="magic"
            onSubmit={handleMagicLink}
            onBackToLogin={() => setMode("password")}
          />
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

function LoginFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 pt-4 text-[11px] font-medium text-ink-500">
      <span className="inline-flex items-center gap-1.5">
        <Lock className="h-3 w-3 text-success-600" strokeWidth={2.4} />
        Conexão segura
      </span>
      <div className="flex items-center gap-4">
        <Link href="/termos" className="transition-colors hover:text-ink-900">
          Termos
        </Link>
        <Link href="/privacidade" className="transition-colors hover:text-ink-900">
          Privacidade
        </Link>
        <Link href="/#contact" className="transition-colors hover:text-ink-900">
          Suporte
        </Link>
      </div>
    </div>
  );
}
