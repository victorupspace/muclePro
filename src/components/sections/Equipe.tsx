"use client";

import { motion } from "framer-motion";
import { Check, MapPin, Minus } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CTA } from "@/components/ui/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

const CHECKS = [
  "Perfis para gestão, recepção, contabilidade e personal.",
  "Permissão por ação: cadastrar aluno, cobrar, editar planos.",
  "Cada funcionário vinculado à sua unidade.",
];

const ROLES = ["Gestão", "Recepção", "Contabilidade", "Personal"];

// Exemplo de configuração. Cada estabelecimento define a sua.
const ACTIONS: { label: string; grants: boolean[] }[] = [
  { label: "Ver ficha do aluno", grants: [true, true, false, true] },
  { label: "Cadastrar aluno", grants: [true, true, false, false] },
  { label: "Registrar pagamento", grants: [true, true, true, false] },
  { label: "Editar planos", grants: [true, false, true, false] },
  { label: "Ver financeiro", grants: [true, false, true, false] },
  { label: "Gerenciar equipe", grants: [true, false, false, false] },
];

export function Equipe() {
  return (
    <section id="equipe" className="relative bg-white py-24 md:py-32">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-20">
          <Reveal>
            <SectionLabel>Equipe e permissões</SectionLabel>
            <h2 className="mt-4 text-h2 font-bold leading-[1.08] tracking-[-0.02em] text-ink-900 md:text-[44px]">
              Delegue o trabalho{" "}
              <span className="text-brand">sem perder o controle</span>.
            </h2>
            <p className="mt-5 max-w-xl text-body-lg text-ink-700/70">
              Cada funcionário tem um perfil, um conjunto de permissões e uma
              unidade. A recepção cadastra e cobra, a contabilidade vê o
              financeiro, o personal vê o que precisa do aluno. Nada além
              disso.
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
            <PermissionMatrix />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

function PermissionMatrix() {
  return (
    <div>
      <div className="overflow-hidden rounded-panel border border-ink-200 bg-white shadow-[0_30px_70px_-40px_rgba(31,31,31,0.3)]">
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-50 px-5 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Permissões por perfil
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200">
            <MapPin size={11} className="text-brand" />
            Unidade Centro
          </span>
        </div>

        <div className="px-3 pb-3 pt-2 md:px-5 md:pb-5">
          <div className="grid grid-cols-[1.35fr_repeat(4,1fr)] items-end gap-x-1 border-b border-ink-100 pb-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Ação
            </span>
            {ROLES.map((role) => (
              <span
                key={role}
                className="text-center text-[9.5px] font-bold uppercase leading-tight tracking-[0.08em] text-ink-700 md:text-[10.5px]"
              >
                {role}
              </span>
            ))}
          </div>

          {ACTIONS.map((action, row) => (
            <div
              key={action.label}
              className="grid grid-cols-[1.35fr_repeat(4,1fr)] items-center gap-x-1 border-b border-ink-100 py-2 last:border-b-0 md:py-2.5"
            >
              <span className="pr-2 text-[12px] font-medium leading-snug text-ink-900 md:text-[13px]">
                {action.label}
              </span>
              {action.grants.map((granted, col) => (
                <div key={col} className="flex justify-center">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{
                      duration: 0.45,
                      delay: 0.15 + (row * ROLES.length + col) * 0.035,
                      ease: EASE,
                    }}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full",
                      granted ? "bg-brand text-white" : "bg-ink-100 text-ink-400",
                    )}
                    aria-label={granted ? "Permitido" : "Não permitido"}
                  >
                    {granted ? <Check size={13} strokeWidth={3} /> : <Minus size={12} strokeWidth={2.5} />}
                  </motion.span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-500">
        Exemplo de configuração. Cada estabelecimento define a sua.
      </p>
    </div>
  );
}
