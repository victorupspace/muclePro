"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, CheckCheck, CreditCard, ListTodo, Sparkles, UserPlus, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { formatRelative } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Notification, NotificationKind } from "@/lib/plataforma/types";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  lead: UserPlus,
  tarefa: ListTodo,
  pagamento: CreditCard,
  sistema: Sparkles,
};

export function NotificationsMenu() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = usePlataformaStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center px-3 py-4 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: EASE }}
              role="dialog"
              aria-modal="true"
              className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-panel border border-ink-200 bg-white shadow-[0_30px_70px_-20px_rgba(17,17,17,0.35)]"
            >
              <header className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900">
                    Notificações
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-500">
                    {unread === 0
                      ? "Você está em dia."
                      : `${unread} ${unread === 1 ? "nova" : "novas"}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1 rounded-btn px-2 py-1.5 text-[11.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
                    >
                      <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Marcar tudo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900 sm:h-8 sm:w-8"
                  >
                    <X className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>
              </header>

              <ol className="flex-1 divide-y divide-ink-100 overflow-y-auto">
                {notifications.length === 0 && (
                  <li className="px-5 py-10 text-center text-[12.5px] text-ink-500">
                    Nenhuma notificação por aqui.
                  </li>
                )}
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markNotificationRead(n.id)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </ol>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notificações"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-btn text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        <Bell className="h-4 w-4" strokeWidth={2.2} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9.5px] font-bold leading-none text-white">
            {unread}
          </span>
        )}
      </button>

      {mounted && createPortal(modal, document.body)}
    </>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const Icon = KIND_ICON[notification.kind];
  return (
    <li
      onMouseEnter={() => {
        if (!notification.read) onMarkRead();
      }}
      className={cn(
        "flex items-start gap-3 px-5 py-4 sm:px-6",
        !notification.read && "bg-brand/[0.04]",
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          notification.read ? "bg-ink-100 text-ink-600" : "bg-brand/10 text-brand",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("text-[13.5px] font-semibold", notification.read ? "text-ink-700" : "text-ink-900")}>
            {notification.title}
          </p>
          <span className="shrink-0 text-[10.5px] text-ink-400">
            {formatRelative(notification.createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-line text-[12.5px] leading-[1.6] text-ink-600">
          {notification.body}
        </p>
        {notification.href && (
          <Link
            href={notification.href}
            onClick={() => {
              onMarkRead();
              onNavigate();
            }}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand transition-colors hover:text-brand/80"
          >
            Abrir
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        )}
      </div>
      {!notification.read && (
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
      )}
    </li>
  );
}
