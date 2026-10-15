"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/cn";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Revela os filhos diretos do container em cascata. Reexecuta quando `deps`
// muda (ex.: tamanho da lista filtrada), revertendo o estado anterior.
export function useRevealList<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || prefersReducedMotion()) return;
      const items = Array.from(root.children);
      if (items.length === 0) return;
      gsap.from(items, {
        y: 10,
        autoAlpha: 0,
        duration: 0.45,
        stagger: { each: 0.04, from: "start" },
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      });
    },
    { scope: ref, dependencies: deps, revertOnUpdate: true },
  );

  return ref;
}

// Mesma cascata, mas sobre os elementos marcados com `data-row` dentro do
// container (linhas de tabela e cards do DataTable).
export function useRevealRows<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || prefersReducedMotion()) return;
      const rows = root.querySelectorAll("[data-row]");
      if (rows.length === 0) return;
      gsap.from(rows, {
        y: 8,
        autoAlpha: 0,
        duration: 0.4,
        stagger: { each: 0.03, from: "start" },
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      });
    },
    { scope: ref, dependencies: deps, revertOnUpdate: true },
  );

  return ref;
}

// Número que sobe até o valor (e acompanha mudanças posteriores).
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toLocaleString("pt-BR"),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const proxy = useRef({ v: 0 });

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        proxy.current.v = value;
        el.textContent = format(value);
        return;
      }
      gsap.to(proxy.current, {
        v: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = format(proxy.current.v);
        },
      });
    },
    { dependencies: [value] },
  );

  return (
    <span ref={ref} className={className}>
      {format(proxy.current.v)}
    </span>
  );
}

// Cabeçalho de página com a mesma anatomia das telas atuais (overline, título,
// descrição e ações à direita), com entrada em cascata.
export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.from(ref.current.querySelectorAll("[data-intro]"), {
        y: 8,
        autoAlpha: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      });
    },
    { scope: ref },
  );

  return (
    <header
      ref={ref}
      className={cn(
        "flex flex-col gap-3 border-b border-ink-200 pb-4 md:flex-row md:items-end md:justify-between md:pb-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p data-intro className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          {eyebrow}
        </p>
        <h1
          data-intro
          className="mt-1 text-[19px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[22px]"
        >
          {title}
        </h1>
        {description && (
          <p
            data-intro
            className="mt-1.5 max-w-[640px] text-[12.5px] leading-[1.55] text-ink-500 md:text-[13px]"
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div data-intro className="flex flex-wrap items-stretch gap-2 [&>*]:flex-1 sm:[&>*]:flex-initial">
          {actions}
        </div>
      )}
    </header>
  );
}

// Barra de progresso que cresce até a largura alvo.
export function ProgressBar({
  percent,
  tone = "brand",
  className,
}: {
  percent: number;
  tone?: "brand" | "success" | "warning" | "danger";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, percent));

  useGSAP(
    () => {
      if (!ref.current) return;
      if (prefersReducedMotion()) {
        ref.current.style.width = `${clamped}%`;
        return;
      }
      gsap.to(ref.current, { width: `${clamped}%`, duration: 0.8, ease: "power3.out" });
    },
    { dependencies: [clamped] },
  );

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div
        ref={ref}
        style={{ width: 0 }}
        className={cn(
          "h-full rounded-full",
          tone === "brand" && "bg-brand",
          tone === "success" && "bg-success-500",
          tone === "warning" && "bg-warning-500",
          tone === "danger" && "bg-danger-500",
        )}
      />
    </div>
  );
}
