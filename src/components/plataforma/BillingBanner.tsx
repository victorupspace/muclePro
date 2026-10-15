"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { daysFromToday, formatCurrencyDetailed, formatDateValue, toDateValue } from "@/lib/plataforma/format";
import type { AccountBilling } from "@/lib/plataforma/types";

type Notice = { tone: "info" | "warn" | "danger"; title: string; body: string };

// O que avisar no topo da plataforma, do mais grave ao mais leve.
export function billingNotice(b: AccountBilling | undefined): Notice | null {
  if (!b) return null;
  if (b.readOnly) {
    return {
      tone: "danger",
      title: b.status === "cancelado" ? "Assinatura cancelada: modo leitura" : "Modo leitura: assinatura em atraso",
      body: "Seus dados estão guardados e você pode consultar tudo. Novos cadastros e edições voltam assim que o pagamento for regularizado.",
    };
  }
  if (b.status === "atrasado" && b.overdueSince) {
    const lockIn = b.graceDays + daysFromToday(b.overdueSince) + 1;
    return {
      tone: "warn",
      title: `Fatura vencida desde ${formatDateValue(b.overdueSince)}`,
      body:
        lockIn > 0
          ? `Se não for paga em ${lockIn} dia${lockIn === 1 ? "" : "s"}, o sistema entra em modo leitura (nada é apagado).`
          : "Regularize hoje para não entrar em modo leitura.",
    };
  }
  if (b.status === "trial" && b.trialEndsAt) {
    const left = daysFromToday(toDateValue(new Date(b.trialEndsAt)));
    if (left <= 7) {
      return {
        tone: "info",
        title: left <= 0 ? "Seu teste grátis termina hoje" : `Seu teste grátis termina em ${left} dia${left === 1 ? "" : "s"}`,
        body: b.planName
          ? `Depois dele começa o plano ${b.planName}${b.price ? ` de ${formatCurrencyDetailed(b.price)}` : ""}.`
          : "Fale com a equipe musclePro para escolher seu plano e continuar sem interrupção.",
      };
    }
  }
  if (b.status === "pendente" && !b.nextDueOn && b.trialEndsAt && new Date(b.trialEndsAt).getTime() < Date.now()) {
    return {
      tone: "warn",
      title: "Seu teste grátis terminou",
      body: "Fale com a equipe musclePro para ativar seu plano. Sem plano, o sistema entra em modo leitura após a carência.",
    };
  }
  if (b.status === "pendente" && b.nextDueOn) {
    const days = daysFromToday(b.nextDueOn);
    if (days <= 5) {
      const open = b.invoices.find((i) => i.status === "aberta" && i.dueOn === b.nextDueOn);
      return {
        tone: "info",
        title: days === 0 ? "Sua fatura vence hoje" : `Sua fatura vence em ${days} dia${days === 1 ? "" : "s"}`,
        body: `${open ? `${formatCurrencyDetailed(open.amount)} · ` : ""}vencimento ${formatDateValue(b.nextDueOn)}.`,
      };
    }
  }
  return null;
}

export function BillingBanner({ billing, canSeeBilling }: { billing?: AccountBilling; canSeeBilling: boolean }) {
  const notice = billingNotice(billing);
  if (!notice) return null;
  const Icon = notice.tone === "danger" ? Lock : notice.tone === "warn" ? AlertTriangle : Clock;
  return (
    <div
      role={notice.tone === "info" ? "status" : "alert"}
      className={cn(
        "mb-5 flex flex-col gap-2 rounded-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        notice.tone === "danger" && "bg-danger-600 text-white",
        notice.tone === "warn" && "bg-warning-50 text-warning-800 ring-1 ring-inset ring-warning-200",
        notice.tone === "info" && "bg-brand/[0.06] text-ink-900 ring-1 ring-inset ring-brand/20",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
        <div>
          <p className="text-[13.5px] font-bold">{notice.title}</p>
          <p className={cn("text-[12.5px] leading-[1.5]", notice.tone === "danger" ? "text-white/85" : "text-ink-600")}>{notice.body}</p>
        </div>
      </div>
      {canSeeBilling && (
        <Link
          href="/plataforma/assinatura"
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center rounded-btn px-3.5 text-[12.5px] font-semibold",
            notice.tone === "danger" ? "bg-white text-danger-700" : "bg-brand text-white hover:bg-brand-hover",
          )}
        >
          Ver assinatura
        </Link>
      )}
    </div>
  );
}
