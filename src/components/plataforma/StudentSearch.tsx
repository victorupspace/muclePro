"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { EASE } from "@/lib/motion";
import { onlyDigits } from "@/lib/cadastro/masks";
import { BILLING_STATE_LABEL, initials } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";

export function StudentSearch({ className }: { className?: string }) {
  const { students, billingFor, planById } = usePlataformaStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const digits = onlyDigits(term);
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          (s.email?.toLowerCase().includes(term) ?? false) ||
          (digits.length > 0 && (onlyDigits(s.whatsapp ?? "").includes(digits) || onlyDigits(s.cpf ?? "").includes(digits))),
      )
      .slice(0, 6);
  }, [students, q]);

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <div className="relative flex h-9 items-center sm:h-10">
        <Search className="absolute left-3 h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar aluno por nome, WhatsApp ou CPF"
          aria-label="Buscar aluno"
          className="h-full w-full rounded-btn border border-ink-200 bg-white pl-9 pr-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
        />
      </div>

      <AnimatePresence>
        {open && q.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-card border border-ink-200 bg-white shadow-[0_24px_60px_-20px_rgba(17,17,17,0.25)]"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12.5px] text-ink-500">
                Nenhum aluno encontrado com esse termo.
              </div>
            ) : (
              <ol className="max-h-[320px] divide-y divide-ink-100 overflow-y-auto">
                {results.map((s) => {
                  const billing = billingFor(s.id);
                  const plan = planById(s.planId);
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/plataforma/alunos/${s.id}`}
                        onClick={() => {
                          setOpen(false);
                          setQ("");
                        }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50"
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                          {initials(s.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-ink-900">{s.fullName}</p>
                          <p className="truncate text-[11.5px] text-ink-500">
                            {plan ? plan.name : "Sem plano"}
                            {s.whatsapp ? ` · ${s.whatsapp}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                          {s.status === "inativo" ? "Inativo" : BILLING_STATE_LABEL[billing.state]}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
