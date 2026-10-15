"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, MailCheck, Send } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { isValidEmail } from "@/lib/cadastro/masks";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const error = !email
    ? "Informe seu email."
    : !isValidEmail(email)
      ? "Email inválido."
      : null;
  const isValid = !error;
  const canSubmit = isValid && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setGlobalError(null);
    if (!canSubmit) return;

    const normalized = email.trim().toLowerCase();
    setSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (resetError) {
        if (isRateLimit(resetError)) {
          setGlobalError(rateLimitMessage(resetError.message));
          return;
        }
        // Qualquer outro erro do Auth não pode revelar se o email existe:
        // seguimos para o mesmo estado neutro de sucesso.
      }

      setSentTo(normalized);
    } catch {
      setGlobalError("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mediaVariant="login">
      {sentTo ? (
        <SentState
          email={sentTo}
          onRetry={() => {
            setSentTo(null);
            setEmail("");
            setTouched(false);
            setGlobalError(null);
          }}
        />
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Recuperar acesso
            </p>
            <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
              Esqueceu sua senha?
            </h1>
            <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
              Informe o email da sua conta. Vamos enviar um link para você criar uma nova senha.
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

          <div className="mt-7">
            <Field
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              error={touched ? error : null}
              success={touched && !error && email.length > 0}
            />
          </div>

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
              {submitting ? (
                <>
                  <Spinner /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" strokeWidth={2.2} />
                  Enviar link
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
                </>
              )}
            </motion.button>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
              Voltar para o login
            </Link>
          </div>
        </motion.form>
      )}
    </AuthShell>
  );
}

function SentState({ email, onRetry }: { email: string; onRetry: () => void }) {
  return (
    <motion.div
      key="sent"
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
        <span className="absolute inset-0 rounded-full bg-brand/10" />
        <span className="absolute inset-2 rounded-full bg-brand/20" />
        <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgb(var(--color-brand)/0.6)]">
          <MailCheck className="h-5 w-5" strokeWidth={2.4} />
        </span>
      </motion.div>

      <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        Pedido recebido
      </p>
      <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">
        Verifique seu email.
      </h1>
      <p className="mt-4 break-words text-[15px] leading-[1.65] text-ink-600">
        Se existir uma conta com o email <strong className="text-ink-900">{email}</strong>, enviamos
        um link para você criar uma nova senha. O link vale por tempo limitado.
      </p>

      <div className="mt-6 rounded-card border border-ink-200 bg-ink-50/60 px-4 py-3 text-[12.5px] leading-[1.55] text-ink-600">
        Não recebeu em alguns minutos? Verifique a caixa de spam e confira se digitou o email
        certo.
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-12 w-full items-center justify-center rounded-btn border border-ink-200 text-[14px] font-semibold text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          Tentar outro email
        </button>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
          Voltar para o login
        </Link>
      </div>
    </motion.div>
  );
}

type AuthErrorLike = { status?: number; code?: string; message?: string };

function isRateLimit(error: AuthErrorLike) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("security purposes")
  );
}

function rateLimitMessage(message?: string) {
  // Ex.: "For security purposes, you can only request this after 42 seconds."
  const seconds = Number(message?.match(/after (\d+) second/i)?.[1]);
  if (Number.isFinite(seconds) && seconds > 0) {
    return `Você pediu um link há pouco. Aguarde ${seconds} segundos e tente de novo.`;
  }
  return "Muitos pedidos em sequência. Aguarde alguns minutos e tente de novo.";
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
