"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { useConsultorSession } from "@/lib/plataforma/session";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function PlataformaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, status, signOut } = useConsultorSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status === "checking") {
    return <div className="min-h-svh bg-white" />;
  }

  if (status === "blocked") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-white px-6">
        <div className="max-w-[420px] text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
            Acesso pendente
          </p>
          <h1 className="mt-3 text-[26px] font-bold tracking-[-0.02em] text-ink-900">
            Sua conta ainda não está liberada.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
            O acesso à plataforma depende da aprovação do time musclePro no backoffice.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-6 rounded-btn bg-ink-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Voltar para o login
          </button>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <>
      <SplashScreen storageKey="musclepro:splash:plataforma" />
      <div className="flex min-h-svh bg-surface">
        <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 border-r border-ink-200 bg-white lg:flex lg:flex-col">
          <Sidebar
            fullName={profile.fullName}
            companyName={profile.companyName}
            onSignOut={signOut}
          />
        </aside>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-ink-200 bg-white lg:hidden"
              >
                <Sidebar
                  fullName={profile.fullName}
                  companyName={profile.companyName}
                  onSignOut={signOut}
                  onClose={() => setMobileOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} onSignOut={signOut} />
          <main className="min-w-0 flex-1 px-3.5 py-5 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </>
  );
}
