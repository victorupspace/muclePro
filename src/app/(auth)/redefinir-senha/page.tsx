"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, LinkIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type Status = "checking" | "ready" | "invalid" | "done";

// O cliente do Supabase lê e limpa o hash da URL (#access_token=...&type=recovery)
// de forma assíncrona. Guardamos a URL de chegada no carregamento do módulo para
// saber, depois, se o usuário veio de um link de recuperação.
const ARRIVAL_URL = typeof window !== "undefined" ? window.location.href : "";
const RECOVERY_FLAG = "musclepro:password-recovery";

// O token_hash só pode ser usado uma vez; reaproveitamos a mesma promessa caso o
// efeito rode duas vezes (React Strict Mode em desenvolvimento).
let tokenHashVerification: Promise<boolean> | null = null;

export default function RedefinirSenhaPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryFlag(true);
        setAccountEmail(session.user.email ?? null);
        setStatus("ready");
      }
    });

    async function validateRecoveryLink() {
      const params = readUrlParams(ARRIVAL_URL || window.location.href);

      if (params.get("error") || params.get("error_code") || params.get("error_description")) {
        window.history.replaceState({}, document.title, "/redefinir-senha");
        setRecoveryFlag(false);
        if (mounted) setStatus("invalid");
        return;
      }

      // Template de email customizado com token_hash (?token_hash=...&type=recovery).
      const tokenHash = params.get("token_hash");
      if (tokenHash && params.get("type") === "recovery") {
        tokenHashVerification ??= supabase.auth
          .verifyOtp({ token_hash: tokenHash, type: "recovery" })
          .then(({ error }) => !error)
          .catch(() => false);
        const verified = await tokenHashVerification;
        window.history.replaceState({}, document.title, "/redefinir-senha");
        if (!mounted) return;
        if (!verified) {
          setStatus("invalid");
          return;
        }
        setRecoveryFlag(true);
      }

      const cameFromRecoveryLink =
        params.get("type") === "recovery" && !!params.get("access_token");

      // getSession() espera o cliente terminar de processar o hash da URL.
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      if (session && (cameFromRecoveryLink || getRecoveryFlag())) {
        setRecoveryFlag(true);
        setAccountEmail(session.user.email ?? null);
        setStatus("ready");
        return;
      }

      setStatus((current) => (current === "checking" ? "invalid" : current));
    }

    void validateRecoveryLink();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const passwordError = !password
    ? "Informe uma senha."
    : password.length < 8
      ? "Use pelo menos 8 caracteres."
      : null;

  const confirmError = !confirmPassword
    ? "Confirme sua senha."
    : confirmPassword !== password
      ? "As senhas não conferem."
      : null;

  const canSubmit = status === "ready" && !passwordError && !confirmError && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setGlobalError(null);
    if (!canSubmit) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        const code = error.code ?? "";
        const message = (error.message ?? "").toLowerCase();

        if (code === "same_password" || message.includes("different from the old")) {
          setGlobalError("A nova senha precisa ser diferente da anterior.");
        } else if (code === "weak_password") {
          setGlobalError("Essa senha é muito fraca. Misture letras, números e símbolos.");
        } else if (
          error.status === 401 ||
          error.status === 403 ||
          code === "session_not_found" ||
          code === "session_expired" ||
          message.includes("session missing")
        ) {
          setRecoveryFlag(false);
          setStatus("invalid");
        } else {
          setGlobalError("Não foi possível salvar sua senha. Tente novamente.");
        }
        return;
      }

      setRecoveryFlag(false);
      // Encerramos a sessão aberta pelo link para que o próximo acesso seja
      // feito com a nova senha.
      await supabase.auth.signOut().catch(() => undefined);
      setStatus("done");
    } catch {
      setGlobalError("Não foi possível salvar agora. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mediaVariant="login">
      {status === "invalid" ? (
        <InvalidState />
      ) : status === "done" ? (
        <DoneState />
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex h-full flex-col"
          noValidate
        >
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
              <KeyRound className="h-5 w-5" strokeWidth={2.3} />
            </span>

            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Redefinir senha
            </p>
            <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
              Crie uma nova senha.
            </h1>
            <p className="mt-3 break-words text-[14px] leading-[1.6] text-ink-500">
              {accountEmail ? (
                <>
                  Nova senha para <strong className="text-ink-900">{accountEmail}</strong>. Use
                  pelo menos 8 caracteres.
                </>
              ) : (
                "Use pelo menos 8 caracteres. Depois, é só entrar com a nova senha."
              )}
            </p>
          </div>

          {globalError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-card border border-danger-200 bg-danger-50/80 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" strokeWidth={2.2} />
              <p className="text-[13px] leading-[1.5] text-danger-700">{globalError}</p>
            </motion.div>
          )}

          {status === "checking" ? (
            <div className="mt-7 rounded-card border border-ink-200 bg-white px-4 py-4 text-[13px] text-ink-500">
              Validando seu link...
            </div>
          ) : (
            <div className="mt-7 space-y-3">
              <PasswordField
                label="Nova senha"
                autoComplete="new-password"
                autoFocus
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

          <div className="mt-auto space-y-3 pt-10">
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
              {submitting ? "Salvando..." : "Salvar nova senha"}
              {!submitting && (
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
              )}
            </motion.button>
            <BackToLogin />
          </div>
        </motion.form>
      )}
    </AuthShell>
  );
}

function InvalidState() {
  return (
    <motion.div
      key="invalid"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex h-full flex-col"
      role="status"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-500">
        <LinkIcon className="h-5 w-5" strokeWidth={2.3} />
      </span>

      <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-danger-700">
        Link inválido
      </p>
      <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">
        Este link não funciona mais.
      </h1>
      <p className="mt-4 text-[15px] leading-[1.65] text-ink-600">
        O link para redefinir a senha expirou, já foi usado ou está incompleto. Peça um novo link e
        abra o email mais recente.
      </p>

      <div className="mt-6 rounded-card border border-ink-200 bg-ink-50/60 px-4 py-3 text-[12.5px] leading-[1.55] text-ink-600">
        Cada link vale por tempo limitado e só pode ser usado uma vez. Abra-o no mesmo navegador em
        que vai criar a nova senha.
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Link
          href="/recuperar-senha"
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-brand text-[14px] font-semibold text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:bg-brand-hover"
        >
          Pedir novo link
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
        </Link>
        <BackToLogin />
      </div>
    </motion.div>
  );
}

function DoneState() {
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex h-full flex-col"
      role="status"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
        className="relative inline-flex h-16 w-16 items-center justify-center"
      >
        <span className="absolute inset-0 rounded-full bg-success-500/10" />
        <span className="absolute inset-2 rounded-full bg-success-500/20" />
        <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-500 text-white shadow-[0_10px_24px_-8px_rgba(0,178,104,0.6)]">
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
        </span>
      </motion.div>

      <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-success-700">
        Senha atualizada
      </p>
      <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">
        Pronto, senha alterada.
      </h1>
      <p className="mt-4 text-[15px] leading-[1.65] text-ink-600">
        Por segurança, encerramos a sessão aberta pelo link. Entre com seu email e a nova senha.
      </p>

      <div className="mt-auto pt-10">
        <Link
          href="/login"
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-brand text-[14px] font-semibold text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:bg-brand-hover"
        >
          Entrar com a nova senha
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
        </Link>
      </div>
    </motion.div>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="inline-flex h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
      Voltar para o login
    </Link>
  );
}

function readUrlParams(href: string) {
  const params = new URLSearchParams();
  try {
    const url = new URL(href);
    url.searchParams.forEach((value, key) => params.set(key, value));
    new URLSearchParams(url.hash.replace(/^#/, "")).forEach((value, key) => params.set(key, value));
  } catch {
    // URL inválida: segue sem parâmetros.
  }
  return params;
}

// Marca a aba como "em recuperação" para que um recarregamento da página (depois
// que o hash já foi limpo) não seja tratado como link inválido.
function setRecoveryFlag(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(RECOVERY_FLAG, "1");
    else window.sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {
    // Armazenamento indisponível (aba privada, etc.): ignoramos.
  }
}

function getRecoveryFlag() {
  try {
    return window.sessionStorage.getItem(RECOVERY_FLAG) === "1";
  } catch {
    return false;
  }
}
