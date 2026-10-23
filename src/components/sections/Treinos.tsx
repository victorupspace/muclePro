"use client";

import { motion } from "framer-motion";
import { AlertTriangle, BellRing, ClipboardList, Dumbbell, Ruler, Send } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE, fadeUp, stagger } from "@/lib/motion";

const STEPS = [
  {
    icon: <Ruler size={17} />,
    title: "Anamnese no cadastro",
    desc: "Peso, altura e medidas no primeiro dia. Cada reavaliação mostra o quanto o aluno evoluiu.",
  },
  {
    icon: <AlertTriangle size={17} />,
    title: "Saúde à vista de quem treina",
    desc: "Lesões e restrições aparecem em destaque para o professor na hora de montar o treino.",
  },
  {
    icon: <ClipboardList size={17} />,
    title: "Ficha A, B, C por dia da semana",
    desc: "Monte do zero ou a partir dos treinos padrão da academia, com séries, carga, descanso e cardio.",
  },
  {
    icon: <Send size={17} />,
    title: "Revisa e libera",
    desc: "A ficha nasce como rascunho. Só chega ao app do aluno quando o professor libera.",
  },
  {
    icon: <BellRing size={17} />,
    title: "Ciclo com lembrete",
    desc: "Troca da rotina a cada 3, 6 ou 12 meses. Uma semana antes, o lembrete cai na agenda do professor.",
  },
];

export function Treinos() {
  return (
    <section id="treinos" className="relative bg-white py-24 md:py-32">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <SectionLabel>Treinos e saúde</SectionLabel>
          </div>
          <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-ink-900 md:text-[44px]">
            Do primeiro dia ao próximo ciclo,{" "}
            <span className="text-brand">nenhum aluno fica para trás</span>.
          </h2>
          <p className="mt-5 text-body-lg text-ink-700/70">
            O professor monta, revisa e acompanha. O aluno treina com a ficha certa e o histórico de cada ciclo fica guardado
            ano após ano.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <motion.ol
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="relative space-y-6 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-ink-200"
          >
            {STEPS.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} className="relative flex gap-4">
                <span
                  className={cn(
                    "relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                    i === 3 ? "bg-brand text-white" : "bg-ink-100 text-ink-800",
                  )}
                >
                  {s.icon}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-[16px] font-bold text-ink-900">{s.title}</p>
                  <p className="mt-1 text-[14px] leading-[1.6] text-ink-600">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>

          <Reveal delay={1} className="min-w-0">
            <WorkoutMock />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

const DAYS = [
  { name: "A", focus: "Peito e tríceps", when: "Seg · Qui", items: ["Supino reto · 4×10", "Crucifixo · 3×12", "Tríceps corda · 3×12"] },
  { name: "B", focus: "Costas e bíceps", when: "Ter · Sex", items: ["Puxada frontal · 4×10", "Remada baixa · 3×12", "Rosca direta · 3×10"] },
];

function WorkoutMock() {
  return (
    <div className="relative mx-auto max-w-[540px]">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_70%_10%,rgb(var(--color-brand)/0.12),transparent_60%)]" />
      <div className="rounded-panel border border-ink-200 bg-white p-5 shadow-[0_30px_70px_-40px_rgba(31,31,31,0.35)] md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Dumbbell size={18} />
            </span>
            <div>
              <p className="text-[16px] font-bold text-ink-900">Hipertrofia ABC</p>
              <p className="text-[11.5px] text-ink-500">Por Roberto Lima · ciclo de 6 meses</p>
            </div>
          </div>
          <span className="rounded-full bg-success-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-success-700 ring-1 ring-inset ring-success-200">
            Em uso
          </span>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-btn border border-warning-200 bg-warning-50/70 px-3 py-2.5 text-[12px] leading-[1.5] text-warning-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Hérnia lombar:</span> evitar carga alta no agachamento e no terra.
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-500">
            <span>Ciclo de 6 meses</span>
            <span>Faltam 24 dias</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "86%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
              className="h-full rounded-full bg-warning-500"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DAYS.map((d) => (
            <div key={d.name} className="overflow-hidden rounded-btn border border-ink-200">
              <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-ink-50 px-3 py-2">
                <p className="text-[12.5px] font-bold text-ink-900">
                  Treino {d.name}
                  <span className="ml-1.5 font-normal text-ink-500">{d.focus}</span>
                </p>
                <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-brand ring-1 ring-inset ring-brand/20">{d.when}</span>
              </div>
              <ul className="divide-y divide-ink-100">
                {d.items.map((it, i) => (
                  <li key={it} className="px-3 py-2 text-[12px] text-ink-800">
                    {it}
                    {d.name === "A" && i === 0 && (
                      <span className="mt-1 block w-fit rounded-full bg-brand/[0.07] px-1.5 py-px text-[10px] font-semibold text-brand">Aluno usou 62 kg</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11.5px] font-semibold text-success-700">Vista pelo aluno hoje, 07:42</p>
      </div>
    </div>
  );
}
