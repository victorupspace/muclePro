"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  Gauge,
  LayoutDashboard,
  UserRoundX,
  Users,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CountUp } from "@/components/ui/CountUp";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE, fadeUp, stagger } from "@/lib/motion";

const FRONTS = [
  {
    icon: <Building2 size={20} />,
    title: "Estrutura",
    desc: "Cadastro da empresa, endereço e filiais. Uma conta para a unidade única ou para a rede inteira.",
  },
  {
    icon: <Users size={20} />,
    title: "Equipe",
    desc: "Funcionários, seus perfis e o que cada um tem permissão de fazer, em qual unidade.",
  },
  {
    icon: <CreditCard size={20} />,
    title: "Comercial",
    desc: "Planos de pagamento por valor e frequência, e a base de alunos vinculada a eles.",
  },
  {
    icon: <Gauge size={20} />,
    title: "Controle",
    desc: "Visão consolidada do negócio, com a inadimplência em destaque e as ações do momento.",
  },
];

const MODALITIES = ["Musculação", "Natação", "Crossfit", "Jiu-jitsu", "Pilates", "Funcional"];

export function Produto() {
  return (
    <section id="produto" className="relative bg-white py-24 md:py-32">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <Reveal className="min-w-0">
            <SectionLabel>O que é o musclePro</SectionLabel>
            <h2 className="mt-4 text-h2 font-bold leading-[1.1] tracking-[-0.02em] text-ink-900 md:text-[44px]">
              Quatro frentes. Uma operação inteira em um só lugar.
            </h2>
            <p className="mt-5 max-w-xl text-body-lg text-ink-700/70">
              O musclePro é o sistema de gestão para quem opera um
              estabelecimento de atividade física. Ele cobre a parte
              administrativa do negócio: a estrutura, a equipe, o comercial e
              o controle do que está acontecendo.
            </p>

            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                Feito para
              </p>
              <motion.ul
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.6 }}
                className="mt-3 flex flex-wrap gap-2"
              >
                {MODALITIES.map((m) => (
                  <motion.li
                    key={m}
                    variants={fadeUp}
                    className="rounded-full border border-ink-200 bg-ink-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-700"
                  >
                    {m}
                  </motion.li>
                ))}
                <motion.li
                  variants={fadeUp}
                  className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-500"
                >
                  e o que mais você operar
                </motion.li>
              </motion.ul>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-ink-500">
                Neutro de modalidade: nenhuma função é específica de
                musculação. Isso é característica do produto, não um detalhe.
              </p>
            </div>
          </Reveal>

          <Reveal delay={1} className="min-w-0">
            <DashboardPreview />
          </Reveal>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FRONTS.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="group relative rounded-panel border border-ink-200 bg-white p-7 transition-colors hover:border-ink-900"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-btn border border-ink-200 bg-ink-50 text-ink-900 transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                {f.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold leading-snug tracking-[-0.01em] text-ink-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700/70">{f.desc}</p>
              <span
                aria-hidden
                className="absolute right-6 top-6 text-[10px] font-semibold text-ink-300"
              >
                0{i + 1}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Painel ilustrativo ───────────────────────── */

const RECOMMENDED = [
  {
    icon: <UserRoundX size={13} />,
    text: "Cobrar 12 alunos com plano vencido há mais de 7 dias",
    tone: "danger" as const,
  },
  {
    icon: <CalendarClock size={13} />,
    text: "Renovar 9 planos que vencem esta semana",
    tone: "warning" as const,
  },
  {
    icon: <AlertTriangle size={13} />,
    text: "Completar 4 cadastros sem contato de emergência",
    tone: "neutral" as const,
  },
];

const UNITS = [
  { name: "Centro", count: 142, pct: 100 },
  { name: "Norte", count: 98, pct: 69 },
  { name: "Sul", count: 72, pct: 51 },
];

function DashboardPreview() {
  return (
    <div>
      <div className="relative overflow-hidden rounded-panel border border-ink-200 bg-ink-900 p-5 text-white shadow-[0_48px_90px_-48px_rgb(var(--color-brand)/0.55)] md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 90% -10%, rgb(var(--color-brand-hover)/0.5), transparent 45%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-btn bg-white/10 text-white ring-1 ring-inset ring-white/10">
                <LayoutDashboard size={15} strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Painel de controle
                </p>
                <p className="text-[13px] font-semibold text-white">Rede Alfa · 3 unidades</p>
              </div>
            </div>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60 ring-1 ring-inset ring-white/10">
              Hoje
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
            <Kpi label="Alunos ativos" value={<CountUp to={312} />} hint="3 unidades" />
            <Kpi
              label="Inadimplentes"
              value={<CountUp to={27} />}
              hint="8,7% da base"
              tone="danger"
            />
            <Kpi
              label="Recebido no mês"
              value={<CountUp to={48920} prefix="R$ " />}
              hint="de R$ 52.400 previstos"
            />
          </div>

          <div className="mt-5 rounded-btn border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Ações recomendadas
            </p>
            <motion.ul
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              className="mt-3 space-y-2"
            >
              {RECOMMENDED.map((a) => (
                <motion.li
                  key={a.text}
                  variants={fadeUp}
                  className="flex items-center gap-2.5 text-[12px] leading-snug text-white/85"
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                      a.tone === "danger" && "bg-danger-500/15 text-danger-300 ring-danger-500/30",
                      a.tone === "warning" && "bg-warning-500/15 text-warning-300 ring-warning-500/30",
                      a.tone === "neutral" && "bg-white/[0.06] text-white/70 ring-white/10",
                    )}
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">{a.text}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <div className="mt-5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Alunos ativos por unidade
            </p>
            <div className="mt-3 space-y-2">
              {UNITS.map((u, i) => (
                <div key={u.name} className="flex items-center gap-3 text-[11px]">
                  <span className="w-12 shrink-0 text-white/60">{u.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${u.pct}%` }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: EASE }}
                      className="h-full rounded-full bg-brand-light"
                    />
                  </div>
                  <span className="w-8 text-right font-semibold text-white/80">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-500">
        Pré-visualização ilustrativa do painel de controle.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "danger";
}) {
  const danger = tone === "danger";
  // No celular vira uma linha (rótulo + dica à esquerda, valor à direita);
  // a partir de `sm` volta a ser um bloco empilhado.
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-btn border px-3 py-2.5 sm:block sm:p-3",
        danger ? "border-danger-500/40 bg-danger-500/10" : "border-white/10 bg-white/[0.04]",
      )}
    >
      <p className="col-start-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-white/50">
        {danger && (
          <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger-400" />
          </span>
        )}
        <span>{label}</span>
      </p>
      <p
        className={cn(
          "col-start-2 row-span-2 row-start-1 text-[18px] font-bold leading-none tracking-[-0.02em] sm:mt-2 md:text-[21px]",
          danger ? "text-danger-300" : "text-white",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="col-start-1 mt-0.5 text-[10px] leading-tight text-white/45 sm:mt-1.5">{hint}</p>
      )}
    </div>
  );
}
