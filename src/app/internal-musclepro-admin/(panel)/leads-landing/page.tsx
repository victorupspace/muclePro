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
import {
  LANDING_LEAD_KIND_LABEL,
  formatRelative,
} from "@/lib/admin/format";
import { onlyDigits } from "@/lib/cadastro/masks";
import type {
  LandingLead,
  LandingLeadKind,
  LandingLeadStatus,
} from "@/lib/admin/types";

const KIND_OPTIONS: { value: "all" | LandingLeadKind; label: string }[] = [
  { value: "all", label: "Todos os perfis" },
  { value: "consultor", label: "Consultor" },
  { value: "comercializadora", label: "Comercializadora" },
  { value: "consumidor", label: "Consumidor final" },
];

const STATUS_OPTIONS: { value: "all" | LandingLeadStatus; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "aguardando", label: "Aguardando contato" },
  { value: "em_contato", label: "Em contato" },
  { value: "convertida", label: "Convertida" },
  { value: "perdida", label: "Perdida" },
];

export default function LeadsLandingPage() {
  const { landingLeads, setLandingLeadStatus, removeLandingLead } = useAdminStore();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return landingLeads
      .filter((lead) => (kind === "all" ? true : lead.clientType === kind))
      .filter((lead) => (status === "all" ? true : lead.status === status))
      .filter((lead) => {
        if (!q) return true;
        return (
          lead.fullName.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          onlyDigits(lead.phone).includes(qDigits) ||
          LANDING_LEAD_KIND_LABEL[lead.clientType].toLowerCase().includes(q) ||
          (lead.segment?.toLowerCase().includes(q) ?? false) ||
          lead.regions.some((region) => region.toLowerCase().includes(q))
        );
      });
  }, [landingLeads, kind, status, search]);

  const deleteLead = confirmDelete
    ? landingLeads.find((lead) => lead.id === confirmDelete)
    : undefined;

  const columns: Column<LandingLead>[] = [
    {
      key: "name",
      header: "Contato",
      mobilePrimary: true,
      render: (lead) => (
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <p className="truncate font-semibold text-ink-900">{lead.fullName}</p>
            <span className="shrink-0 md:hidden">
              <LeadStatusBadge status={lead.status} />
            </span>
          </div>
          <p className="truncate text-[11.5px] text-ink-500">{lead.email}</p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Perfil",
      render: (lead) => (
        <span className="text-[12px] font-semibold text-ink-700">
          {LANDING_LEAD_KIND_LABEL[lead.clientType]}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (lead) => <span className="text-[12.5px] text-ink-700">{lead.phone}</span>,
    },
    {
      key: "details",
      header: "Contexto",
      mobileLayout: "stacked",
      render: (lead) => <LeadContext lead={lead} />,
    },
    {
      key: "requested",
      header: "Recebido",
      render: (lead) => (
        <span className="text-[12px] text-ink-500" title={lead.requestedAt}>
          {formatRelative(lead.requestedAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (lead) => <LeadStatusBadge status={lead.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads da landing"
        description="Todos os diagnósticos enviados pelo formulário principal da landing page, separados por perfil e status comercial."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full lg:max-w-[420px]"
          placeholder="Buscar por nome, email, telefone, perfil ou contexto"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectFilter label="Perfil" value={kind} onChange={setKind} options={KIND_OPTIONS} />
          <SelectFilter label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(lead) => lead.id}
        emptyState={
          <EmptyState
            title="Nenhum lead da landing encontrado"
            description="Ajuste os filtros ou aguarde novos envios do formulário principal."
          />
        }
        actions={(lead) => (
          <>
            <TableButton
              onClick={() => setLandingLeadStatus(lead.id, "em_contato")}
              disabled={lead.status === "em_contato"}
            >
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
              Em contato
            </TableButton>
            <TableButton
              tone="success"
              onClick={() => setLandingLeadStatus(lead.id, "convertida")}
              disabled={lead.status === "convertida"}
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Convertida
            </TableButton>
            <TableButton
              onClick={() => setLandingLeadStatus(lead.id, "perdida")}
              disabled={lead.status === "perdida"}
            >
              <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
              Perdida
            </TableButton>
            <TableButton tone="danger" onClick={() => setConfirmDelete(lead.id)}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Deletar
            </TableButton>
          </>
        )}
      />

      <ConfirmDialog
        open={!!deleteLead}
        title="Tem certeza que deseja deletar este lead?"
        description={
          deleteLead
            ? `O envio de ${deleteLead.fullName} será removido da fila de leads da landing.`
            : ""
        }
        confirmLabel="Deletar lead"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (deleteLead) void removeLandingLead(deleteLead.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function LeadContext({ lead }: { lead: LandingLead }) {
  const items = [
    lead.regions.length > 0 ? `Regiões: ${lead.regions.join(", ")}` : null,
    lead.hasPartnerNetwork === null || lead.hasPartnerNetwork === undefined
      ? null
      : `Rede de parceiros: ${lead.hasPartnerNetwork ? "sim" : "não"}`,
    lead.commercializerSize ? `Porte: ${lead.commercializerSize}` : null,
    lead.segment ? `Segmento: ${lead.segment}` : null,
    lead.monthlyEnergySpend ? `Gasto: ${lead.monthlyEnergySpend}` : null,
  ].filter(Boolean);

  if (items.length === 0) {
    return <span className="text-[12.5px] text-ink-400">—</span>;
  }

  return (
    <span className="text-[12.5px] leading-[1.45] text-ink-700 md:line-clamp-2">
      {items.join(" · ")}
    </span>
  );
}
