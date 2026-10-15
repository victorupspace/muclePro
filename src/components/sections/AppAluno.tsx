"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check, HeartPulse, MessageCircle, Smartphone, Timer, TrendingUp, Wallet } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE, fadeUp, stagger } from "@/lib/motion";

const FEATURES = [
  {
    icon: <Smartphone size={18} />,
    title: "Sem baixar nada",
    desc: "O aluno recebe um link pessoal no WhatsApp e coloca o treino na tela inicial do celular, com a marca da sua academia.",
  },
  {
    icon: <Timer size={18} />,
    title: "Treino do dia, pronto",
    desc: "Abre direto no treino de hoje, com séries, carga e cronômetro de descanso. Marca cada exercício e anota a carga que usou.",
  },
  {
    icon: <TrendingUp size={18} />,
    title: "Evolução que motiva",
    desc: "Peso, medidas e IMC de cada avaliação, com a diferença desde o começo. Resultado visível segura aluno.",
  },
  {
    icon: <HeartPulse size={18} />,
    title: "Saúde com transparência",
    desc: "O aluno vê as restrições registradas e avisa o professor se algo mudar. O aviso chega na agenda dele.",
  },
];

const EXERCISES = [
  { name: "Supino reto com barra", meta: "4 × 10 · descanso 90s", load: "62 kg", done: true },
  { name: "Supino inclinado", meta: "3 × 10 · descanso 90s", load: "22 kg", done: true },
  { name: "Elevação lateral", meta: "3 × 12 · descanso 60s", load: "", done: false },
];

export function AppAluno() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const chipY = useTransform(scrollYProgress, [0, 1], [30, -90]);

  return (
    <section ref={ref} id="app-do-aluno" className="relative overflow-hidden bg-brand py-24 text-white md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgb(var(--color-brand-light)/0.22), transparent 45%), radial-gradient(circle at 10% 90%, rgb(var(--color-brand-hover)/0.6), transparent 55%)",
        }}
      />
      <Container className="relative">
        <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <Reveal className="min-w-0">
            <SectionLabel inverse>Novo · App do aluno</SectionLabel>
            <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] md:text-[46px]">
              O treino sai do papel e vai para{" "}
              <span className="text-brand-light">o celular do aluno</span>.
            </h2>
            <p className="mt-5 max-w-xl text-body-lg text-white/70">
              Sua academia ganha um app próprio, sem loja e sem senha para decorar. O aluno treina com a ficha na mão, anota a
              carga e acompanha a própria evolução. Você vê tudo do outro lado.
            </p>

            <motion.ul
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="mt-10 grid gap-5 sm:grid-cols-2"
            >
              {FEATURES.map((f) => (
                <motion.li key={f.title} variants={fadeUp} className="min-w-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-btn bg-white/10 text-brand-light ring-1 ring-inset ring-white/15">
                    {f.icon}
                  </span>
                  <p className="mt-3 text-[15px] font-bold">{f.title}</p>
                  <p className="mt-1 text-[13.5px] leading-[1.6] text-white/65">{f.desc}</p>
                </motion.li>
              ))}
            </motion.ul>

            <div className="mt-10 max-w-xs">
              <CTA href="/cadastro" onDark>
                Começar teste grátis
              </CTA>
            </div>
          </Reveal>

          <div className="relative mx-auto w-full max-w-[340px]">
            <motion.div style={{ y: phoneY }} className="relative">
              <PhoneMock />
            </motion.div>
            <motion.div
              style={{ y: chipY }}
              className="absolute -left-14 top-[2%] hidden items-center gap-2 rounded-btn bg-white px-3 py-2.5 text-[12px] font-semibold text-ink-900 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)] sm:flex"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-500 text-white">
                <Check size={13} strokeWidth={3} />
              </span>
              Carga anotada: 62 kg
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
              className="absolute -right-6 bottom-16 hidden max-w-[220px] rounded-btn bg-white p-3 text-ink-900 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)] sm:block"
            >
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand">
                <MessageCircle size={12} />
                Recado para o professor
              </p>
              <p className="mt-1 text-[12px] leading-[1.45] text-ink-700">&ldquo;Senti o joelho no agachamento.&rdquo;</p>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="relative rounded-[44px] border border-white/20 bg-ink-900 p-2.5 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.8)]">
      <div className="overflow-hidden rounded-[36px] bg-[#F5F6F8]">
        <div className="bg-brand px-5 pb-6 pt-7 text-white">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/25" />
          <p className="text-[10.5px] font-semibold text-white/70">Academia Alfa</p>
          <p className="mt-2 text-[19px] font-bold leading-tight">Bom dia, Carlos.</p>
          <p className="text-[11px] text-white/65">Quinta-feira · Treino A</p>
        </div>
        <div className="-mt-3 space-y-2 px-3 pb-4">
          <div className="rounded-[14px] border border-ink-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink-900">Peito, ombros e tríceps</p>
              <span className="text-[10.5px] font-bold text-ink-500">2/3</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "66%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
                className="h-full rounded-full bg-brand"
              />
            </div>
          </div>
          {EXERCISES.map((e, i) => (
            <motion.div
              key={e.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.5, ease: EASE }}
              className={cn("rounded-[14px] border bg-white p-3", e.done ? "border-success-200" : "border-ink-200")}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    e.done ? "border-success-500 bg-success-500 text-white" : "border-ink-300",
                  )}
                >
                  {e.done && <Check size={13} strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[12.5px] font-bold text-ink-900", e.done && "text-ink-400 line-through")}>{e.name}</p>
                  <p className="text-[10.5px] text-ink-500">{e.meta}</p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="flex h-7 flex-1 items-center rounded-[8px] border border-ink-200 px-2 text-[11.5px] font-semibold text-ink-900">
                      {e.load || <span className="font-normal text-ink-400">Carga usada</span>}
                    </span>
                    <span className="inline-flex h-7 items-center gap-1 rounded-[8px] border border-ink-200 px-2 text-[10.5px] font-semibold text-ink-700">
                      <Timer size={11} />
                      {e.meta.split("descanso ")[1]}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[9.5px] font-semibold text-ink-500">
            <span className="text-brand">Hoje</span>
            <span>Ficha</span>
            <span>Evolução</span>
            <span className="inline-flex items-center justify-center gap-0.5">
              <Wallet size={10} />
              Perfil
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
