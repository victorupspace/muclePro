"use client";

import { useMemo, useState } from "react";
import { CreditCard, Pencil, Plus, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ActiveBadge } from "@/components/plataforma/Badges";
import { PlanFormModal } from "@/components/plataforma/PlanFormModal";
import { useToast } from "@/components/plataforma/Toast";
import { PageIntro, useRevealList } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import {
  PLAN_FREQUENCY_LABEL,
  PLAN_FREQUENCY_MONTHS,
  formatCurrency,
  formatCurrencyDetailed,
  planCadenceLabel,
} from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Plan } from "@/lib/plataforma/types";

export default function PlanosPage() {
  const { plans, students, removePlan, updatePlan, loading } = usePlataformaStore();
  const { push } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);

  const cards = useMemo(
    () =>
      plans.map((plan) => ({
        plan,
        activeStudents: students.filter((s) => s.planId === plan.id && s.status === "ativo").length,
        perMonth: plan.amount / PLAN_FREQUENCY_MONTHS[plan.frequency],
      })),
    [plans, students],
  );

  const gridRef = useRevealList<HTMLDivElement>([cards.length]);

  const recurring = cards.reduce((sum, c) => sum + c.perMonth * c.activeStudents, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Planos de pagamento"
        title="O que você vende e com que frequência"
        description={
          plans.length > 0
            ? `${plans.filter((p) => p.active).length} plano${plans.filter((p) => p.active).length === 1 ? "" : "s"} disponíve${plans.filter((p) => p.active).length === 1 ? "l" : "is"} · ${formatCurrency(recurring)} por mês com os alunos ativos.`
            : "Cada plano tem um valor e uma frequência. Ao vincular um aluno, o ciclo de cobrança começa sozinho."
        }
        actions={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Novo plano
          </button>
        }
      />

      {cards.length === 0 ? (
        loading ? null : (
          <EmptyState
            icon={<CreditCard className="h-5 w-5" strokeWidth={2.2} />}
            title="Nenhum plano cadastrado"
            description="Comece pelo mais comum, como um Mensal. Depois é só vincular os alunos."
          />
        )
      ) : (
        <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ plan, activeStudents, perMonth }) => (
            <article
              key={plan.id}
              className={cn(
                "group relative flex flex-col rounded-card border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-[0_18px_40px_-22px_rgba(17,17,17,0.25)]",
                plan.active ? "border-ink-200" : "border-dashed border-ink-200 opacity-75",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
                    {PLAN_FREQUENCY_LABEL[plan.frequency]}
                  </p>
                  <h2 className="mt-1 truncate text-[17px] font-bold tracking-[-0.01em] text-ink-900">{plan.name}</h2>
                </div>
                <ActiveBadge active={plan.active} labels={["Disponível", "Oculto"]} />
              </div>

              <p className="mt-4 text-[28px] font-bold leading-none tracking-[-0.025em] text-ink-900">
                {formatCurrencyDetailed(plan.amount)}
              </p>
              <p className="mt-1.5 text-[12px] text-ink-500">
                {planCadenceLabel(plan.frequency)}
                {plan.frequency !== "mensal" && ` · equivale a ${formatCurrencyDetailed(perMonth)}/mês`}
              </p>

              {plan.description && (
                <p className="mt-3 text-[12.5px] leading-[1.55] text-ink-600">{plan.description}</p>
              )}

              <div className="mt-4 flex items-center gap-1.5 border-t border-ink-100 pt-3 text-[12px] text-ink-600">
                <Users className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.4} />
                <span className="font-semibold text-ink-900">{activeStudents}</span>
                aluno{activeStudents === 1 ? "" : "s"} ativo{activeStudents === 1 ? "" : "s"}
              </div>

              <div className="mt-4 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(plan);
                    setFormOpen(true);
                  }}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void updatePlan(plan.id, { active: !plan.active })}
                  className="inline-flex h-8 flex-1 items-center justify-center rounded-btn border border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                >
                  {plan.active ? "Ocultar" : "Disponibilizar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(plan)}
                  aria-label="Excluir plano"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-btn border border-danger-200 bg-white text-danger-600 transition-colors hover:border-danger-400 hover:bg-danger-50"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <PlanFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        plan={editing ?? undefined}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `Excluir o plano ${confirmDelete.name}?` : "Excluir plano?"}
        description={
          confirmDelete && students.some((s) => s.planId === confirmDelete.id)
            ? "Alunos vinculados ficam sem plano e as cobranças já criadas continuam no histórico. Se a ideia é só parar de vender, prefira ocultar."
            : "O plano some da lista. As cobranças já criadas continuam no histórico."
        }
        confirmLabel="Excluir plano"
        cancelLabel="Manter plano"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            const ok = await removePlan(confirmDelete.id);
            if (ok) push({ tone: "info", title: "Plano excluído" });
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
