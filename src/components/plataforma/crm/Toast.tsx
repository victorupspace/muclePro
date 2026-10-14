"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

type ToastTone = "success" | "info" | "warn";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, ...t }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-[360px] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(id);
  }, [onDismiss]);

  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warn" ? AlertTriangle : Info;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="pointer-events-auto flex items-start gap-2.5 rounded-card border border-ink-200 bg-white px-3.5 py-3 shadow-[0_18px_40px_-22px_rgba(17,17,17,0.35)]"
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          toast.tone === "success" && "bg-success-50 text-success-600",
          toast.tone === "warn" && "bg-warning-50 text-warning-700",
          toast.tone === "info" && "bg-ink-100 text-ink-700",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-ink-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[11.5px] leading-[1.45] text-ink-500">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-btn text-ink-400 hover:bg-ink-100 hover:text-ink-700"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (_: Omit<Toast, "id">) => {},
    };
  }
  return ctx;
}
