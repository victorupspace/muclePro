"use client";

import { motion } from "framer-motion";
import { FileSpreadsheet, History, Mail, Radar, Sparkles, Wallet } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE, fadeUp, stagger } from "@/lib/motion";

export function Dono() {
  return (
    <section id="dono" className="relative bg-ink-50 py-24 md:py-32">
      <Container>
        <Reveal className="max-w-3xl">
          <SectionLabel>Para quem é dono</SectionLabel>
          <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-ink-900 md:text-[44px]">
            Você não precisa estar na recepção{" "}
            <span className="text-brand">para saber como está a academia</span>.
          </h2>
          <p className="mt-5 max-w-2xl text-body-lg text-ink-700/70">
            Quanto vai entrar no mês, quem pode cancelar e o que a equipe fez hoje. O musclePro conta antes de você perguntar.
          </p>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-14 grid grid-flow-dense gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <Tile className="md:col-span-2 lg:row-span-2" icon={<Wallet size={17} />} title="Caixa do mês e meta" desc="Recebido, a receber e em atraso, com a distância até a meta e as próximas entradas.">
            <CashMock />
          </Tile>
          <Tile icon={<Radar size={17} />} title="Radar de risco de saída" desc="Atraso, falta de contato e início de plano viram um alerta antes do cancelamento.">
            <RiskMock />
          </Tile>
          <Tile icon={<Mail size={17} />} title="Resumo às 7h no e-mail" desc="O que entrou ontem, quem vence hoje, quem atrasou e quem pode sair.">
            <DigestMock />
          </Tile>
          <Tile icon={<Sparkles size={17} />} title="Ações do dia" desc="Cobrar, lembrar, completar cadastro, parabenizar. Em ordem de urgência, com a mensagem pronta." />
          <Tile icon={<FileSpreadsheet size={17} />} title="Relatórios e contador" desc="Receita, evasão e matrículas. Planilha e PDF de fechamento prontos para a contabilidade." />
          <Tile className="md:col-span-2 lg:col-span-1" icon={<History size={17} />} title="Registro da equipe" desc="Quem cadastrou, cobrou, recebeu ou liberou acesso. Ninguém edita, ninguém apaga." />
        </motion.div>
      </Container>
    </section>
  );
}

function Tile({
  icon,
  title,
  desc,
  className,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.article
      variants={fadeUp}
      className={cn(
        "group flex min-w-0 flex-col rounded-panel border border-ink-200 bg-white p-5 transition-shadow duration-500 hover:shadow-[0_30px_70px_-40px_rgba(31,31,31,0.35)] md:p-6",
        className,
      )}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-brand/10 text-brand transition-transform duration-500 group-hover:scale-105">{icon}</span>
      <p className="mt-4 text-[17px] font-bold tracking-[-0.01em] text-ink-900">{title}</p>
      <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-600">{desc}</p>
      {children && <div className="mt-5 flex-1">{children}</div>}
    </motion.article>
  );
}

function CashMock() {
  return (
    <div className="flex h-full flex-col rounded-card border border-ink-100 bg-ink-50/60 p-4 md:p-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Previsto em outubro</p>
          <p className="mt-1 text-[34px] font-bold leading-none tracking-[-0.03em] text-ink-900">R$ 18.450</p>
        </div>
        <div className="pb-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Meta</p>
          <p className="mt-1 text-[15px] font-bold text-ink-700">
            R$ 20.000
            <span className="ml-2 rounded-full bg-warning-50 px-1.5 py-0.5 text-[10.5px] text-warning-800 ring-1 ring-inset ring-warning-200">92%</span>
          </p>
        </div>
      </div>
      <div className="relative mt-5 flex h-3 overflow-hidden rounded-full bg-ink-100">
        {[
          { w: "58%", c: "bg-brand" },
          { w: "34%", c: "bg-brand-light" },
          { w: "8%", c: "bg-[repeating-linear-gradient(135deg,#FF7575_0_4px,#FFBABA_4px_8px)]" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: EASE }}
            style={{ width: s.w, transformOrigin: "left" }}
            className={cn("h-full", s.c)}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        {[
          ["Já recebido", "R$ 11.630", "bg-brand"],
          ["A receber", "R$ 6.820", "bg-brand-light"],
          ["Em atraso", "R$ 1.548", "bg-danger-400"],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-btn bg-white px-2.5 py-2 ring-1 ring-inset ring-ink-100">
            <p className="flex items-center gap-1 font-bold uppercase tracking-[0.08em] text-ink-500">
              <span className={cn("h-1.5 w-1.5 rounded-full", c)} />
              {l}
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-ink-900">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-ink-600">Faltam R$ 1.550. Cobrar os atrasados fecha a meta.</p>
      <div className="mt-5 border-t border-ink-200/70 pt-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Próximas entradas</p>
        <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-btn bg-white ring-1 ring-inset ring-ink-100">
          {[
            ["17 out", "Carlos Eduardo Lima", "R$ 1.290"],
            ["20 out", "Fernanda Oliveira", "R$ 129"],
            ["23 out", "Pedro Henrique Alves", "R$ 349"],
          ].map(([d, n, v], i) => (
            <motion.li
              key={n}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.45, ease: EASE }}
              className="flex items-center gap-3 px-3 py-2 text-[12px]"
            >
              <span className="w-12 shrink-0 font-semibold text-ink-500">{d}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{n}</span>
              <span className="shrink-0 font-bold text-ink-900">{v}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RiskMock() {
  return (
    <ul className="space-y-2">
      {[
        { n: "TR", name: "Thiago Rocha", why: "R$ 129 em atraso há 25 dias", tone: "alto" },
        { n: "JC", name: "Juliana Castro", why: "Sem contato há 52 dias", tone: "medio" },
      ].map((r) => (
        <li key={r.name} className="flex items-center gap-2.5 rounded-btn border border-ink-100 p-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-700">{r.n}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-ink-900">{r.name}</span>
            <span className="block truncate text-[10.5px] text-ink-500">{r.why}</span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase ring-1 ring-inset",
              r.tone === "alto" ? "bg-danger-50 text-danger-700 ring-danger-200" : "bg-warning-50 text-warning-800 ring-warning-200",
            )}
          >
            {r.tone === "alto" ? "Alto" : "Médio"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DigestMock() {
  return (
    <div className="overflow-hidden rounded-btn border border-ink-100">
      <div className="bg-brand px-3 py-2 text-[11px] font-bold text-white">Bom dia, Victor. · 07:00</div>
      <div className="grid grid-cols-3 divide-x divide-ink-100 text-center">
        {[
          ["Ontem", "R$ 774"],
          ["Vencem hoje", "4"],
          ["Atrasados", "3"],
        ].map(([l, v]) => (
          <div key={l} className="px-1 py-2">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-500">{l}</p>
            <p className="text-[13px] font-bold text-ink-900">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
