"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { EASE, fadeUp, stagger } from "@/lib/motion";

const PAINS = [
  {
    pain: "Inadimplência descoberta tarde demais",
    answer: "Clientes inadimplentes como indicador fixo do painel principal.",
  },
  {
    pain: "Não saber quem pode fazer o quê",
    answer: "Permissão por funcionário para cobrar, cadastrar aluno e editar planos.",
  },
  {
    pain: "Dados do aluno espalhados e incompletos",
    answer: "Cadastro único com contato, plano, condição médica e contato de emergência.",
  },
  {
    pain: "Rede com filiais sem visão unificada",
    answer: "Filiais no mesmo sistema, com cada funcionário vinculado à sua unidade.",
  },
  {
    pain: "Aluno some e você só percebe quando cancela",
    answer: "Radar de risco de saída e motivo obrigatório de cada cancelamento.",
  },
  {
    pain: "Ficha de treino em papel, esquecida na gaveta",
    answer: "App do aluno com o treino do dia, carga anotada e ciclos com lembrete.",
  },
  {
    pain: "Interessado que pergunta e nunca mais aparece",
    answer: "Funil de matrículas com aula experimental e motivo de cada perda.",
  },
  {
    pain: "Gestão reativa, apagando incêndio",
    answer: "Painel com caixa do mês, metas, ações recomendadas e resumo diário às 7h.",
  },
];

export function Dores() {
  return (
    <section id="dores" className="relative bg-ink-50 py-24 md:py-32">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <SectionLabel>Dores que resolvemos</SectionLabel>
          </div>
          <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-ink-900 md:text-[44px]">
            Gestão reativa é apagar incêndio.{" "}
            <span className="text-brand">Troque por controle.</span>
          </h2>
          <p className="mt-5 text-body-lg text-ink-700/70">
            O musclePro nasce das dores de quem opera um estabelecimento de
            atividade física. Para cada uma, uma resposta concreta.
          </p>
        </Reveal>

        <motion.ul
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mx-auto mt-16 max-w-4xl space-y-3"
        >
          {PAINS.map((p, i) => (
            <motion.li
              key={p.pain}
              variants={fadeUp}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="group grid items-center gap-3 rounded-panel border border-ink-200 bg-white px-5 py-5 transition-colors hover:border-ink-900 md:grid-cols-[1fr_auto_1.25fr] md:gap-6 md:px-7"
            >
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 shrink-0 text-[10px] font-semibold tabular-nums text-ink-300">
                  0{i + 1}
                </span>
                <p className="text-[15px] font-medium leading-snug text-ink-700">{p.pain}</p>
              </div>
              <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-ink-50 text-brand ring-1 ring-inset ring-ink-200 transition-all group-hover:bg-brand group-hover:text-white group-hover:ring-brand md:inline-flex">
                <ArrowRight size={14} strokeWidth={2.4} />
              </span>
              <p className="border-t border-ink-100 pt-3 text-[15px] font-semibold leading-snug text-ink-900 md:border-t-0 md:pt-0">
                {p.answer}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        <Reveal className="mt-20">
          <div className="relative overflow-hidden rounded-panel bg-ink-900 px-8 py-14 md:px-16 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 80% 20%, rgb(var(--color-brand-hover)/0.25), transparent 45%)",
              }}
            />
            <div className="relative grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
              <div>
                <h3 className="text-h2 font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[40px]">
                  Planilha, caderno e memória{" "}
                  <span className="text-brand-light">não escalam</span>.
                </h3>
                <p className="mt-4 max-w-md text-body-lg text-white/70">
                  Crie a conta e use tudo por 14 dias, para uma unidade ou para a
                  rede inteira. Se preferir, um especialista mostra antes.
                </p>
              </div>
              <div className="w-full md:max-w-[360px] md:justify-self-end">
                <CTA href="/cadastro" onDark>
                  Começar teste grátis
                </CTA>
                <p className="mt-3 text-center text-[11px] text-white/40">
                  Cadastro avaliado em até 48 horas.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
