"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Radar } from "lucide-react";
import { RiskBadge } from "./Badges";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";
import { prefersReducedMotion, useRevealList } from "./motion";
import { CHURN_REASON_LABEL, initials } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { ChurnReason } from "@/lib/plataforma/types";

const WINDOW_DAYS = 90;

// Quem pode sair (risco calculado) e por que quem saiu foi embora.
export function ChurnRadar({ className }: { className?: string }) {
  const { students, riskFor, loading } = usePlataformaStore();
  const router = useRouter();

  const atRisk = useMemo(
    () =>
      students
        .filter((s) => s.status === "ativo")
        .map((s) => ({ student: s, risk: riskFor(s.id) }))
        .filter((r) => r.risk.level !== "baixo")
        .sort((a, b) => b.risk.score - a.risk.score),
    [students, riskFor],
  );
  const high = atRisk.filter((r) => r.risk.level === "alto").length;

  const reasons = useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * 86_400_000;
    const counts = new Map<ChurnReason, number>();
    for (const s of students) {
      if (s.status !== "inativo" || !s.churnReason || !s.churnedAt) continue;
      if (new Date(s.churnedAt).getTime() < since) continue;
      counts.set(s.churnReason, (counts.get(s.churnReason) ?? 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    return {
      total,
      rows: Array.from(counts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [students]);

  const listRef = useRevealList<HTMLUListElement>([atRisk.length]);
  const barsRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = barsRef.current;
      if (!root || prefersReducedMotion()) return;
      gsap.from(root.querySelectorAll("[data-bar]"), {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.6,
        stagger: 0.06,
        ease: "power3.out",
      });
    },
    { scope: barsRef, dependencies: [reasons.total], revertOnUpdate: true },
  );

  const visible = atRisk.slice(0, 5);
  const max = reasons.rows[0]?.count ?? 1;

  return (
    <ModuleCard
      title="Risco de saída"
      hint={
        loading
          ? "Analisando sua base…"
          : atRisk.length === 0
            ? "Nenhum aluno com sinal de saída"
            : high > 0
              ? `${high} com risco alto · ${atRisk.length - high} com risco médio`
              : `${atRisk.length} com risco médio`
      }
      icon={<Radar className="h-3.5 w-3.5" strokeWidth={2.4} />}
      count={atRisk.length}
      countTone={high > 0 ? "danger" : atRisk.length > 0 ? "warn" : "default"}
      onSeeAll={atRisk.length > visible.length ? () => router.push("/plataforma/alunos?risco=atencao") : undefined}
      className={className}
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[52px] animate-pulse rounded-btn border border-ink-100 bg-ink-50/60" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <ModuleEmpty>Ninguém em atraso recorrente, sem plano ou sumido. Continue assim.</ModuleEmpty>
      ) : (
        <ul ref={listRef} className="space-y-1.5">
          {visible.map(({ student, risk }) => (
            <li key={student.id}>
              <Link
                href={`/plataforma/alunos/${student.id}`}
                className="group flex items-center gap-2.5 rounded-btn border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-300"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                  {initials(student.fullName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink-900">{student.fullName}</span>
                  <span className="block truncate text-[11px] text-ink-500">{risk.reasons[0]}</span>
                </span>
                <RiskBadge level={risk.level} className="hidden sm:inline-flex" />
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" strokeWidth={2.4} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-ink-100 pt-3.5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
          Por que saíram · últimos {WINDOW_DAYS} dias
        </p>
        {reasons.total === 0 ? (
          <p className="mt-2 text-[12px] text-ink-500">Nenhuma saída registrada no período.</p>
        ) : (
          <div ref={barsRef} className="mt-2.5 space-y-2">
            {reasons.rows.map(({ reason, count }) => (
              <div key={reason} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <span className="truncate text-[12px] font-medium text-ink-700">{CHURN_REASON_LABEL[reason]}</span>
                <span className="text-[11.5px] font-bold tabular-nums text-ink-900">
                  {count} <span className="font-medium text-ink-400">· {Math.round((count / reasons.total) * 100)}%</span>
                </span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div data-bar className="h-full rounded-full bg-brand" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleCard>
  );
}
