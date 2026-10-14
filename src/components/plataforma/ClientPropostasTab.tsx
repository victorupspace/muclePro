"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, CheckCircle2, Download, Eye, FileText, Send, Trash2 } from "lucide-react";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SelectFilter } from "@/components/admin/Filters";
import { Modal } from "@/components/plataforma/Modal";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  SIMULATION_STATUS_LABEL,
  formatCurrencyDetailed,
  formatDateLong,
  formatRelative,
} from "@/lib/plataforma/format";
import {
  blobToDataUrl,
  createSimulationProposalPdf,
  simulationPdfFileName,
} from "@/lib/plataforma/proposal-pdf";
import { useConsultorSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Simulation, SimulationStatus } from "@/lib/plataforma/types";

const STATUS_OPTIONS: { value: "all" | SimulationStatus; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "arquivada", label: "Arquivada" },
];

const STATUS_TONE: Record<SimulationStatus, string> = {
  rascunho: "bg-ink-100 text-ink-600 ring-ink-200",
  enviada: "bg-success-50 text-success-700 ring-success-200",
  arquivada: "bg-warning-50 text-warning-700 ring-warning-200",
};

export function ClientPropostasTab({ clientId, onSimulate }: { clientId: string; onSimulate: () => void }) {
  const { profile: consultant } = useConsultorSession();
  const {
    clients,
    simulations,
    getClientProfile,
    updateSimulation,
    removeSimulation,
  } = usePlataformaStore();
  const [status, setStatus] = useState<string>("all");
  const [details, setDetails] = useState<Simulation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Simulation | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const profile = getClientProfile(clientId);

  const rows = useMemo(
    () =>
      simulations
        .filter((s) => s.clientId === clientId)
        .filter((s) => (status === "all" ? true : s.status === status))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [simulations, clientId, status],
  );

  const columns: Column<Simulation>[] = [
    {
      key: "title",
      header: "Simulação",
      mobilePrimary: true,
      render: (simulation) => (
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <p className="truncate font-semibold text-ink-900">
              {simulation.simulationData.client.companyName ||
                simulation.simulationData.client.name ||
                "Simulação ACL"}
            </p>
            <span className="shrink-0 md:hidden">
              <StatusPill status={simulation.status} />
            </span>
          </div>
          <p className="truncate text-[11.5px] text-ink-500">
            Criada em {formatDateLong(simulation.createdAt)}
            {simulation.pdfUrl ? " · PDF disponível" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "economy",
      header: "Economia",
      mobileLabel: "Economia",
      render: (simulation) => (
        <span className="text-[12.5px] font-semibold text-ink-900">
          {formatCurrencyDetailed(simulation.resultsData.monthlySavings)}/mês
        </span>
      ),
    },
    {
      key: "sent",
      header: "Enviada",
      mobileLabel: "Enviada",
      render: (simulation) => (
        <span className="text-[12px] text-ink-500">
          {simulation.sentAt ? formatRelative(simulation.sentAt) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (simulation) => <StatusPill status={simulation.status} />,
    },
  ];

  async function handleSend(simulation: Simulation) {
    await updateSimulation(simulation.id, {
      status: "enviada",
      sentAt: new Date().toISOString(),
    });
  }

  async function handleGeneratePdf(simulation: Simulation) {
    if (!client) return;
    setGeneratingId(simulation.id);
    try {
      const blob = createSimulationProposalPdf({ simulation, client, profile, consultant });
      const dataUrl = await blobToDataUrl(blob);
      await updateSimulation(simulation.id, { pdfUrl: dataUrl });
      downloadDataUrl(dataUrl, simulationPdfFileName(simulation, client));
      setToast("PDF gerado com sucesso.");
      window.setTimeout(() => setToast(null), 2600);
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await removeSimulation(confirmDelete.id);
    setConfirmDelete(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-5"
    >
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-card border border-success-200 bg-success-50 px-4 py-3 text-[13px] font-semibold text-success-700"
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
          {toast}
        </motion.div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SelectFilter label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <button
          type="button"
          onClick={onSimulate}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Calculator className="h-3.5 w-3.5" strokeWidth={2.4} />
          Nova simulação
        </button>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(simulation) => simulation.id}
        emptyState={
          <EmptyState
            title="Nenhuma simulação por aqui"
            description="Comece pelo simulador para registrar a primeira proposta econômica deste cliente."
            icon={<FileText className="h-5 w-5" strokeWidth={2.2} />}
          />
        }
        actions={(simulation) => (
          <>
            <TableButton onClick={() => setDetails(simulation)}>
              <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
              Abrir
            </TableButton>
            <TableButton
              onClick={() => void handleSend(simulation)}
              disabled={simulation.status === "enviada"}
              className="border-brand bg-brand text-white hover:border-brand-hover hover:bg-brand-hover"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
              {simulation.status === "enviada" ? "Enviada" : "Enviar"}
            </TableButton>
            <TableButton
              onClick={() => void handleGeneratePdf(simulation)}
              disabled={generatingId === simulation.id}
              className="border-ink-300 bg-white text-ink-800 hover:border-brand/50 hover:bg-brand/[0.06] hover:text-brand"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
              {generatingId === simulation.id ? "Gerando..." : "Gerar PDF"}
            </TableButton>
            <TableButton tone="danger" onClick={() => setConfirmDelete(simulation)}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Excluir
            </TableButton>
          </>
        )}
      />

      <SimulationDetailsModal simulation={details} onClose={() => setDetails(null)} />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Excluir simulação"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="inline-flex h-10 items-center justify-center rounded-btn border border-ink-200 bg-white px-4 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex h-10 items-center justify-center rounded-btn bg-danger-600 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-danger-700"
            >
              Excluir simulação
            </button>
          </div>
        }
      >
        <div className="space-y-2 text-[13px] leading-[1.55] text-ink-600">
          <p className="font-semibold text-ink-900">Tem certeza que deseja excluir esta simulação?</p>
          <p>Essa ação não poderá ser desfeita.</p>
        </div>
      </Modal>
    </motion.div>
  );
}

function SimulationDetailsModal({
  simulation,
  onClose,
}: {
  simulation: Simulation | null;
  onClose: () => void;
}) {
  if (!simulation) {
    return <Modal open={false} onClose={onClose} title="Simulação"><span /></Modal>;
  }

  const data = simulation.simulationData;
  const results = simulation.resultsData;

  return (
    <Modal open={!!simulation} onClose={onClose} title="Detalhes da simulação">
      <div className="space-y-5">
        <div className="rounded-card border border-brand/30 bg-brand/[0.06] p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand">
            Economia mensal estimada
          </p>
          <p className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-ink-900">
            {formatCurrencyDetailed(results.monthlySavings)}
          </p>
          <p className="mt-1 text-[12px] text-ink-500">
            {results.savingsPercent.toFixed(1)}% de redução estimada frente ao mercado cativo.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
          <Detail label="Cliente" value={data.client.companyName || data.client.name} />
          <Detail label="Distribuidora" value={data.client.distributor || "-"} />
          <Detail label="Conta atual" value={formatCurrencyDetailed(data.current.monthlyCost)} />
          <Detail label="Mercado livre" value={formatCurrencyDetailed(data.projected.monthlyCost)} />
          <Detail label="Comercializadora" value={data.projected.commercializer || "-"} />
          <Detail label="Fonte de energia" value={data.projected.energySource || "-"} />
          <Detail label="Prazo" value={`${data.projected.contractTermMonths} meses`} />
          <Detail label="Status" value={SIMULATION_STATUS_LABEL[simulation.status]} />
        </dl>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</dt>
      <dd className="mt-1 font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: SimulationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
        STATUS_TONE[status],
      )}
    >
      {SIMULATION_STATUS_LABEL[status]}
    </span>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
