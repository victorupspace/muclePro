"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { EASE } from "@/lib/motion";
import { onlyDigits } from "@/lib/cadastro/masks";
import { CLIENT_STATUS_LABEL } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";

export function ClientSearch({ className }: { className?: string }) {
  const { clients } = usePlataformaStore();
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
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.companyName?.toLowerCase().includes(term) ?? false) ||
          c.email.toLowerCase().includes(term) ||
          (c.locationCity?.toLowerCase().includes(term) ?? false) ||
          (c.locationState?.toLowerCase().includes(term) ?? false) ||
          (c.distributor?.toLowerCase().includes(term) ?? false) ||
          onlyDigits(c.phone).includes(digits),
      )
      .slice(0, 6);
  }, [clients, q]);

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
          placeholder="Buscar clientes..."
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
                Nenhum cliente encontrado em sua base.
              </div>
            ) : (
              <ol className="max-h-[320px] overflow-y-auto divide-y divide-ink-100">
                {results.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/plataforma/clientes/${c.id}`}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                      }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                        {initials(c.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-900">{c.name}</p>
                        <p className="truncate text-[11.5px] text-ink-500">
                          {c.companyName ?? c.distributor ?? c.email}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                        {CLIENT_STATUS_LABEL[c.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
