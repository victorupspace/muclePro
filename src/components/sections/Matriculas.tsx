"use client";

import { motion } from "framer-motion";
import { CalendarClock, GraduationCap, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

const CHECKS = [
  "Quem perguntou no Instagram, no WhatsApp ou na porta, num quadro só.",
  "Aula experimental marcada, com lembrete do que fazer em cada etapa.",
  "Matrícula em um toque: o interessado vira aluno com os dados já preenchidos.",
  "Quem não fechou fica registrado com o motivo. Você descobre onde o funil vaza.",
];

type BoardCard = { name: string; meta: string; trial?: boolean; won?: boolean };

const COLUMNS: { title: string; dot: string; cards: BoardCard[] }[] = [
  {
    title: "Novo contato",
    dot: "bg-info-500",
    cards: [{ name: "Mariana Lopes", meta: "Instagram · musculação à noite" }],
  },
  {
    title: "Aula agendada",
    dot: "bg-warning-500",
    cards: [{ name: "Gustavo Moreira", meta: "Google · hoje, 19:00", trial: true }],
  },
  {
    title: "Matriculado",
    dot: "bg-success-500",
    cards: [{ name: "Lucas Andrade", meta: "Indicação · plano Trimestral", won: true }],
  },
];

export function Matriculas() {
  return (
    <section id="matriculas" className="relative bg-white py-24 md:py-32">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20">
          <Reveal className="order-2 min-w-0 lg:order-1">
            <Board />
          </Reveal>

          <Reveal delay={1} className="order-1 min-w-0 lg:order-2">
            <SectionLabel>Funil de matrículas</SectionLabel>
            <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-ink-900 md:text-[44px]">
              Todo interessado tem <span className="text-brand">um próximo passo</span>.
            </h2>
            <p className="mt-5 max-w-xl text-body-lg text-ink-700/70">
              Arraste cada pessoa do primeiro contato até a matrícula. A recepção sabe com quem falar hoje e você vê, por
              origem, de onde vêm os alunos que ficam.
            </p>
            <ul className="mt-8 space-y-3">
              {CHECKS.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-start gap-3 text-body text-ink-700"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>
            <div className="mt-10 max-w-xs">
              <CTA href="/cadastro">Começar teste grátis</CTA>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function Board() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_20%_20%,rgb(var(--color-brand)/0.10),transparent_60%)]" />
      <div className="grid grid-cols-3 gap-2.5 rounded-panel border border-ink-200 bg-ink-50 p-3 shadow-[0_30px_70px_-40px_rgba(31,31,31,0.35)] md:gap-3 md:p-4">
        {COLUMNS.map((col, ci) => (
          <div key={col.title} className="min-w-0 rounded-card border border-ink-200 bg-white/70">
            <div className="border-b border-ink-200/70 px-2.5 py-2">
              <p className="flex items-center gap-1.5 truncate text-[11.5px] font-bold text-ink-900">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", col.dot)} />
                {col.title}
              </p>
            </div>
            <div className="space-y-2 p-2 md:p-2.5">
              {col.cards.map((c) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: 0.2 + ci * 0.18, duration: 0.55, ease: EASE }}
                  className={cn("rounded-[10px] border bg-white p-2.5", c.won ? "border-success-200" : "border-ink-200")}
                >
                  <p className="truncate text-[12px] font-bold text-ink-900">{c.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-[1.4] text-ink-500">{c.meta}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {c.trial && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-warning-800 ring-1 ring-inset ring-warning-200">
                        <CalendarClock size={10} />
                        Aula hoje
                      </span>
                    )}
                    {c.won && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-success-700 ring-1 ring-inset ring-success-200">
                        <GraduationCap size={10} />
                        Virou aluno
                      </span>
                    )}
                    {!c.trial && !c.won && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-success-700">
                        <MessageCircle size={10} />
                        WhatsApp
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              <div className="h-10 rounded-[10px] border border-dashed border-ink-200" />
            </div>
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: 0.8, duration: 0.6, ease: EASE }}
        className="absolute -bottom-5 right-4 flex items-center gap-2 rounded-btn border border-ink-200 bg-white px-3 py-2 text-[11.5px] font-semibold text-ink-800 shadow-[0_18px_40px_-20px_rgba(31,31,31,0.45)]"
      >
        <GraduationCap size={14} className="text-brand" />
        Conversão e origem de cada matrícula
      </motion.div>
    </div>
  );
}
