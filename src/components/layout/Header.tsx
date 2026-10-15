"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Menu, UserPlus, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useScrollState } from "@/hooks/useScrollState";
import { cn } from "@/lib/cn";

const NAV = [
  { label: "Produto", href: "#produto" },
  { label: "App do aluno", href: "#app-do-aluno" },
  { label: "Treinos", href: "#treinos" },
  { label: "Para o dono", href: "#dono" },
  { label: "Como começar", href: "#comecar" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Header() {
  const scrolled = useScrollState(24);
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "group/header relative flex h-[68px] flex-1 items-center justify-between gap-4 overflow-hidden rounded-lg2 px-4 pl-5 pr-3 transition-all duration-500 md:pl-6",
              "[backdrop-filter:blur(24px)_saturate(155%)] [-webkit-backdrop-filter:blur(24px)_saturate(155%)]",
              scrolled
                ? "bg-surface/[0.68] shadow-[0_18px_50px_-30px_rgba(17,17,17,0.5),inset_0_0_0_1px_rgba(17,17,17,0.06),inset_0_1px_0_rgba(255,255,255,0.48),inset_0_-1px_0_rgba(17,17,17,0.04)]"
                : "bg-ink-900/[0.16] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.09),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.22)]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-lg2 transition-opacity duration-500",
                scrolled ? "opacity-100" : "opacity-80",
              )}
              style={{
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.06) 34%, rgba(255,255,255,0) 58%, rgb(var(--color-brand)/0.07) 100%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/[0.28] to-transparent"
            />
            <a href="#top" className="relative z-10 flex items-center">
              <Logo variant={scrolled ? "dark" : "light"} className="scale-90 origin-left" />
            </a>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center justify-center gap-2 lg:flex">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-btn px-3.5 py-2 text-[13px] font-semibold transition-colors duration-300",
                    scrolled
                      ? "text-ink-700/[0.78] hover:bg-ink-900/[0.04] hover:text-ink-900"
                      : "text-white/[0.82] hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="relative z-10 hidden items-center gap-1.5 lg:flex">
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-btn px-3 text-[12px] font-semibold transition-colors duration-300",
                  scrolled
                    ? "text-ink-600 hover:bg-ink-900/[0.04] hover:text-ink-900"
                    : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                )}
              >
                <LogIn className="h-3.5 w-3.5" strokeWidth={2.2} />
                Login
              </Link>
              <Link
                href="/cadastro"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-btn px-3.5 text-[12px] font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-colors duration-300",
                  scrolled
                    ? "bg-ink-900/[0.06] text-ink-900 hover:bg-ink-900/[0.1]"
                    : "bg-white/[0.11] text-white hover:bg-white/[0.16]",
                )}
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />
                Cadastre-se
              </Link>
            </div>

            <button
              aria-label="Abrir menu"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-btn transition-colors lg:hidden",
                scrolled
                  ? "bg-white/72 text-ink-900 shadow-[inset_0_0_0_1px_rgba(17,17,17,0.08)]"
                  : "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] backdrop-blur-sm",
              )}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mt-3 overflow-hidden rounded-[28px] bg-ink-900/95 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl lg:hidden"
            >
              <div className="flex flex-col gap-1 p-4">
                {NAV.map((item, i) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="rounded-2xl px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </motion.a>
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-white/20 pt-3">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-white/10 px-4 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] transition-colors hover:bg-white/20"
                  >
                    <LogIn className="h-4 w-4" strokeWidth={2.2} />
                    Login
                  </Link>
                  <Link
                    href="/cadastro"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-ink-900 text-[13px] font-semibold text-white"
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={2.2} />
                    Cadastre-se
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
