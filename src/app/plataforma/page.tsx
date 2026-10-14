"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  FileSpreadsheet,
  ListTodo,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { KpiCard } from "@/components/plataforma/KpiCard";
import { MarketInsights } from "@/components/plataforma/MarketInsights";
import { AddClientModal } from "@/components/plataforma/AddClientModal";
import { AddTaskModal } from "@/components/plataforma/AddTaskModal";
import { EASE } from "@/lib/motion";
import { formatCurrency, formatNumber } from "@/lib/plataforma/format";
import { useConsultorSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";

export default function PlataformaDashboardPage() {
  const router = useRouter();
  const { profile } = useConsultorSession();
  const { error, loading, metrics } = usePlataformaStore();
  const [addClient, setAddClient] = useState(false);
  const [addTask, setAddTask] = useState(false);

  const firstName = profile?.fullName.split(" ")[0] ?? "";

  return (
    <div className="space-y-6 md:space-y-7">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Dashboard
        </p>
        <h1 className="mt-1 text-[22px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[26px]">
          Olá, {firstName} 👋
        </h1>
        <p className="mt-1 max-w-[640px] text-[13px] leading-[1.55] text-ink-500">
          Visão rápida da sua carteira. Comece pelo que está em aberto e acompanhe os
          movimentos do mercado.
        </p>
      </motion.header>

      {error && (
        <div className="rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[13px] font-medium text-danger-700">
          Não foi possível sincronizar a plataforma: {error}
        </div>
      )}

      {loading && (
        <div className="rounded-card border border-ink-200 bg-white px-4 py-3 text-[13px] font-medium text-ink-500">
          Carregando seus dados...
        </div>
      )}

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <KpiCard
            label="Nova simulação"
            value={<span className="text-ink-900">Simulador</span>}
            hint="Calcule a economia em segundos"
            icon={<Calculator className="h-3.5 w-3.5" strokeWidth={2.4} />}
            action={{
              label: "Iniciar simulação",
              onClick: () => router.push("/plataforma/simulador"),
              icon: <Calculator className="h-3.5 w-3.5" strokeWidth={2.2} />,
            }}
            delay={0.05}
          />
          <KpiCard
            label="Clientes totais"
            value={formatNumber(metrics.totalClients)}
            hint="Carteira cadastrada"
            icon={<Users className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/clientes"
            action={{
              label: "Adicionar novo cliente",
              onClick: () => setAddClient(true),
              icon: <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />,
            }}
            delay={0.1}
          />
          <KpiCard
            label="Tarefas em aberto"
            value={formatNumber(metrics.openTasks)}
            hint="Foco do dia"
            highlight={metrics.openTasks > 0}
            icon={<ListTodo className="h-3.5 w-3.5" strokeWidth={2.4} />}
            action={{
              label: "Adicionar nova tarefa",
              onClick: () => setAddTask(true),
              icon: <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />,
            }}
            delay={0.15}
          />
          <KpiCard
            label="Propostas enviadas"
            value={formatNumber(metrics.proposalsSent)}
            hint="No total da carteira"
            icon={<FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/relatorios"
            delay={0.2}
          />
          <KpiCard
            label="Economia gerada na carteira"
            value={formatCurrency(metrics.walletSavings)}
            hint="Mensal estimado"
            highlight
            icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/relatorios"
            delay={0.25}
          />
        </div>
      </section>

      <MarketInsights />

      <AddClientModal open={addClient} onClose={() => setAddClient(false)} />
      <AddTaskModal open={addTask} onClose={() => setAddTask(false)} />
    </div>
  );
}
