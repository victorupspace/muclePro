"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [hydrating, setHydrating] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function hydrateSessionFromInvite() {
      setGlobalError(null);

      const url = new URL(window.location.href);
      const manualToken = url.searchParams.get("token");
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const authError = url.searchParams.get("error_description") ?? hash.get("error_description");

      if (authError) {
        setGlobalError(authError);
        setHydrating(false);
        return;
      }

      if (manualToken) {
        setSetupToken(manualToken);
        window.history.replaceState({}, document.title, "/definir-senha");
        setReady(true);
        setHydrating(false);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, document.title, "/definir-senha");

        if (!mounted) return;

        if (error) {
          setGlobalError("Link inválido ou expirado. Gere um novo link no backoffice.");
          setHydrating(false);
          return;
        }
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, document.title, "/definir-senha");

        if (!mounted) return;

        if (error) {
          setGlobalError("Link inválido ou expirado. Gere um novo link no backoffice.");
          setHydrating(false);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!data.session) {
        setGlobalError("Abra esta página pelo link gerado no backoffice.");
        setHydrating(false);
        return;
      }

      setReady(true);
      setHydrating(false);
    }

    void hydrateSessionFromInvite();

    return () => {
      mounted = false;
    };
  }, []);

  const passwordError =
    !password
      ? "Informe uma senha."
      : password.length < 8
        ? "Use pelo menos 8 caracteres."
        : null;

  const confirmError =
    !confirmPassword
      ? "Confirme sua senha."
      : confirmPassword !== password
        ? "As senhas não conferem."
        : null;

  const canSubmit = ready && !passwordError && !confirmError && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setGlobalError(null);

    if (!canSubmit) return;

    setSubmitting(true);

    if (setupToken) {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: setupToken, password }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        email?: string;
      } | null;

      if (!response.ok || !result?.email) {
        setSubmitting(false);
        setGlobalError(result?.error ?? "Não foi possível definir sua senha. Tente novamente.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });

      setSubmitting(false);

      if (signInError) {
        setGlobalError("Senha criada. Faça login com seu email e a nova senha.");
        router.replace("/login");
        return;
      }

      router.replace("/plataforma");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setGlobalError("Não foi possível definir sua senha. Tente novamente.");
      return;
    }

    router.replace("/plataforma");
  }

  return (
    <AuthShell mediaVariant="success">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex h-full flex-col"
      >
        <div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            {ready ? (
              <KeyRound className="h-5 w-5" strokeWidth={2.3} />
            ) : (
              <CheckCircle2 className="h-5 w-5" strokeWidth={2.3} />
            )}
          </span>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            Acesso aprovado
          </p>
          <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
            Defina sua senha.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
            Crie uma senha usando o link de acesso enviado pelo time musclePro.
          </p>
        </div>

        {globalError && (
          <div className="mt-6 flex items-start gap-3 rounded-card border border-danger-200 bg-danger-50/80 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" strokeWidth={2.2} />
            <p className="text-[13px] leading-[1.5] text-danger-700">{globalError}</p>
          </div>
        )}

        {hydrating ? (
          <div className="mt-7 rounded-card border border-ink-200 bg-white px-4 py-4 text-[13px] text-ink-500">
            Validando seu convite...
          </div>
        ) : (
          <div className="mt-7 space-y-3">
            <PasswordField
              label="Nova senha"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              error={touched ? passwordError : null}
              success={touched && !passwordError && password.length > 0}
            />
            <PasswordField
              label="Confirmar senha"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              error={touched ? confirmError : null}
              success={touched && !confirmError && confirmPassword.length > 0}
            />
          </div>
        )}

        <div className="mt-auto pt-10">
          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.005 } : {}}
            whileTap={canSubmit ? { scale: 0.99 } : {}}
            className={cn(
              "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn text-[14px] font-semibold transition-all duration-300",
              canSubmit
                ? "bg-brand text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-brand-hover"
                : "cursor-not-allowed bg-ink-100 text-ink-400",
            )}
          >
            {submitting ? "Salvando..." : "Criar senha e entrar"}
            {!submitting && (
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
            )}
          </motion.button>
        </div>
      </motion.form>
    </AuthShell>
  );
}
