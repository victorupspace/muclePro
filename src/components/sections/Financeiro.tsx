"use client";

import { motion } from "framer-motion";
import { AlertOctagon, CalendarRange, Link2, Network } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE, fadeUp, stagger } from "@/lib/motion";

const BENEFITS = [
  {
    icon: <CalendarRange size={18} />,
    title: "Planos por valor e frequência",
    desc: "Mensal, trimestral, anual ou do seu jeito. Você define quanto custa e de quanto em quanto tempo.",
  },
  {
    icon: <Link2 size={18} />,
    title: "Aluno vinculado ao plano",
    desc: "Cada aluno carrega o plano que paga, a data de vencimento e a situação atual.",
  },
  {
    icon: <AlertOctagon size={18} />,
    title: "Inadimplência em destaque",
    desc: "Indicador fixo do painel principal, não um relatório escondido no fim do mês.",
  },
  {
    icon: <Network size={18} />,
    title: "Visão consolidada da rede",
    desc: "Uma unidade ou várias: o número do negócio inteiro, com o detalhe por filial a um clique.",
  },
];

const SEGMENTS = [
  { label: "Em dia", count: 268, pct: 86, bar: "bg-success-400", dot: "bg-success-400" },
  { label: "A vencer", count: 17, pct: 5, bar: "bg-warning-400", dot: "bg-warning-400" },
  { label: "Inadimplentes", count: 27, pct: 9, bar: "bg-danger-400", dot: "bg-danger-400" },
];

export function Financeiro() {
  return (
    <section
      id="financeiro"
      className="relative overflow-hidden bg-ink-900 py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 10%, rgb(var(--color-brand-hover)/0.22), transparent 40%), radial-gradient(circle at 15% 90%, rgb(var(--color-brand-hover)/0.08), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container className="relative">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="order-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:order-1"
          >
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "group relative rounded-panel border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all hover:border-brand-light hover:bg-white/[0.06]",
                  i % 2 === 1 && "sm:translate-y-6",
                )}
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-btn border border-white/10 bg-white/5 text-white transition-colors group-hover:border-brand group-hover:bg-brand">
                  {b.icon}
                </div>
                <h3 className="mt-5 text-base font-bold tracking-[-0.01em] text-white">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{b.desc}</p>
                <span
                  aria-hidden
                  className="absolute right-5 top-5 text-[10px] font-semibold text-white/25"
                >
                  0{i + 1}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <Reveal className="order-1 min-w-0 lg:order-2">
            <SectionLabel inverse>Comercial e controle</SectionLabel>
            <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-white md:text-[44px]">
              A inadimplência na primeira tela,{" "}
              <span className="text-brand-light">não no fim do mês</span>.
            </h2>
            <p className="mt-5 max-w-xl text-body-lg text-white/70">
              Planos por valor e frequência, alunos vinculados a eles e a
              saúde financeira do negócio visível todo dia. Para uma unidade
              ou para a rede inteira.
            </p>

            <HealthBar />

            <div className="mt-10 max-w-xs">
              <CTA href="#contact" onDark>
                Ver uma demonstração
              </CTA>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function HealthBar() {
  return (
    <div className="mt-10 rounded-panel border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Saúde financeira · Rede Alfa
        </p>
        <span className="text-[11px] text-white/45">Atualizado hoje</span>
      </div>

      <div className="mt-4 flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
        {SEGMENTS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ width: 0 }}
            whileInView={{ width: `${s.pct}%` }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 1.1, delay: 0.15 + i * 0.15, ease: EASE }}
            className={cn("h-full rounded-full", s.bar)}
          />
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {SEGMENTS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: EASE }}
            className={cn(
              "rounded-btn px-3 py-2.5",
              s.label === "Inadimplentes" && "bg-danger-500/10 ring-1 ring-inset ring-danger-500/30",
            )}
          >
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
              <span className={cn("inline-flex h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className="mt-1 text-[18px] font-bold leading-none tracking-[-0.02em] text-white">
              {s.count}
              <span className="ml-1 text-[11px] font-semibold text-white/45">{s.pct}%</span>
            </dd>
          </motion.div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] text-white/40">Números ilustrativos.</p>
    </div>
  );
}
