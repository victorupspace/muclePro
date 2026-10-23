"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BadgeCheck, CalendarClock, Lock, Mail, ShieldAlert, Wallet } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SubscriptionBadge } from "@/components/plataforma/SubscriptionBadge";
import { PlanPicker } from "@/components/plataforma/PlanPicker";
import { PageIntro, useRevealList } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { daysFromToday, formatCurrencyDetailed, formatDateValue, toDateValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";


export default function AssinaturaPage() {
  const { profile, refreshProfile } = useAccountSession();
  const { subscription } = usePlataformaStore();
  const billing = profile?.billing;
  const listRef = useRevealList<HTMLDivElement>([billing?.invoices.length]);

  // Sempre a situação mais recente ao abrir a página.
  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  if (profile && !profile.permissions.isManager) {
    return (
      <div className="space-y-6">
        <PageIntro eyebrow="Assinatura" title="Acesso restrito" description="A assinatura do musclePro fica com o responsável pela academia e a gestão." />
        <EmptyState icon={<ShieldAlert className="h-5 w-5" strokeWidth={2.2} />} title="Você não tem acesso a esta página" description="Fale com o responsável pela academia." />
      </div>
    );
  }

  const trialLeft = billing?.trialEndsAt ? daysFromToday(toDateValue(new Date(billing.trialEndsAt))) : null;
  const invoices = billing?.invoices ?? [];
  const company = profile?.companyName ?? "academia";

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Assinatura"
        title="Sua assinatura musclePro"
        description="Plano, vencimentos e faturas da academia no musclePro."
        actions={<SubscriptionBadge subscription={subscription} />}
      />

      {billing?.readOnly && (
        <section className="rounded-card border border-danger-200 bg-danger-50/60 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-danger-700" strokeWidth={2.2} />
            <div className="text-[13px] leading-[1.6] text-danger-800">
              <p className="text-[14px] font-bold">O sistema está em modo leitura</p>
              <p className="mt-1">
                Você e a equipe continuam vendo alunos, pagamentos, treinos e relatórios, e nada foi apagado. Cadastrar, editar e excluir
                voltam assim que a fatura em atraso for paga. A área do aluno continua funcionando para os seus alunos.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard icon={<BadgeCheck className="h-4 w-4" strokeWidth={2.2} />} label="Plano">
          <p className="text-[20px] font-bold tracking-[-0.015em] text-ink-900">{billing?.planName ?? "Nenhum plano escolhido"}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {billing?.price !== undefined && billing.planMonths
              ? `${formatCurrencyDetailed(billing.price)} ${billing.planMonths === 1 ? "por mês" : `a cada ${billing.planMonths} meses`}`
              : "Escolha abaixo. A cobrança só começa no fim do teste grátis."}
          </p>
        </InfoCard>
        <InfoCard icon={<CalendarClock className="h-4 w-4" strokeWidth={2.2} />} label={billing?.status === "trial" ? "Teste grátis" : "Próximo vencimento"}>
          {billing?.status === "trial" && billing.trialEndsAt ? (
            <>
              <p className="text-[20px] font-bold tracking-[-0.015em] text-ink-900">
                {trialLeft !== null && trialLeft > 0 ? `${trialLeft} dia${trialLeft === 1 ? "" : "s"}` : "Termina hoje"}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">Até {formatDateValue(toDateValue(new Date(billing.trialEndsAt)))}</p>
            </>
          ) : (
            <>
              <p className={cn("text-[20px] font-bold tracking-[-0.015em]", billing?.status === "atrasado" ? "text-danger-700" : "text-ink-900")}>
                {billing?.overdueSince ? `Vencida em ${formatDateValue(billing.overdueSince)}` : billing?.nextDueOn ? formatDateValue(billing.nextDueOn) : "—"}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                {billing?.overdueSince
                  ? billing.readOnly
                    ? "Com o pagamento confirmado, cadastros e edições voltam na hora."
                    : `Carência de ${billing.graceDays} dias antes do modo leitura.`
                  : billing?.nextDueOn
                    ? `Em ${Math.max(0, daysFromToday(billing.nextDueOn))} dia${daysFromToday(billing.nextDueOn) === 1 ? "" : "s"}.`
                    : "Nenhuma fatura em aberto."}
              </p>
            </>
          )}
        </InfoCard>
        <InfoCard icon={<Mail className="h-4 w-4" strokeWidth={2.2} />} label="Como pagar">
          <p className="text-[13px] leading-[1.55] text-ink-700">
            Por enquanto os pagamentos são combinados e confirmados pela equipe musclePro. Em breve você paga por Pix, boleto ou cartão aqui
            mesmo.
          </p>
          <Link href="/plataforma/fale-conosco" className="mt-2 inline-flex text-[12.5px] font-semibold text-brand hover:underline">
            Falar com a equipe musclePro
          </Link>
        </InfoCard>
      </div>

      {!invoices.some((i) => i.status === "paga") && billing?.status !== "cancelado" && (
        <section className="rounded-card border border-ink-200 bg-white p-4 md:p-5">
          <h2 className="text-[13.5px] font-bold text-ink-900">{billing?.planName ? "Seu plano" : "Escolha seu plano"}</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-ink-500">
            {profile?.isOwner
              ? "Nada é cobrado agora: a primeira fatura vence no fim do teste grátis."
              : "Só o responsável pela conta escolhe o plano."}
          </p>
          <PlanPicker />
        </section>
      )}

      <section className="rounded-card border border-ink-200 bg-white">
        <header className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 md:px-5">
          <Wallet className="h-4 w-4 text-ink-500" strokeWidth={2.2} />
          <h2 className="text-[13.5px] font-bold text-ink-900">Faturas</h2>
        </header>
        {invoices.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12.5px] text-ink-500 md:px-5">
            {billing?.status === "trial" ? "Durante o teste grátis não há cobranças." : "Nenhuma fatura ainda."}
          </p>
        ) : (
          <div ref={listRef} className="divide-y divide-ink-100">
            {invoices.map((inv) => {
              const late = inv.status === "aberta" && daysFromToday(inv.dueOn) < 0;
              return (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink-900">
                      {inv.planName ?? "Assinatura"} · {formatDateValue(inv.periodStart)} a {formatDateValue(inv.periodEnd)}
                    </p>
                    <p className="text-[11.5px] text-ink-500">
                      {inv.status === "paga" && inv.paidAt ? `Paga em ${formatDateValue(inv.paidAt.slice(0, 10))}` : `Vence ${formatDateValue(inv.dueOn)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13.5px] font-bold tabular-nums text-ink-900">{formatCurrencyDetailed(inv.amount)}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                        inv.status === "paga"
                          ? "bg-success-50 text-success-700 ring-success-200"
                          : late
                            ? "bg-danger-50 text-danger-700 ring-danger-200"
                            : "bg-warning-50 text-warning-800 ring-warning-200",
                      )}
                    >
                      {inv.status === "paga" ? "Paga" : late ? "Em atraso" : "Em aberto"}
                    </span>
                    {inv.gatewayUrl && inv.status === "aberta" && (
                      <a href={inv.gatewayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-btn bg-brand px-3 text-[12px] font-semibold text-white">
                        Pagar
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-ink-200 bg-white p-4 md:p-5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}
