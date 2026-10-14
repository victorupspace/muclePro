"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Clock, Mail } from "lucide-react";
import { EASE } from "@/lib/motion";
import type { AccountType } from "./types";

const COPY: Record<
  AccountType,
  { title: string; body: string; sla: string; eyebrow: string }
> = {
  consultor: {
    eyebrow: "Cadastro recebido",
    title: "Obrigado por seu interesse em fazer parte do musclePro.",
    body: "Nosso time irá analisar seu cadastro e entrar em contato em até 48 horas para dar continuidade à sua ativação. Fique atento ao seu e-mail e telefone.",
    sla: "Resposta em até 48 horas",
  },
  comercializadora: {
    eyebrow: "Solicitação enviada",
    title: "Ficamos muito felizes com o seu interesse no musclePro.",
    body: "Nosso time entrará em contato com você em breve para entender melhor sua operação e apresentar nossa solução.",
    sla: "Resposta em até 1 dia útil",
  },
};

export function StepSuccess({ accountType }: { accountType: AccountType }) {
  const copy = COPY[accountType];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex min-h-[520px] flex-col justify-center py-6"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="relative inline-flex h-16 w-16 items-center justify-center"
      >
        <span className="absolute inset-0 rounded-full bg-success-500/15" />
        <span className="absolute inset-2 rounded-full bg-success-500/25" />
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.35, delay: 0.45, type: "spring", stiffness: 280 }}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-500 text-white shadow-[0_10px_24px_-8px_rgba(34,197,94,0.6)]"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </motion.span>
      </motion.div>

      <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        {copy.eyebrow}
      </p>
      <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-ink-900">
        {copy.title}
      </h1>
      <p className="mt-4 text-[15px] leading-[1.65] text-ink-600">{copy.body}</p>

      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <InfoChip icon={<Clock className="h-3.5 w-3.5" strokeWidth={2.4} />} label={copy.sla} />
        <InfoChip icon={<Mail className="h-3.5 w-3.5" strokeWidth={2.4} />} label="Verifique seu e-mail" />
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-btn bg-ink-900 text-[14px] font-semibold text-white transition-colors hover:bg-ink-800"
        >
          Voltar para a home
        </Link>
        <Link
          href="/#contact"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-btn border border-ink-200 text-[14px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:text-ink-900"
        >
          Falar com o time
        </Link>
      </div>
    </motion.div>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-btn border border-ink-200 bg-white px-3 py-2.5 text-[12px] font-semibold text-ink-700">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-ink-600">
        {icon}
      </span>
      {label}
    </div>
  );
}
