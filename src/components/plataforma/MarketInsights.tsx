"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BookOpen, Lightbulb, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type Indicator = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  hint: string;
};

const INDICATORS: Indicator[] = [
  { label: "PLD SE/CO", value: "R$ 187,42/MWh", delta: "-3,4%", trend: "down", hint: "Carga média semanal" },
  { label: "PLD NE", value: "R$ 162,10/MWh", delta: "-1,8%", trend: "down", hint: "Carga média semanal" },
  { label: "Convencional 2026", value: "R$ 218,00/MWh", delta: "+0,9%", trend: "up", hint: "Curto prazo" },
  { label: "Incentivada 50%", value: "R$ 196,30/MWh", delta: "+0,4%", trend: "up", hint: "Início janeiro" },
];

type Insight = {
  Icon: LucideIcon;
  title: string;
  body: string;
  badge: string;
};

const INSIGHTS: Insight[] = [
  {
    Icon: TrendingUp,
    title: "Janela favorável para fechar contratos longos",
    body: "Curva de longo prazo recuou 1,2% na semana — bons clientes industriais devem priorizar travas para 2027.",
    badge: "Tendência",
  },
  {
    Icon: Lightbulb,
    title: "Consumidores acima de 500 kW",
    body: "A migração para o ML continua liberada para qualquer subgrupo de média tensão. Vale rodar o simulador antes da próxima fatura.",
    badge: "Regulação",
  },
  {
    Icon: BookOpen,
    title: "Conteúdo da semana",
    body: "Publicamos um guia rápido sobre como apresentar a economia para o financeiro do cliente — pronto para enviar.",
    badge: "Material",
  },
];

export function MarketInsights() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="overflow-hidden rounded-card border border-ink-200 bg-white"
    >
      <header className="flex flex-col gap-3 border-b border-ink-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand">
            <Zap className="h-3 w-3" strokeWidth={2.4} />
            Mercado Livre de Energia
          </p>
          <h2 className="mt-1.5 text-[18px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900 sm:text-[20px]">
            Insights da semana
          </h2>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-500">
            Indicadores e dicas de mercado preparados para sua conversa com clientes.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 divide-ink-100 border-b border-ink-200 sm:grid-cols-4 sm:divide-x">
        {INDICATORS.map((ind, i) => (
          <div
            key={ind.label}
            className={cn(
              "px-4 py-4 sm:px-5 sm:py-5",
              i < 2 && "border-b border-ink-100 sm:border-b-0",
              i % 2 === 0 && "border-r border-ink-100 sm:border-r-0",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">
              {ind.label}
            </p>
            <p className="mt-1.5 text-[16px] font-bold tracking-[-0.01em] text-ink-900 sm:text-[18px]">
              {ind.value}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                  ind.trend === "up" ? "text-warning-700" : "text-success-700",
                )}
              >
                {ind.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2.4} />
                ) : (
                  <ArrowDownRight className="h-3 w-3" strokeWidth={2.4} />
                )}
                {ind.delta}
              </span>
              <span className="text-[10.5px] text-ink-400">·</span>
              <span className="text-[11px] text-ink-500">{ind.hint}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
        {INSIGHTS.map((ins) => (
          <article
            key={ins.title}
            className="flex flex-col gap-2.5 rounded-card border border-ink-200 bg-ink-50/40 p-4 transition-colors hover:border-ink-400 hover:bg-white"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                <ins.Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                {ins.badge}
              </span>
            </div>
            <h3 className="text-[13.5px] font-bold leading-[1.3] tracking-[-0.005em] text-ink-900">
              {ins.title}
            </h3>
            <p className="text-[12.5px] leading-[1.55] text-ink-600">{ins.body}</p>
          </article>
        ))}
      </div>
    </motion.section>
  );
}
