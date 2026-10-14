"use client";

import { motion } from "framer-motion";
import { Briefcase, Building2, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import type { AccountType } from "./types";

const OPTIONS: {
  value: AccountType;
  title: string;
  body: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  {
    value: "consultor",
    title: "Sou consultor",
    body: "Acesse a plataforma para gerenciar carteira de clientes, contratos e oportunidades no mercado livre.",
    icon: <Briefcase className="h-5 w-5" strokeWidth={2} />,
    badge: "Mais comum",
  },
  {
    value: "comercializadora",
    title: "Sou comercializadora",
    body: "Onboarding consultivo, personalizado para a operação da sua comercializadora.",
    icon: <Building2 className="h-5 w-5" strokeWidth={2} />,
  },
];

type Props = {
  selected: AccountType | null;
  onSelect: (value: AccountType) => void;
  onContinue: () => void;
};

export function StepAccountType({ selected, onSelect, onContinue }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex h-full flex-col"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Passo 01
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
          Como podemos te ajudar?
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
          Selecione o tipo de conta que melhor representa sua atuação no mercado livre de energia.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {OPTIONS.map((opt, i) => {
          const active = selected === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: EASE }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "group relative flex w-full items-start gap-4 rounded-card border p-5 text-left transition-all duration-300",
                active
                  ? "border-ink-900 bg-ink-900/[0.02] shadow-[0_18px_44px_-28px_rgba(17,17,17,0.45)]"
                  : "border-ink-200 bg-white hover:border-ink-400",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-btn transition-colors duration-300",
                  active
                    ? "bg-brand text-white"
                    : "bg-ink-100 text-ink-700 group-hover:bg-ink-200/80",
                )}
              >
                {opt.icon}
              </span>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-ink-900">{opt.title}</h3>
                  {opt.badge && (
                    <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-500">{opt.body}</p>
              </div>

              <span
                aria-hidden
                className={cn(
                  "mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-ink-300 bg-white",
                )}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-5 text-[13px] leading-[1.6] text-ink-500">
        É consumidor final?{" "}
        <a
          href="/#consumidor"
          className="font-bold text-ink-900 underline decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand"
        >
          Clique aqui
        </a>{" "}
        para entender como encontrar consultores na sua região e iniciar a migração.
      </p>

      <div className="mt-auto pt-10">
        <motion.button
          type="button"
          disabled={!selected}
          onClick={onContinue}
          whileHover={selected ? { scale: 1.005 } : {}}
          whileTap={selected ? { scale: 0.99 } : {}}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn text-[14px] font-semibold transition-all duration-300",
            selected
              ? "bg-brand text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-brand-hover"
              : "cursor-not-allowed bg-ink-100 text-ink-400",
          )}
        >
          Continuar
        </motion.button>
      </div>
    </motion.div>
  );
}
