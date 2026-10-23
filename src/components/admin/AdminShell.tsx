"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAdminAuth } from "@/lib/admin/auth";
import { useAdminStore } from "@/lib/admin/store";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

const NAV = [
  { label: "Visão geral", href: "/admin/backoffice/visao-geral", icon: LayoutDashboard },
  { label: "Leads da landing", href: "/admin/backoffice/leads-landing", icon: Inbox },
  { label: "Contas novas", href: "/admin/backoffice/contas-novas", icon: UserPlus },
  { label: "Contas ativas", href: "/admin/backoffice/contas-ativas", icon: UserCheck },
  { label: "Pagamentos", href: "/admin/backoffice/pagamentos", icon: CreditCard },
  { label: "Notificações", href: "/admin/backoffice/notificacoes", icon: Bell },
  { label: "Configurações", href: "/admin/backoffice/configuracoes", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, hydrated, signOut } = useAdminAuth();
  const { error: storeError } = useAdminStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !session) router.replace("/admin/backoffice/login");
  }, [hydrated, session, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center text-[13px] text-ink-400">
        Carregando…
      </div>
    );
  }

  if (!session) return null;

  async function handleSignOut() {
    await signOut();
    router.replace("/admin/backoffice/login");
  }

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 border-r border-ink-200 bg-white lg:flex lg:flex-col">
        <SidebarContent pathname={pathname} onSignOut={handleSignOut} username={session.username} />
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
              <SidebarContent
                pathname={pathname}
                onSignOut={handleSignOut}
                username={session.username}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-ink-200 bg-white/85 px-3 backdrop-blur-sm md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" strokeWidth={2.2} />
          </button>

          <Link
            href="/admin/backoffice/visao-geral"
            className="inline-flex shrink-0 items-center lg:hidden"
            aria-label="Backoffice musclePro"
          >
            <Logo variant="dark" className="origin-left scale-[0.55]" />
          </Link>

          <div
            className="ml-auto flex min-w-0 items-center gap-2 text-[12px] text-ink-500 lg:gap-3"
            title={`Sessão ativa como ${session.username}`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success-600" strokeWidth={2.4} />
            <span className="hidden min-w-0 truncate sm:inline">
              <span className="hidden md:inline">Sessão ativa como </span>
              <strong className="text-ink-900">{session.username}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sair"
            className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-btn px-2.5 text-[12.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

        <main className="min-w-0 flex-1 px-3.5 py-5 md:px-8 md:py-8">
          {storeError && (
            <div className="mb-5 rounded-card border border-danger-200 bg-danger-50/80 px-4 py-3 text-[12.5px] leading-[1.5] text-danger-700">
              Não foi possível sincronizar o backoffice: {storeError}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onSignOut,
  username,
  onClose,
}: {
  pathname: string | null;
  onSignOut: () => void;
  username: string;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-ink-200 px-5 py-5">
        <Link href="/admin/backoffice/visao-geral" className="inline-flex">
          <Logo variant="dark" className="scale-[0.7] origin-left" />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        )}
      </div>

      <div className="px-5 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
          Backoffice
        </p>
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-btn px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-brand text-white"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              {item.label}
              {active && (
                <span className="absolute right-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-brand-light" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-200 p-4">
        <div className="mb-2 rounded-btn bg-ink-50 px-3 py-2.5 text-[12px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Logado como
          </p>
          <p className="mt-0.5 font-semibold text-ink-900">{username}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-btn border border-ink-200 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
          Encerrar sessão
        </button>
      </div>
    </>
  );
}
