"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MailCheck, Send } from "lucide-react";
import { Field } from "./Field";
import { isValidEmail } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type Props = {
  onSubmit: (email: string) => Promise<void> | void;
  onBackToLogin: () => void;
};

export function MagicLinkForm({ onSubmit, onBackToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const error = !email
    ? "Informe seu email."
    : !isValidEmail(email)
      ? "Email inválido."
      : null;
  const isValid = !error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex h-full flex-col"
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
          Link enviado
        </p>
        <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">
          Verifique seu email.
        </h1>
        <p className="mt-4 text-[15px] leading-[1.65] text-ink-600">
          Enviamos um link de acesso para{" "}
          <strong className="text-ink-900">{email}</strong>. Basta clicar no link para entrar — ele
          expira em 15 minutos.
        </p>

        <div className="mt-6 rounded-card border border-ink-200 bg-ink-50/60 px-4 py-3 text-[12.5px] leading-[1.55] text-ink-600">
          Não recebeu? Verifique a caixa de spam ou tente novamente em alguns instantes.
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-10">
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
              setTouched(false);
            }}
            className="inline-flex h-12 w-full items-center justify-center rounded-btn border border-ink-200 text-[14px] font-semibold text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
          >
            Enviar para outro email
          </button>
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
            Voltar para o login
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex h-full flex-col"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Acesso por link
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
          Entre sem senha.
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
          Informe seu email e enviaremos um link seguro para acessar sua conta sem precisar digitar
          senha.
        </p>
      </div>

      <div className="mt-7">
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
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
          disabled={!isValid || submitting}
          whileHover={isValid && !submitting ? { scale: 1.005 } : {}}
          whileTap={isValid && !submitting ? { scale: 0.99 } : {}}
          className={cn(
            "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn text-[14px] font-semibold transition-all duration-300",
            isValid && !submitting
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
              Enviar link de acesso
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </>
          )}
        </motion.button>
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
          Voltar para login com senha
        </button>
      </div>

      <p className="mt-6 text-center text-[13px] text-ink-500">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-bold text-ink-900 underline decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand"
        >
          Cadastre-se
        </Link>
      </p>
    </motion.form>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
