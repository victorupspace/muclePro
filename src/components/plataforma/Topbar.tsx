"use client";

import { LogOut, Menu } from "lucide-react";
import { ClientSearch } from "./ClientSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { usePlataformaStore } from "@/lib/plataforma/store";

type Props = {
  onOpenMobileNav: () => void;
  onSignOut: () => void;
};

export function Topbar({ onOpenMobileNav, onSignOut }: Props) {
  const { subscription } = usePlataformaStore();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-1.5 px-3 sm:h-[76px] sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 shrink-0 -ml-1 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2.2} />
        </button>

        <div className="min-w-0 flex-1">
          <ClientSearch className="w-full max-w-[460px]" />
        </div>

        <div className="hidden sm:block">
          <SubscriptionBadge subscription={subscription} />
        </div>

        <NotificationsMenu />

        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sair"
          className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:w-auto sm:gap-1.5 sm:px-3 sm:text-[12.5px] sm:font-semibold"
        >
          <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 sm:h-3.5 sm:w-3.5" strokeWidth={2.2} />
          <span className="hidden md:inline">Sair</span>
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-ink-200/60 px-3 py-2 sm:hidden">
        <SubscriptionBadge subscription={subscription} />
      </div>
    </header>
  );
}
