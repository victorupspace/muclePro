"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

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
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="w-full max-w-[440px] rounded-panel border border-ink-200 bg-white p-5 shadow-[0_30px_70px_-20px_rgba(17,17,17,0.35)] sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    tone === "danger"
                      ? "bg-danger-100 text-danger-600"
                      : "bg-ink-100 text-ink-700",
                  )}
                >
                  <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div>
                  <h2 className="text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900">
                    {title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-600">{description}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center rounded-btn px-4 text-[13px] font-semibold text-white transition-colors sm:h-10 sm:w-auto",
                    tone === "danger"
                      ? "bg-danger-600 hover:bg-danger-700"
                      : "bg-ink-900 hover:bg-ink-800",
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
