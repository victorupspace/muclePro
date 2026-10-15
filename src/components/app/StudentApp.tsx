"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Dumbbell, Loader2, LogOut, TrendingUp, UserRound } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { EvolutionTab } from "./EvolutionTab";
import { FichaTab } from "./FichaTab";
import { InstallHint } from "./InstallHint";
import { ProfileTab } from "./ProfileTab";
import { TodayTab } from "./TodayTab";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { AppAccessError, loadHome, type AppHome, type AppLog } from "@/lib/app/student-app";
import { firstName } from "@/lib/plataforma/format";
import { supabase } from "@/lib/supabase/client";

type Tab = "hoje" | "ficha" | "evolucao" | "perfil";

const TABS: { value: Tab; label: string; icon: typeof Dumbbell }[] = [
  { value: "hoje", label: "Hoje", icon: Dumbbell },
  { value: "ficha", label: "Ficha", icon: ClipboardList },
  { value: "evolucao", label: "Evolução", icon: TrendingUp },
  { value: "perfil", label: "Perfil", icon: UserRound },
];

type State =
  | { kind: "loading" }
  | { kind: "no_session" }
  | { kind: "denied"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; home: AppHome };

export function StudentApp() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("hoje");

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState({ kind: "no_session" });
      return;
    }
    try {
      setState({ kind: "ready", home: await loadHome() });
    } catch (err) {
      if (err instanceof AppAccessError) setState({ kind: "denied", message: err.message });
      else setState({ kind: "error", message: "Não foi possível carregar agora. Verifique a internet e tente de novo." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upsertLog = useCallback((log: AppLog) => {
    setState((prev) => {
      if (prev.kind !== "ready") return prev;
      const logs = [log, ...prev.home.logs.filter((l) => l.id !== log.id)].sort((a, b) => b.performedOn.localeCompare(a.performedOn));
      return { kind: "ready", home: { ...prev.home, logs } };
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut().catch(() => null);
    setState({ kind: "no_session" });
  }

  if (state.kind === "loading") {
    return (
      <Splash>
        <Loader2 className="h-5 w-5 animate-spin text-white/80" strokeWidth={2.4} />
      </Splash>
    );
  }
  if (state.kind !== "ready") {
    return (
      <Splash>
        <div className="max-w-[340px] text-center">
          <h1 className="text-[22px] font-bold leading-[1.2] text-white">
            {state.kind === "no_session" ? "Entre pelo link da academia" : state.kind === "denied" ? "Acesso indisponível" : "Algo deu errado"}
          </h1>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-white/75">
            {state.kind === "no_session"
              ? "Abra o link pessoal que a academia enviou pelo WhatsApp. Se ele venceu, peça um novo na recepção."
              : state.message}
          </p>
          {state.kind === "denied" && (
            <div className="mt-6 flex flex-col gap-2">
              <button type="button" onClick={() => void signOut()} className="h-12 rounded-card bg-white text-[15px] font-bold text-brand">
                Sair deste aparelho
              </button>
              <Link href="/plataforma" className="text-[13px] font-semibold text-white/70 underline">
                Sou da equipe da academia
              </Link>
            </div>
          )}
          {state.kind === "error" && (
            <button type="button" onClick={() => void load()} className="mt-6 h-12 w-full rounded-card bg-white text-[15px] font-bold text-brand">
              Tentar de novo
            </button>
          )}
        </div>
      </Splash>
    );
  }

  const { home } = state;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto min-h-svh max-w-[520px] pb-[calc(76px+env(safe-area-inset-bottom))]">
      <header className="bg-brand px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark className="h-6 w-7" />
            <span className="text-[12.5px] font-semibold text-white/80">{home.account.companyName}</span>
          </div>
          {tab === "perfil" && (
            <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/70">
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.4} />
              Sair
            </button>
          )}
        </div>
        <h1 className="mt-4 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">
          {greeting}, {firstName(home.student.fullName)}.
        </h1>
        <p className="mt-1 text-[13px] text-white/70">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase())}
        </p>
      </header>

      <main className="-mt-3 px-4">
        <InstallHint />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            {tab === "hoje" && <TodayTab home={home} onSaved={upsertLog} onOpenFicha={() => setTab("ficha")} />}
            {tab === "ficha" && <FichaTab home={home} />}
            {tab === "evolucao" && <EvolutionTab home={home} />}
            {tab === "perfil" && <ProfileTab home={home} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        aria-label="Seções"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-[520px] grid-cols-4">
          {TABS.map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-brand" : "text-ink-500")}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2.1} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-brand px-6">
      <BrandMark className="h-12 w-14" />
      {children}
    </main>
  );
}
