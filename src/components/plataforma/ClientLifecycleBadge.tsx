import { cn } from "@/lib/cn";
import { CLIENT_LIFECYCLE_LABEL } from "@/lib/plataforma/format";
import type { ClientLifecycleStatus } from "@/lib/plataforma/types";

const TONE: Record<ClientLifecycleStatus, { wrap: string; dot: string }> = {
  novo: {
    wrap: "bg-brand/8 text-brand ring-brand/25",
    dot: "bg-brand",
  },
  qualificando: {
    wrap: "bg-warning-50 text-warning-700 ring-warning-200",
    dot: "bg-warning-500",
  },
  proposta_enviada: {
    wrap: "bg-info-50 text-info-700 ring-info-200",
    dot: "bg-info-500",
  },
  em_negociacao: {
    wrap: "bg-warning-50 text-warning-700 ring-warning-200",
    dot: "bg-warning-500",
  },
  assinado: {
    wrap: "bg-success-50 text-success-700 ring-success-200",
    dot: "bg-success-500",
  },
  migrando: {
    wrap: "bg-info-50 text-info-700 ring-info-200",
    dot: "bg-info-500",
  },
  ativo: {
    wrap: "bg-success-50 text-success-700 ring-success-200",
    dot: "bg-success-500",
  },
  inativo: {
    wrap: "bg-ink-100 text-ink-500 ring-ink-200",
    dot: "bg-ink-400",
  },
};

export function ClientLifecycleBadge({ status }: { status: ClientLifecycleStatus }) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
        tone.wrap,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {CLIENT_LIFECYCLE_LABEL[status]}
    </span>
  );
}
