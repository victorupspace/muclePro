"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, MessageSquare, Trash2, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { LeadStatusBadge } from "@/components/admin/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminStore } from "@/lib/admin/store";
import { formatRelative } from "@/lib/admin/format";
import { onlyDigits } from "@/lib/cadastro/masks";
import type { ComercializadoraLead, ComercializadoraStatus } from "@/lib/admin/types";

const STATUS_OPTIONS: { value: "all" | ComercializadoraStatus; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "aguardando", label: "Aguardando contato" },
  { value: "em_contato", label: "Em contato" },
  { value: "convertida", label: "Convertida" },
  { value: "perdida", label: "Perdida" },
];

export default function ComercializadorasPage() {
  const { leads, setLeadStatus, removeLead } = useAdminStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return leads
      .filter((l) => (status === "all" ? true : l.status === status))
      .filter((l) => {
        if (!q) return true;
        return (
          l.fullName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          onlyDigits(l.phone).includes(qDigits)
        );
      });
  }, [leads, status, search]);

  const deleteLead = confirmDelete ? leads.find((l) => l.id === confirmDelete) : undefined;

  const columns: Column<ComercializadoraLead>[] = [
    {
      key: "name",
      header: "Responsável",
      mobilePrimary: true,
      render: (l) => (
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <p className="truncate font-semibold text-ink-900">{l.fullName}</p>
            <span className="shrink-0 md:hidden">
              <LeadStatusBadge status={l.status} />
            </span>
          </div>
          <p className="truncate text-[11.5px] text-ink-500">{l.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (l) => <span className="text-[12.5px] text-ink-700">{l.phone}</span>,
    },
    {
      key: "requested",
      header: "Solicitada",
      render: (l) => (
        <span className="text-[12px] text-ink-500" title={l.requestedAt}>
          {formatRelative(l.requestedAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (l) => <LeadStatusBadge status={l.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comercializadoras"
        description="Solicitações de contato vindas do fluxo consultivo de comercializadoras na landing page."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full lg:max-w-[420px]"
          placeholder="Buscar por nome, email ou telefone"
        />
        <SelectFilter label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(l) => l.id}
        emptyState={
          <EmptyState
            title="Nenhuma comercializadora encontrada"
            description="Ajuste a busca ou os filtros, ou aguarde novas solicitações da landing page."
          />
        }
        actions={(l) => (
          <>
            <TableButton
              onClick={() => setLeadStatus(l.id, "em_contato")}
              disabled={l.status === "em_contato"}
            >
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
              Em contato
            </TableButton>
            <TableButton
              tone="success"
              onClick={() => setLeadStatus(l.id, "convertida")}
              disabled={l.status === "convertida"}
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Convertida
            </TableButton>
            <TableButton
              onClick={() => setLeadStatus(l.id, "perdida")}
              disabled={l.status === "perdida"}
            >
              <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
              Perdida
            </TableButton>
            <TableButton tone="danger" onClick={() => setConfirmDelete(l.id)}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Deletar
            </TableButton>
          </>
        )}
      />

      <ConfirmDialog
        open={!!deleteLead}
        title="Tem certeza que deseja deletar esta solicitação?"
        description="Essa ação não poderá ser desfeita. O contato da comercializadora será removido do backoffice."
        confirmLabel="Deletar solicitação"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (deleteLead) removeLead(deleteLead.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
