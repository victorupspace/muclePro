"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  ListChecks,
  MessageCircle,
  RefreshCcw,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SelectFilter } from "@/components/admin/Filters";
import { useRevealList } from "./motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { ACTIVITY_KIND_LABEL, formatDateTime } from "@/lib/plataforma/format";
import type { StudentActivity, StudentActivityKind } from "@/lib/plataforma/types";

const KIND_ICON: Record<StudentActivityKind, LucideIcon> = {
  cadastro: Sparkles,
  nota: StickyNote,
  pagamento: CreditCard,
  cobranca: Send,
  plano: CreditCard,
  status: RefreshCcw,
  contato: MessageCircle,
  tarefa: ListChecks,
};

const KIND_OPTIONS = [
  { value: "all", label: "Todas" },
  ...(Object.keys(ACTIVITY_KIND_LABEL) as StudentActivityKind[]).map((value) => ({
    value,
    label: ACTIVITY_KIND_LABEL[value],
  })),
];

// Só registros feitos à mão podem ser apagados; os automáticos são o rastro
// do sistema.
const DELETABLE: StudentActivityKind[] = ["nota", "contato", "cobranca"];

export function StudentAtividadesTab({
  activities,
  onDelete,
}: {
  activities: StudentActivity[];
  onDelete: (activityId: string) => void;
}) {
  const [kind, setKind] = useState<string>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(
    () => activities.filter((a) => (kind === "all" ? true : a.kind === kind)),
    [activities, kind],
  );
  const listRef = useRevealList<HTMLOListElement>([filtered.length, kind]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SelectFilter label="Tipo" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        <p className="text-[12px] text-ink-500">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nada por aqui ainda"
          description="Pagamentos, cobranças, notas e contatos aparecem nesta linha do tempo."
        />
      ) : (
        <ol ref={listRef} className="relative space-y-0 rounded-card border border-ink-200 bg-white">
          {filtered.map((evt, i) => {
            const Icon = KIND_ICON[evt.kind];
            const deletable = DELETABLE.includes(evt.kind);
            return (
              <li
                key={evt.id}
                className={cn(
                  "relative flex items-start gap-3 px-4 py-3.5 md:px-5",
                  i < filtered.length - 1 && "border-b border-ink-100",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    evt.kind === "pagamento"
                      ? "bg-success-50 text-success-700"
                      : evt.kind === "cobranca"
                        ? "bg-warning-50 text-warning-800"
                        : "bg-brand/10 text-brand",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink-900">{evt.title}</p>
                    <span className="shrink-0 text-[11px] text-ink-400">{formatDateTime(evt.at)}</span>
                  </div>
                  {evt.body && <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-600">{evt.body}</p>}
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                      {ACTIVITY_KIND_LABEL[evt.kind]} · {evt.by}
                    </p>
                    {deletable &&
                      (confirmId === evt.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="inline-flex h-7 items-center rounded-btn px-2 text-[11px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                          >
                            Manter
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(evt.id);
                              setConfirmId(null);
                            }}
                            className="inline-flex h-7 items-center gap-1 rounded-btn bg-danger-50 px-2.5 text-[11px] font-semibold text-danger-700 ring-1 ring-inset ring-danger-200 transition-colors hover:bg-danger-100"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={2.4} />
                            Excluir registro
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(evt.id)}
                          aria-label="Excluir registro"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                      ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </motion.div>
  );
}
