"use client";

import { useMemo, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { AddClientModal } from "@/components/plataforma/AddClientModal";
import { ClientLifecycleBadge } from "@/components/plataforma/ClientLifecycleBadge";
import { onlyDigits } from "@/lib/cadastro/masks";
import { CLIENT_MIGRATION_LABEL, CLIENT_MIGRATION_STAGES, formatCurrency, formatKwh, formatRelative } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { ClientLifecycleStatus } from "@/lib/plataforma/types";

const LIFECYCLE_OPTIONS: { value: "all" | ClientLifecycleStatus; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "novo", label: "Novo" },
  { value: "qualificando", label: "Qualificando" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "assinado", label: "Assinado" },
  { value: "migrando", label: "Migrando" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const SUBMERCADO_OPTIONS = [
  { value: "all", label: "Todos os submercados" },
  { value: "SE/CO", label: "SE/CO" },
  { value: "S", label: "S" },
  { value: "NE", label: "NE" },
  { value: "N", label: "N" },
];

export default function ClientesPage() {
  const { clients, getClientProfile, removeClient } = usePlataformaStore();

  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<string>("all");
  const [submercado, setSubmercado] = useState<string>("all");
  const [distribuidora, setDistribuidora] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      clients.flatMap((c) => {
        const profile = getClientProfile(c.id);
        if (!profile) return [];
        const primaryUnit = profile.units[0];
        return [{ client: c, profile, primaryUnit }];
      }),
    [clients, getClientProfile],
  );

  const distribuidoraOptions = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((row) => row.profile.units.forEach((u) => set.add(u.distribuidora)));
    return [
      { value: "all", label: "Todas as distribuidoras" },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((d) => ({ value: d, label: d })),
    ];
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return enriched.filter(({ client, profile }) => {
      if (lifecycle !== "all" && profile.lifecycle !== lifecycle) return false;
      if (submercado !== "all" && !profile.units.some((u) => u.submercado === submercado))
        return false;
      if (distribuidora !== "all" && !profile.units.some((u) => u.distribuidora === distribuidora))
        return false;
      if (!q) return true;
      return (
        client.name.toLowerCase().includes(q) ||
        (client.companyName?.toLowerCase().includes(q) ?? false) ||
        (client.segment?.toLowerCase().includes(q) ?? false) ||
        client.email.toLowerCase().includes(q) ||
        (client.locationCity?.toLowerCase().includes(q) ?? false) ||
        (client.locationState?.toLowerCase().includes(q) ?? false) ||
        (client.distributor?.toLowerCase().includes(q) ?? false) ||
        onlyDigits(client.phone).includes(qDigits) ||
        (profile.document ? onlyDigits(profile.document).includes(qDigits) : false)
      );
    });
  }, [enriched, lifecycle, submercado, distribuidora, search]);

  const deleteRow = confirmDelete
    ? enriched.find(({ client }) => client.id === confirmDelete)
    : undefined;

  type Row = (typeof enriched)[number];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Cliente",
      mobilePrimary: true,
      render: ({ client, profile }) => (
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 md:block">
            <p className="truncate font-semibold text-ink-900">
              {client.companyName ?? client.name}
            </p>
            <span className="shrink-0 md:hidden">
              <ClientLifecycleBadge status={profile.lifecycle} />
            </span>
          </div>
          <p className="truncate text-[11.5px] text-ink-500">
            {client.companyName ? client.name : client.email}
          </p>
        </div>
      ),
    },
    {
      key: "segment",
      header: "Segmento",
      mobileLabel: "Segmento",
      render: ({ client }) => (
        <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-brand ring-1 ring-inset ring-brand/25">
          {client.segment ?? "Sem segmento"}
        </span>
      ),
    },
    {
      key: "uc",
      header: "UCs",
      mobileLabel: "UCs",
      render: ({ profile }) => (
        <span className="text-[12.5px] text-ink-700">
          {profile.units.length === 0
            ? "—"
            : profile.units.length === 1
              ? profile.units[0].ucCode
              : `${profile.units.length} UCs`}
        </span>
      ),
    },
    {
      key: "distribuidora",
      header: "Distribuidora",
      render: ({ primaryUnit }) => (
        <span className="text-[12.5px] text-ink-700">{primaryUnit?.distribuidora ?? "—"}</span>
      ),
    },
    {
      key: "location",
      header: "Localização",
      mobileLabel: "Localização",
      render: ({ client }) => (
        <span className="text-[12.5px] text-ink-700">
          {client.locationCity && client.locationState
            ? `${client.locationCity}/${client.locationState}`
            : client.locationState ?? "—"}
        </span>
      ),
    },
    {
      key: "consumption",
      header: "Consumo médio",
      mobileLabel: "Consumo",
      render: ({ profile }) => (
        <span className="text-[12.5px] text-ink-700">
          {formatKwh(profile.averageConsumptionKwh)}
        </span>
      ),
    },
    {
      key: "savings",
      header: "Economia",
      render: ({ client }) =>
        client.monthlySavings && client.status === "ativo" ? (
          <span className="text-[12.5px] font-semibold text-ink-900">
            {formatCurrency(client.monthlySavings)}
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-400">—</span>
        ),
    },
    {
      key: "migration",
      header: "Migração",
      mobileLabel: "Migração",
      render: ({ profile }) => {
        const completed = profile.migrationSteps.filter((step) => step.status === "concluido").length;
        const progress = Math.round((completed / CLIENT_MIGRATION_STAGES.length) * 100);
        const current =
          profile.migrationSteps.find((step) => step.status === "em_andamento") ??
          profile.migrationSteps.find((step) => step.status === "pendente") ??
          profile.migrationSteps[profile.migrationSteps.length - 1];
        return (
          <div className="min-w-[140px]">
            <div className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="font-semibold text-ink-900">{progress}%</span>
              <span className="truncate text-ink-500">
                {current ? CLIENT_MIGRATION_LABEL[current.stepName] : "—"}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "lastInteraction",
      header: "Última interação",
      mobileLabel: "Última",
      render: ({ profile }) => (
        <span className="text-[12px] text-ink-500">
          {profile.lastInteractionAt ? formatRelative(profile.lastInteractionAt) : "—"}
        </span>
      ),
    },
    {
      key: "lifecycle",
      header: "Status",
      hideOnMobile: true,
      render: ({ profile }) => <ClientLifecycleBadge status={profile.lifecycle} />,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-ink-200 pb-4 md:flex-row md:items-end md:justify-between md:pb-5">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Clientes
          </p>
          <h1 className="mt-1 text-[19px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[22px]">
            Sua carteira em um lugar só
          </h1>
          <p className="mt-1.5 max-w-[640px] text-[12.5px] leading-[1.55] text-ink-500 md:text-[13px]">
            Acompanhe propostas, contratos e consumo das suas unidades. Use os filtros para
            priorizar quem precisa de atenção.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          Adicionar novo cliente
        </button>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full lg:max-w-[420px]"
          placeholder="Buscar por nome, empresa, email, telefone, localização ou distribuidora"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter
            label="Status"
            value={lifecycle}
            onChange={setLifecycle}
            options={LIFECYCLE_OPTIONS}
          />
          <SelectFilter
            label="Submercado"
            value={submercado}
            onChange={setSubmercado}
            options={SUBMERCADO_OPTIONS}
          />
          <SelectFilter
            label="Distribuidora"
            value={distribuidora}
            onChange={setDistribuidora}
            options={distribuidoraOptions}
          />
        </div>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={({ client }) => client.id}
        emptyState={
          clients.length === 0 ? (
            <EmptyState
              title="Sua carteira ainda está vazia"
              description='Comece adicionando o primeiro cliente em "Adicionar novo cliente".'
            />
          ) : (
            <EmptyState
              title="Nenhum cliente com esses filtros"
              description="Ajuste a busca, o status ou a distribuidora para visualizar mais resultados."
            />
          )
        }
        actions={({ client }) => (
          <>
            <TableButton href={`/plataforma/clientes/${client.id}`}>
              <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
              Ver cliente
            </TableButton>
            <TableButton tone="danger" onClick={() => setConfirmDelete(client.id)}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Deletar
            </TableButton>
          </>
        )}
      />

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={!!deleteRow}
        title="Deletar este cliente?"
        description={
          deleteRow
            ? `${deleteRow.client.companyName ?? deleteRow.client.name} será removido da sua carteira. As propostas vinculadas também serão excluídas.`
            : ""
        }
        confirmLabel="Deletar cliente"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (deleteRow) await removeClient(deleteRow.client.id);
          setConfirmDelete(null);
        }}
      />

    </div>
  );
}
