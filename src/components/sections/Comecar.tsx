"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, PartyPopper, Send } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { EASE } from "@/lib/motion";

const STEPS = [
  {
    icon: <Send size={18} />,
    title: "Envie o cadastro",
    desc: "Dados do responsável e do estabelecimento. Leva menos de dois minutos.",
  },
  {
    icon: <ClipboardCheck size={18} />,
    title: "Avaliação em até 48h",
    desc: "Nossa equipe confere os dados e envia a confirmação por e-mail e WhatsApp.",
  },
  {
    icon: <PartyPopper size={18} />,
    title: "14 dias grátis, tudo liberado",
    desc: "Alunos, app do aluno, treinos, funil e relatórios. Escolha o plano quando quiser.",
  },
];

export function Comecar() {
  return (
    <section id="comecar" className="relative overflow-hidden bg-ink-900 py-24 text-white md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgb(var(--color-brand-hover)/0.45), transparent 55%), radial-gradient(circle at 90% 100%, rgb(var(--color-brand)/0.5), transparent 50%)",
        }}
      />
      <Container className="relative">
        <Reveal className="mx-auto max-w-5xl text-center">
          <h2 className="text-h2 font-bold leading-[1.06] tracking-[-0.025em] md:text-[52px]">
            Comece hoje. <span className="text-brand-light">Teste grátis por 14 dias.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-body-lg text-white/70">
            Sem cartão de crédito para começar. Seus dados ficam com você, do primeiro aluno ao último relatório.
          </p>
        </Reveal>

        <ol className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.15, duration: 0.7, ease: EASE }}
              className="relative rounded-panel border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white ring-1 ring-inset ring-white/20">{s.icon}</span>
                <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">Passo {i + 1}</span>
              </div>
              <p className="mt-4 text-[18px] font-bold">{s.title}</p>
              <p className="mt-1.5 text-[14px] leading-[1.6] text-white/65">{s.desc}</p>
            </motion.li>
          ))}
        </ol>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
          <CTA href="/cadastro" onDark>
            Criar minha conta
          </CTA>
          <CTA href="#contact" variant="glass" onDark>
            Pedir demonstração
          </CTA>
        </div>
      </Container>
    </section>
  );
}
