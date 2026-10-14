"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { AuthMedia } from "./AuthMedia";

type MediaVariant = "intro" | "form" | "success" | "login" | "magic";

type AuthShellProps = {
  step?: 1 | 2 | 3;
  totalSteps?: number;
  onBack?: () => void;
  children: React.ReactNode;
  mediaVariant?: MediaVariant;
  footerSlot?: React.ReactNode;
};

export function AuthShell({
  step,
  totalSteps = 3,
  onBack,
  children,
  mediaVariant = "intro",
  footerSlot,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-svh w-full bg-ink-50/40">
      <div className="relative flex w-full flex-col lg:w-[44%] lg:min-w-[480px]">
        <header className="flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
          <Link href="/" aria-label="Voltar para a home" className="inline-flex">
            <Logo variant="dark" className="scale-[0.78] origin-left" />
          </Link>

          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex h-10 items-center gap-2 rounded-btn px-3 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" strokeWidth={2.2} />
              Voltar
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-btn px-3 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
              Início
            </Link>
          )}
        </header>

        {step !== undefined && (
          <div className="mt-8 px-6 md:mt-10 md:px-10">
            <StepProgress
              step={step}
              total={totalSteps}
              className="mx-auto w-full max-w-[460px]"
            />
          </div>
        )}

        <main className="flex flex-1 flex-col px-6 pb-10 pt-8 md:px-10 md:pt-10">
          <div className="mx-auto w-full max-w-[460px] flex-1">{children}</div>
        </main>

        <footer className="flex flex-col gap-3 px-6 pb-6 md:px-10 md:pb-8">
          {footerSlot}
          <p className="text-[11px] text-ink-400">
            © {new Date().getFullYear()} musclePro. Todos os direitos reservados.
          </p>
        </footer>
      </div>

      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative hidden flex-1 lg:block"
      >
        <div className="sticky top-0 h-svh p-4">
          <AuthMedia variant={mediaVariant} />
        </div>
      </motion.aside>
    </div>
  );
}

function StepProgress({
  step,
  total,
  className,
}: {
  step: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const allDone = step >= total;
        const isActive = idx === step && !allDone;
        const isDone = idx < step || allDone;
        return (
          <div key={i} className="flex flex-1 items-center gap-2">
            <motion.span
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-500",
                isDone
                  ? "bg-brand"
                  : isActive
                    ? "bg-ink-900"
                    : "bg-ink-200",
              )}
              initial={false}
              animate={{
                opacity: isActive || isDone ? 1 : 0.55,
              }}
            />
          </div>
        );
      })}
      <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}
