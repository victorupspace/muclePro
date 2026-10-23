"use client";

import {
  CheckCircle2,
  CreditCard,
  Inbox,
  PauseCircle,
  Sparkles,
  TimerReset,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { useAdminStore } from "@/lib/admin/store";
import { formatRelative } from "@/lib/admin/format";

export default function VisaoGeralPage() {
  const { accounts, landingLeads } = useAdminStore();

  const novas = accounts.filter((a) => a.status === "nova");
  const aprovadas = accounts.filter((a) => a.status === "criada");
  const ativas = accounts.filter((a) => a.active);
  const inativas = accounts.filter((a) => !a.active);
  const pagamentosEmDia = accounts.filter((a) => a.payment.status === "em_dia").length;
  const pagamentosPendentes = accounts.filter((a) =>
    ["pendente", "atrasado"].includes(a.payment.status),
  ).length;
  const landingAguardando = landingLeads.filter((l) => l.status === "aguardando").length;

  const recentEvents = accounts
    .flatMap((a) => a.history.map((h) => ({ ...h, account: a })))
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 6);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Visão geral"
        description="Resumo operacional do musclePro. Os números abaixo refletem o estado atual dos cadastros, contas aprovadas e pagamentos."
      />

      <section>
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Cadastros & contas
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total de cadastros"
            value={accounts.length}
            hint="Estabelecimentos cadastrados"
            icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />}
          />
          <StatCard
            label="Contas novas"
            value={novas.length}
            hint="Aguardando aprovação"
            highlight={novas.length > 0}
            icon={<UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />}
            href="/admin/backoffice/contas-novas"
          />
          <StatCard
            label="Contas aprovadas"
            value={aprovadas.length}
            hint="Aprovadas pelo time"
            icon={<UserCheck className="h-3.5 w-3.5" strokeWidth={2.2} />}
            href="/admin/backoffice/contas-ativas"
          />
          <StatCard
            label="Leads da landing"
            value={landingAguardando}
            hint="Leads aguardando contato"
            highlight={landingAguardando > 0}
            icon={<Inbox className="h-3.5 w-3.5" strokeWidth={2.2} />}
            href="/admin/backoffice/leads-landing"
          />
        </div>
      </section>

      <section>
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Atividade & pagamentos
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Contas ativas"
            value={ativas.length}
            hint="Com acesso à plataforma liberado"
            icon={<CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />}
          />
          <StatCard
            label="Contas inativas"
            value={inativas.length}
            hint="Desativadas manualmente"
            icon={<PauseCircle className="h-3.5 w-3.5" strokeWidth={2.2} />}
          />
          <StatCard
            label="Pagamentos em dia"
            value={pagamentosEmDia}
            icon={<CreditCard className="h-3.5 w-3.5" strokeWidth={2.2} />}
            href="/admin/backoffice/pagamentos"
          />
          <StatCard
            label="Pagamentos pendentes"
            value={pagamentosPendentes}
            highlight={pagamentosPendentes > 0}
            hint="Pendentes ou atrasados"
            icon={<TimerReset className="h-3.5 w-3.5" strokeWidth={2.2} />}
            href="/admin/backoffice/pagamentos"
          />
        </div>
      </section>

      <section className="rounded-card border border-ink-200 bg-white">
        <header className="flex items-center justify-between border-b border-ink-200 px-4 py-4 md:px-5">
          <div>
            <h2 className="text-[14px] font-bold text-ink-900">Atividade recente</h2>
            <p className="text-[12px] text-ink-500">Últimas ações registradas no sistema.</p>
          </div>
        </header>
        <ol className="divide-y divide-ink-100">
          {recentEvents.map((evt) => (
            <li key={`${evt.account.id}-${evt.id}`} className="flex items-start gap-3 px-4 py-3.5 md:px-5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-ink-900">{evt.label}</p>
                  <span className="shrink-0 text-[11px] text-ink-400">{formatRelative(evt.at)}</span>
                </div>
                <p className="truncate text-[11.5px] text-ink-500">
                  {evt.account.companyName ?? evt.account.fullName} · {evt.account.email}
                </p>
              </div>
            </li>
          ))}
          {recentEvents.length === 0 && (
            <li className="px-5 py-8 text-center text-[12.5px] text-ink-500">
              Nenhuma atividade registrada ainda.
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}
