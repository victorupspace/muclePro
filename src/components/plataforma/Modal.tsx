"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { EASE } from "@/lib/motion";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, description, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-ink-900/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center px-3 py-4 sm:items-center sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="w-full max-w-[460px] overflow-hidden rounded-panel border border-ink-200 bg-white shadow-[0_30px_70px_-20px_rgba(17,17,17,0.35)]"
            >
              <header className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="truncate text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-500">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900 sm:h-8 sm:w-8"
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </header>

              <div className="px-5 py-5 sm:px-6">{children}</div>

              {footer && (
                <footer className="border-t border-ink-200 bg-ink-50/40 px-5 py-3.5 sm:px-6">
                  {footer}
                </footer>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
