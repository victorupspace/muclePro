"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { SUBSCRIPTION_LABEL } from "@/lib/plataforma/format";
import type { Subscription } from "@/lib/plataforma/types";

const STYLES = {
  ativo: { pill: "bg-success-50 text-success-700 ring-success-200", Icon: CheckCircle2, short: "Ativa" },
  trial: { pill: "bg-warning-50 text-warning-700 ring-warning-200", Icon: Clock, short: "Trial" },
  atrasado: { pill: "bg-danger-50 text-danger-700 ring-danger-200", Icon: AlertTriangle, short: "Atraso" },
  leitura: { pill: "bg-danger-600 text-white ring-danger-700", Icon: Lock, short: "Leitura" },
  cancelado: { pill: "bg-ink-100 text-ink-600 ring-ink-200", Icon: XCircle, short: "Cancelada" },
};

export function SubscriptionBadge({ subscription }: { subscription: Subscription }) {
  const { pill, Icon, short } = STYLES[subscription.status];
  return (
    <Link
      href="/plataforma/assinatura"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold ring-1 ring-inset transition-opacity hover:opacity-85",
        pill,
      )}
      title={`${SUBSCRIPTION_LABEL[subscription.status]} · ${subscription.plan}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      <span className="hidden sm:inline">{SUBSCRIPTION_LABEL[subscription.status]}</span>
      <span className="sm:hidden">{short}</span>
    </Link>
  );
}
