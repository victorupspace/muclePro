"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/auth/Field";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAdminAuth } from "@/lib/admin/auth";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, hydrated, signIn } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hydrated && session) router.replace("/admin/backoffice/visao-geral");
  }, [hydrated, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));
    const result = await signIn(username, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    router.replace("/admin/backoffice/visao-geral");
  }

  const canSubmit = username.length > 0 && password.length > 0 && !submitting;

  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-[440px]"
      >
        <div className="flex items-center justify-between">
          <Logo variant="dark" className="scale-[0.78] origin-left" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-600">
            <Lock className="h-3 w-3 text-brand" strokeWidth={2.4} />
            Backoffice
          </span>
        </div>

        <div className="mt-10 rounded-panel border border-ink-200 bg-white p-7 shadow-[0_24px_60px_-30px_rgba(17,17,17,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            musclePro · interno
          </p>
          <h1 className="mt-2 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">
            Acesso interno
          </h1>
          <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-500">
            Área restrita para administradores do musclePro. O acesso é monitorado e registrado.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <Field
              label="Email"
              autoComplete="username"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <PasswordField
              label="Senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-card border border-danger-200 bg-danger-50/70 px-3.5 py-2.5"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" strokeWidth={2.2} />
                <p className="text-[12.5px] font-medium text-danger-700">{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.005 } : {}}
              whileTap={canSubmit ? { scale: 0.99 } : {}}
              className={cn(
                "group inline-flex h-11 w-full items-center justify-center gap-2 rounded-btn text-[13.5px] font-semibold transition-all duration-300",
                canSubmit
                  ? "bg-ink-900 text-white hover:bg-ink-800"
                  : "cursor-not-allowed bg-ink-100 text-ink-400",
              )}
            >
              {submitting ? "Entrando..." : "Entrar no backoffice"}
              {!submitting && (
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
              )}
            </motion.button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-400">
          musclePro · backoffice interno · acesso restrito
        </p>
      </motion.div>
    </div>
  );
}
