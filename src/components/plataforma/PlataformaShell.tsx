"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { STAFF_ROLE_LABEL } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import { BillingBanner } from "./BillingBanner";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useToast } from "./Toast";

export function PlataformaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, status, signOut } = useAccountSession();
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
            O time musclePro confere cada cadastro antes de liberar o painel. Você recebe o
            link de acesso assim que a conta for aprovada.
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

  const roleLine = profile.staffRole ? (
    <RoleLine role={profile.staffRole} label={profile.staffRoleLabel} unitId={profile.unitScopeId} />
  ) : undefined;

  return (
    <>
      <SplashScreen storageKey="musclepro:splash:plataforma" />
      <ActionErrorToaster />
      <div className="flex min-h-svh bg-surface">
        <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 border-r border-ink-200 bg-white lg:flex lg:flex-col">
          <Sidebar
            fullName={profile.fullName}
            companyName={profile.companyName}
            roleLine={roleLine}
            showTeamLog={profile.permissions.isManager}
            showReports={profile.permissions.canViewReports}
            showBilling={profile.permissions.isManager}
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
                  roleLine={roleLine}
                  showTeamLog={profile.permissions.isManager}
                  showReports={profile.permissions.canViewReports}
                  showBilling={profile.permissions.isManager}
                  onSignOut={signOut}
                  onClose={() => setMobileOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} onSignOut={signOut} />
          <main className="min-w-0 flex-1 px-3.5 py-5 md:px-8 md:py-8">
            <BillingBanner billing={profile.billing} canSeeBilling={profile.permissions.isManager} />
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

// Toda falha de escrita no store vira um toast, em qualquer tela.
function ActionErrorToaster() {
  const { actionError, clearActionError } = usePlataformaStore();
  const { refreshProfile } = useAccountSession();
  const { push } = useToast();

  useEffect(() => {
    if (!actionError) return;
    const locked = actionError.includes("modo leitura");
    push({ tone: "warn", title: locked ? "Sistema em modo leitura" : "Não deu certo", description: actionError });
    clearActionError();
    // A assinatura pode ter vencido com a tela aberta: atualiza avisos e botões.
    if (locked) void refreshProfile();
  }, [actionError, push, clearActionError, refreshProfile]);

  return null;
}

// "Recepção · Centro" no menu de quem entra como funcionário.
function RoleLine({ role, label, unitId }: { role: keyof typeof STAFF_ROLE_LABEL; label?: string; unitId?: string }) {
  const { unitById } = usePlataformaStore();
  const unit = unitById(unitId);
  return (
    <>
      {role === "outro" && label ? label : STAFF_ROLE_LABEL[role]}
      {unit ? ` · ${unit.name}` : ""}
    </>
  );
}
