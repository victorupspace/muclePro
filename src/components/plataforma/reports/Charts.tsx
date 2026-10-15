"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "../motion";
import { cn } from "@/lib/cn";

function useGrow(deps: unknown[], axis: "x" | "y") {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = ref.current;
      if (!root || prefersReducedMotion()) return;
      gsap.from(root.querySelectorAll("[data-bar]"), {
        [axis === "y" ? "scaleY" : "scaleX"]: 0,
        transformOrigin: axis === "y" ? "bottom center" : "left center",
        duration: 0.6,
        stagger: 0.03,
        ease: "power3.out",
      });
    },
    { scope: ref, dependencies: deps, revertOnUpdate: true },
  );
  return ref;
}

export function ReportCard({
  title,
  hint,
  action,
  className,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-card border border-ink-200 bg-white p-4 md:p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold tracking-[-0.005em] text-ink-900">{title}</h2>
          {hint && <p className="mt-0.5 text-[11.5px] text-ink-500">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

type MonthDatum = { key: string; short: string; label: string; value: number; highlight?: boolean };

// Colunas por mês; os meses dentro do período escolhido ficam em destaque.
export function MonthBars({ data, format }: { data: MonthDatum[]; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ref = useGrow([data.map((d) => d.value).join(",")], "y");
  return (
    <div ref={ref} className="flex h-[200px] items-end gap-1.5 sm:gap-2">
      {data.map((d) => (
        <div key={d.key} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.label}: ${format(d.value)}`}>
          <span className="invisible whitespace-nowrap text-[10px] font-semibold tabular-nums text-ink-700 group-hover:visible">{format(d.value)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              data-bar
              className={cn("w-full rounded-t-[4px] transition-colors", d.highlight ? "bg-brand group-hover:bg-brand-hover" : "bg-brand-light/60 group-hover:bg-brand-light")}
              style={{ height: `${Math.max(d.value > 0 ? 2 : 0, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className={cn("text-[10px] font-semibold", d.highlight ? "text-ink-900" : "text-ink-400")}>{d.short}</span>
        </div>
      ))}
    </div>
  );
}

type FlowDatum = { key: string; short: string; label: string; joined: number; left: number; highlight?: boolean };

export function FlowBars({ data }: { data: FlowDatum[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.joined, d.left]));
  const ref = useGrow([data.map((d) => `${d.joined}-${d.left}`).join(",")], "y");
  return (
    <div>
      <div ref={ref} className="flex h-[180px] items-end gap-1.5 sm:gap-2">
        {data.map((d) => (
          <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.label}: ${d.joined} entradas, ${d.left} saídas`}>
            <div className="flex w-full flex-1 items-end justify-center gap-[2px]">
              <div data-bar className="w-1/2 max-w-[14px] rounded-t-[3px] bg-brand" style={{ height: `${(d.joined / max) * 100}%` }} />
              <div data-bar className="w-1/2 max-w-[14px] rounded-t-[3px] bg-danger-400" style={{ height: `${(d.left / max) * 100}%` }} />
            </div>
            <span className={cn("text-[10px] font-semibold", d.highlight ? "text-ink-900" : "text-ink-400")}>{d.short}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Entradas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger-400" /> Saídas
        </span>
      </div>
    </div>
  );
}

type Row = { key: string; label: string; value: number; detail?: string };

// Ranking com barras horizontais e participação no total.
export function BarList({ rows, format, empty, tone = "brand" }: { rows: Row[]; format: (v: number) => string; empty: string; tone?: "brand" | "danger" | "ink" }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const ref = useGrow([rows.map((r) => r.value).join(",")], "x");
  if (rows.length === 0 || total === 0) return <p className="py-6 text-center text-[12px] text-ink-500">{empty}</p>;
  return (
    <div ref={ref} className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="min-w-0 truncate font-medium text-ink-800">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-bold text-ink-900">{format(r.value)}</span>
              <span className="ml-1.5 text-ink-400">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          {r.detail && <p className="text-[10.5px] text-ink-500">{r.detail}</p>}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              data-bar
              className={cn("h-full rounded-full", tone === "danger" ? "bg-danger-400" : tone === "ink" ? "bg-ink-400" : "bg-brand")}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Funil em degraus: largura proporcional ao total da primeira etapa.
export function FunnelSteps({ steps }: { steps: Row[] }) {
  const first = Math.max(1, steps[0]?.value ?? 1);
  const ref = useGrow([steps.map((s) => s.value).join(",")], "x");
  return (
    <div ref={ref} className="space-y-2">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const rate = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.key} className="grid grid-cols-[110px_minmax(0,1fr)_64px] items-center gap-3 text-[12px] sm:grid-cols-[140px_minmax(0,1fr)_72px]">
            <span className="truncate font-medium text-ink-700">{s.label}</span>
            <div className="h-7 overflow-hidden rounded-[6px] bg-ink-50">
              <div
                data-bar
                className="flex h-full items-center rounded-[6px] bg-brand px-2 text-[11px] font-bold text-white"
                style={{ width: `${Math.max(s.value > 0 ? 8 : 0, (s.value / first) * 100)}%`, opacity: 1 - i * 0.12 }}
              >
                {s.value}
              </div>
            </div>
            <span className="text-right text-[11px] tabular-nums text-ink-500">{rate === null ? "" : `${rate}% seguem`}</span>
          </div>
        );
      })}
    </div>
  );
}
