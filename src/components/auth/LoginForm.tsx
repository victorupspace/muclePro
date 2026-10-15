"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Field } from "./Field";
import { PasswordField } from "./PasswordField";
import { isValidEmail } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type Props = {
  onSubmit: (data: LoginPayload) => Promise<void> | void;
  onRequestMagicLink: () => void;
  globalError?: string | null;
  lockedUntil?: number | null;
};

export function LoginForm({ onSubmit, onRequestMagicLink, globalError, lockedUntil }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);

  const emailError = !email
    ? "Informe seu email."
    : !isValidEmail(email)
      ? "Email inválido."
      : null;
  const passwordError = !password ? "Informe sua senha." : null;
  const isValid = !emailError && !passwordError;

  const isLocked = lockedUntil && lockedUntil > Date.now();
  const lockSeconds = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 1000) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid || isLocked) return;
    setSubmitting(true);
    try {
      await onSubmit({ email, password, rememberMe: remember });
    } finally {
      setSubmitting(false);
    }
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
          Acesso à plataforma
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
          Acesse sua conta
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
          Entre com suas credenciais para acompanhar alunos, cobranças e equipe do seu estabelecimento.
        </p>
      </div>

      {globalError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-start gap-3 rounded-card border border-danger-200 bg-danger-50/80 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" strokeWidth={2.2} />
          <p className="text-[13px] leading-[1.5] text-danger-700">{globalError}</p>
        </motion.div>
      )}

      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-start gap-3 rounded-card border border-warning-200 bg-warning-50/80 px-4 py-3"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" strokeWidth={2.2} />
          <p className="text-[13px] leading-[1.5] text-warning-800">
            Muitas tentativas. Tente novamente em <strong>{lockSeconds}s</strong>.
          </p>
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
        }}
        className="mt-7 space-y-3"
      >
        <Stagger>
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={touched.email ? emailError : null}
            success={touched.email && !emailError && email.length > 0}
          />
        </Stagger>

        <Stagger>
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={touched.password ? passwordError : null}
            success={touched.password && !passwordError && password.length > 0}
          />
        </Stagger>

        <Stagger>
          <div className="flex items-center justify-between pt-1">
            <label className="group inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-600 transition-colors hover:text-ink-900">
              <span
                className={cn(
                  "relative inline-flex h-4 w-4 items-center justify-center rounded-[4px] border transition-all duration-200",
                  remember
                    ? "border-brand bg-brand"
                    : "border-ink-300 bg-white group-hover:border-ink-500",
                )}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                {remember && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 5.2 4 7.2 8 2.8"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              Manter conectado
            </label>
            <Link
              href="/recuperar-senha"
              className="text-[13px] font-semibold text-ink-700 underline decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand"
            >
              Esqueci minha senha
            </Link>
          </div>
        </Stagger>
      </motion.div>

      <div className="mt-8 space-y-4">
        <motion.button
          type="submit"
          disabled={!isValid || submitting || !!isLocked}
          whileHover={isValid && !submitting && !isLocked ? { scale: 1.005 } : {}}
          whileTap={isValid && !submitting && !isLocked ? { scale: 0.99 } : {}}
          className={cn(
            "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn text-[14px] font-semibold transition-all duration-300",
            isValid && !submitting && !isLocked
              ? "bg-brand text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-brand-hover"
              : "cursor-not-allowed bg-ink-100 text-ink-400",
          )}
        >
          {submitting ? (
            <>
              <Spinner />
              Entrando...
            </>
          ) : (
            <>
              Entrar
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </>
          )}
        </motion.button>

        <Divider label="ou continue com" />

        <button
          type="button"
          onClick={onRequestMagicLink}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-ink-200 bg-white text-[13.5px] font-semibold text-ink-800 transition-all duration-300 hover:border-ink-400 hover:bg-ink-50"
        >
          <Mail className="h-4 w-4" strokeWidth={2.2} />
          Receber link de acesso por email
        </button>
      </div>

      <p className="mt-8 text-center text-[13px] text-ink-500">
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

function Stagger({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink-200" />
      <span className="relative bg-ink-50/40 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
