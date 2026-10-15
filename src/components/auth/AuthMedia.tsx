"use client";

import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/lib/motion";

type Variant = "intro" | "form" | "success" | "login" | "magic";

const COPY: Record<Variant, { kicker: string; title: string; body: string }> = {
  intro: {
    kicker: "Bem-vindo ao musclePro",
    title: "Gestão completa\npara o seu espaço.",
    body:
      "O sistema que organiza alunos, planos, cobranças e equipe de academias, estúdios, escolas de natação, boxes e academias de lutas.",
  },
  form: {
    kicker: "Quase lá",
    title: "Vamos conhecer\nseu estabelecimento.",
    body:
      "Levamos menos de dois minutos para configurar o essencial. Seus dados são tratados com segurança e nunca são compartilhados.",
  },
  success: {
    kicker: "Recebemos seu cadastro",
    title: "Bem-vindo ao\nmusclePro.",
    body:
      "Em breve nosso time entra em contato para liberar o acesso do seu estabelecimento.",
  },
  login: {
    kicker: "Painel do estabelecimento",
    title: "Alunos, equipe e financeiro,\nsob controle.",
    body:
      "Acesse sua conta para acompanhar matrículas, mensalidades, inadimplência e tarefas da equipe em um só lugar.",
  },
  magic: {
    kicker: "Acesso por link",
    title: "Sem senha,\nsem fricção.",
    body:
      "Enviamos um link de acesso seguro para o seu e-mail. Basta clicar para entrar — sem digitar senha.",
  },
};

export function AuthMedia({ variant = "intro" }: { variant?: Variant }) {
  const copy = COPY[variant];
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-ink-900 text-white">
      <BackgroundLayer />

      <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-12">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center">
            <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-success-400 animate-pulseDot" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success-300" />
          </span>
          plataforma ativa
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={variant}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="max-w-[440px]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-light">
              {copy.kicker}
            </p>
            <h2 className="mt-4 whitespace-pre-line text-[40px] font-bold leading-[1.05] tracking-[-0.025em]">
              {copy.title}
            </h2>
            <p className="mt-5 max-w-[400px] text-[15px] leading-[1.6] text-white/65">
              {copy.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Indicador ilustrativo: não reflete dados reais. */}
        <div className="flex items-end justify-between gap-6" aria-hidden>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Inadimplência hoje
            </p>
            <p className="text-[28px] font-bold tracking-[-0.02em] text-white">
              4,2%<span className="ml-1.5 text-[14px] font-medium text-white/50">dos alunos</span>
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
              exemplo ilustrativo
            </p>
          </div>
          <Sparkline />
        </div>
      </div>
    </div>
  );
}

function BackgroundLayer() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, rgb(var(--color-brand-hover)/0.28) 0%, rgb(var(--color-brand-hover)/0.00) 55%), radial-gradient(80% 60% at 0% 100%, rgb(var(--color-brand-hover)/0.18) 0%, rgb(var(--color-brand-hover)/0.00) 60%)",
        }}
      />
      <svg
        aria-hidden
        viewBox="0 0 600 800"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-[0.18]"
      >
        <defs>
          <linearGradient id="auth-wave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0C85FF" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0C85FF" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {Array.from({ length: 14 }).map((_, i) => {
          const y = 60 + i * 50;
          return (
            <motion.path
              key={i}
              d={`M-20 ${y} C 100 ${y - 30}, 220 ${y + 40}, 320 ${y - 10} S 540 ${y + 30}, 640 ${y - 20}`}
              stroke="url(#auth-wave)"
              strokeWidth={1.1}
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, delay: i * 0.06, ease: EASE }}
            />
          );
        })}
      </svg>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0) 100%)",
        }}
      />
    </>
  );
}

function Sparkline() {
  // Inadimplência caindo ao longo do tempo (ilustrativo).
  const points = [38, 33, 35, 29, 30, 25, 26, 21, 22, 18, 16, 12];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 140;
  const h = 48;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-90">
      <motion.path
        d={path}
        fill="none"
        stroke="#0C85FF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
      />
    </svg>
  );
}
