"use client";

import { Sparkles } from "lucide-react";
import type { Client } from "@/lib/plataforma/types";
import type { NextBestAction } from "@/lib/plataforma/next-best-action";
import { ModuleCard, ModuleEmpty } from "./ModuleCard";
import { NextBestActionRow } from "./NextBestActionRow";

type Props = {
  actions: NextBestAction[];
  clients: Client[];
  loading?: boolean;
  error?: string | null;
  onSeeAll: () => void;
  onExecute: (action: NextBestAction) => void;
  onOpenClient: (clientId: string) => void;
};

export function NextBestActionModule({
  actions,
  clients,
  loading,
  error,
  onSeeAll,
  onExecute,
  onOpenClient,
}: Props) {
  const top = actions.slice(0, 4);
  const critical = actions.filter((a) => a.priority === "critical").length;

  return (
    <ModuleCard
      title="Ações recomendadas"
      hint={
        loading
          ? "Calculando próximas ações…"
          : error
            ? "Não foi possível carregar"
            : actions.length === 0
              ? "Sua carteira está organizada"
              : `${critical} crítica${critical === 1 ? "" : "s"} · ${actions.length - critical} demais`
      }
      icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />}
      count={actions.length}
      countTone={critical > 0 ? "danger" : actions.length > 0 ? "warn" : "default"}
      onSeeAll={actions.length > 4 ? onSeeAll : undefined}
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse rounded-btn border border-ink-100 bg-ink-50/60"
            />
          ))}
        </div>
      ) : error ? (
        <ModuleEmpty>
          {error}
          <span className="block text-[10.5px] text-ink-500">Tente recarregar a página.</span>
        </ModuleEmpty>
      ) : top.length === 0 ? (
        <ModuleEmpty>
          Nenhuma ação urgente no momento.
          <span className="mt-0.5 block text-[10.5px] text-ink-500">
            Novas recomendações aparecerão conforme clientes, propostas e follow-ups avançarem.
          </span>
        </ModuleEmpty>
      ) : (
        <ul className="space-y-1.5">
          {top.map((action) => {
            const client = clients.find((c) => c.id === action.clientId);
            if (!client) return null;
            return (
              <NextBestActionRow
                key={action.id}
                action={action}
                client={client}
                onExecute={() => onExecute(action)}
                onOpenClient={() => onOpenClient(client.id)}
              />
            );
          })}
        </ul>
      )}
    </ModuleCard>
  );
}
