"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, HeartPulse, MapPin, Phone, Siren } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE, fadeUp, stagger } from "@/lib/motion";

const CHECKS = [
  "Contato, plano e situação de pagamento em uma única tela.",
  "Condição médica e contato de emergência sempre à mão.",
  "Aluno vinculado ao plano e à unidade em que treina.",
];

export function Alunos() {
  return (
    <section id="alunos" className="relative bg-ink-50 py-24 md:py-32">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
          <Reveal className="min-w-0">
            <SectionLabel>Base de alunos</SectionLabel>
            <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-ink-900 md:text-[44px]">
              Um cadastro por aluno,{" "}
              <span className="text-brand">completo e acessível</span>.
            </h2>
            <p className="mt-5 max-w-xl text-body-lg text-ink-700/70">
              Contato, plano, condição médica e contato de emergência no mesmo
              lugar. Quem está na recepção encontra em segundos; quem está no
              atendimento sabe o que precisa saber. O aluno é cadastrado e
              acompanhado pelo estabelecimento e não acessa o sistema.
            </p>

            <ul className="mt-8 space-y-3">
              {CHECKS.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3 text-body text-ink-700"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M1 5L4 8L9 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>

            <div className="mt-10 max-w-xs">
              <CTA href="#contact">Ver uma demonstração</CTA>
            </div>
          </Reveal>

          <Reveal delay={1} className="min-w-0">
            <StudentCard />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Ficha ilustrativa ───────────────────────── */

const ROWS = [
  { icon: <Phone size={14} />, label: "Telefone", value: "(11) 98765-4321" },
  {
    icon: <CreditCard size={14} />,
    label: "Plano",
    value: "Trimestral · R$ 389 a cada 3 meses",
    chip: { text: "Em dia", tone: "success" as const },
  },
  { icon: <MapPin size={14} />, label: "Unidade", value: "Centro" },
  {
    icon: <HeartPulse size={14} />,
    label: "Condição médica",
    value: "Asma leve. Avisar o instrutor.",
    chip: { text: "Atenção", tone: "warning" as const },
  },
  {
    icon: <Siren size={14} />,
    label: "Contato de emergência",
    value: "Paulo Freitas · (11) 98888-1234",
  },
];

function StudentCard() {
  return (
    <div className="relative mx-auto max-w-[520px]">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_30%_20%,rgb(var(--color-brand)/0.12),transparent_60%)]"
      />
      <div className="rounded-panel border border-ink-200 bg-white p-6 shadow-[0_30px_70px_-40px_rgba(31,31,31,0.35)] md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-[15px] font-bold tracking-[-0.02em] text-white">
              MF
            </span>
            <div>
              <p className="text-[17px] font-bold tracking-[-0.01em] text-ink-900">
                Mariana Freitas
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-500">
                <CheckCircle2 size={13} className="text-success-600" />
                Aluna desde mar/2026 · cadastro completo
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-ink-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500 ring-1 ring-inset ring-ink-200">
            Ficha
          </span>
        </div>

        <motion.dl
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="mt-6 divide-y divide-ink-100"
        >
          {ROWS.map((r) => (
            <motion.div
              key={r.label}
              variants={fadeUp}
              className="flex items-center gap-3.5 py-3.5"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn border border-ink-200 bg-ink-50 text-ink-700">
                {r.icon}
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {r.label}
                </dt>
                <dd className="mt-0.5 text-[14px] font-medium leading-snug text-ink-900">{r.value}</dd>
              </div>
              {r.chip && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                    r.chip.tone === "success" &&
                      "bg-success-50 text-success-700 ring-success-200",
                    r.chip.tone === "warning" &&
                      "bg-warning-50 text-warning-800 ring-warning-200",
                  )}
                >
                  {r.chip.text}
                </span>
              )}
            </motion.div>
          ))}
        </motion.dl>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
        className="absolute -bottom-4 right-4 flex items-center gap-2 rounded-btn border border-ink-200 bg-white px-3 py-2 text-[11px] font-medium text-ink-700 shadow-[0_18px_40px_-20px_rgba(31,31,31,0.45)] md:right-8"
      >
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success-500" />
        Atualizado pela recepção · hoje, 09:12
      </motion.div>
    </div>
  );
}
