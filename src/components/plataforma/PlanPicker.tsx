"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";
import { formatCurrencyDetailed, formatDateValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { supabase } from "@/lib/supabase/client";

type Plan = { id: string; name: string; months: number; price?: number; description?: string };

// Planos do musclePro para a academia escolher (só o dono escolhe).
export function PlanPicker({ compact = false, onChosen }: { compact?: boolean; onChosen?: () => void }) {
  const { profile, refreshProfile } = useAccountSession();
  const { push } = useToast();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const billing = profile?.billing;
  const isOwner = Boolean(profile?.isOwner);
  const hasPaid = Boolean(billing?.invoices.some((i) => i.status === "paga"));

  useEffect(() => {
    void supabase
      .from("subscription_plans")
      .select("id, name, months, price, description")
      .eq("active", true)
      .order("months")
      .then(({ data }) =>
        setPlans(
          ((data ?? []) as { id: string; name: string; months: number; price: number | string | null; description: string | null }[]).map((p) => ({
            id: p.id,
            name: p.name,
            months: p.months,
            price: p.price === null ? undefined : Number(p.price),
            description: p.description ?? undefined,
          })),
        ),
      );
  }, []);

  async function choose(plan: Plan) {
    setBusy(plan.id);
    const { data, error } = await supabase.rpc("choose_subscription_plan", { p_plan: plan.id });
    setBusy(null);
    if (error) {
      push({ tone: "warn", title: "Não foi possível escolher o plano", description: error.message });
      return;
    }
    const startsOn = (data as { startsOn?: string } | null)?.startsOn;
    push({
      tone: "success",
      title: `Plano ${plan.name} escolhido`,
      description: startsOn ? `A cobrança começa em ${formatDateValue(startsOn)}, quando o teste grátis termina.` : undefined,
    });
    await refreshProfile();
    onChosen?.();
  }

  if (!plans) {
    return (
      <div className="flex items-center gap-2 py-6 text-[12.5px] text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
        Carregando planos…
      </div>
    );
  }

  const monthly = plans.find((p) => p.months === 1)?.price;
  const anyPrice = plans.some((p) => p.price !== undefined);

  return (
    <div className="space-y-2.5">
      {!anyPrice && (
        <p className="rounded-btn bg-ink-50 px-3 py-2.5 text-[12.5px] leading-[1.5] text-ink-600 ring-1 ring-inset ring-ink-200">
          Os valores dos planos estão sendo definidos. A equipe musclePro entra em contato antes do fim do seu teste grátis.
        </p>
      )}
      <div className={cn("grid gap-2.5", compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
        {plans.map((plan) => {
          const current = billing?.planName === plan.name;
          const perMonth = plan.price !== undefined ? plan.price / plan.months : undefined;
          const saving = monthly && perMonth !== undefined && plan.months > 1 ? Math.round((1 - perMonth / monthly) * 100) : 0;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-card border p-3.5 transition-colors",
                current ? "border-brand bg-brand/[0.04] ring-1 ring-inset ring-brand/30" : "border-ink-200 bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-bold text-ink-900">{plan.name}</p>
                {saving > 0 && (
                  <span className="rounded-full bg-success-50 px-1.5 py-0.5 text-[10px] font-bold text-success-700 ring-1 ring-inset ring-success-200">
                    −{saving}%
                  </span>
                )}
              </div>
              {plan.price !== undefined ? (
                <>
                  <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-[-0.01em] text-ink-900">{formatCurrencyDetailed(plan.price)}</p>
                  <p className="text-[11.5px] text-ink-500">
                    {plan.months === 1 ? "por mês" : `a cada ${plan.months} meses · ${formatCurrencyDetailed(perMonth!)}/mês`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-[15px] font-bold text-ink-400">Valor em breve</p>
                  <p className="text-[11.5px] text-ink-500">{plan.months === 1 ? "Cobrança mensal" : `Cobrança a cada ${plan.months} meses`}</p>
                </>
              )}
              {plan.description && <p className="mt-1 text-[11.5px] leading-[1.45] text-ink-600">{plan.description}</p>}
              <div className="mt-auto pt-3">
                {current ? (
                  <span className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-btn bg-brand/10 text-[12.5px] font-semibold text-brand">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                    Seu plano
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!isOwner || hasPaid || plan.price === undefined || busy !== null}
                    onClick={() => void choose(plan)}
                    title={!isOwner ? "Só o responsável pela conta escolhe o plano" : hasPaid ? "Para trocar de plano, fale com a equipe musclePro" : undefined}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-btn bg-brand text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
                  >
                    {busy === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />}
                    {billing?.planName ? "Trocar para este" : "Escolher este plano"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
