"use client";

import { useMemo, useState } from "react";
import { Check, KeyRound, Minus, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { ActiveBadge, RoleBadge } from "@/components/plataforma/Badges";
import { StaffAccessDialog } from "@/components/plataforma/StaffAccessDialog";
import { StaffFormModal } from "@/components/plataforma/StaffFormModal";
import { useToast } from "@/components/plataforma/Toast";
import { PageIntro, useRevealRows } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { STAFF_ROLE_LABEL, formatDateValue, initials } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { staffAccessState, usePlataformaStore } from "@/lib/plataforma/store";
import type { Staff, StaffAccessState, StaffRole } from "@/lib/plataforma/types";

const ROLE_OPTIONS = [
  { value: "all", label: "Todos os perfis" },
  ...(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map((value) => ({ value, label: STAFF_ROLE_LABEL[value] })),
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "all", label: "Todos" },
];

export default function EquipePage() {
  const { profile } = useAccountSession();
  const { staff, units, unitById, removeStaff, revokeStaffAccess, loading } = usePlataformaStore();
  const { push } = useToast();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("active");
  const [unitFilter, setUnitFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Staff | null>(null);
  const [accessTarget, setAccessTarget] = useState<Staff | null>(null);

  const canManage = profile?.permissions.canManageTeam ?? false;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((member) => {
      if (status === "active" && !member.active) return false;
      if (status === "inactive" && member.active) return false;
      if (role !== "all" && member.role !== role) return false;
      if (unitFilter !== "all" && (member.unitId ?? "none") !== unitFilter) return false;
      if (!q) return true;
      return (
        member.fullName.toLowerCase().includes(q) ||
        (member.email?.toLowerCase().includes(q) ?? false) ||
        (member.roleLabel?.toLowerCase().includes(q) ?? false) ||
        STAFF_ROLE_LABEL[member.role].toLowerCase().includes(q)
      );
    });
  }, [staff, search, role, status, unitFilter]);

  const tableRef = useRevealRows<HTMLDivElement>([rows.length, status, role]);

  const unitOptions = useMemo(
    () => [
      { value: "all", label: "Todas as unidades" },
      ...units.map((u) => ({ value: u.id, label: u.name })),
      { value: "none", label: "Sem unidade" },
    ],
    [units],
  );

  const columns: Column<Staff>[] = [
    {
      key: "name",
      header: "Funcionário",
      mobilePrimary: true,
      render: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
            {initials(m.fullName)}
          </span>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2 md:block">
              <p className="truncate font-semibold text-ink-900">{m.fullName}</p>
              <span className="shrink-0 md:hidden">
                <RoleBadge role={m.role} label={m.roleLabel} />
              </span>
            </div>
            <p className="truncate text-[11.5px] text-ink-500">{m.email ?? m.phone ?? "Sem contato"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Perfil",
      hideOnMobile: true,
      render: (m) => <RoleBadge role={m.role} label={m.roleLabel} />,
    },
    {
      key: "unit",
      header: "Unidade",
      mobileLabel: "Unidade",
      render: (m) => (
        <span className={cn("text-[12.5px]", m.unitId ? "text-ink-700" : "text-ink-400")}>
          {unitById(m.unitId)?.name ?? (units.length > 1 ? "Sem unidade" : "—")}
        </span>
      ),
    },
    {
      key: "permissions",
      header: "Permissões",
      mobileLabel: "Permissões",
      mobileLayout: "stacked",
      render: (m) => (
        <div className="flex flex-wrap gap-1">
          <PermissionChip on={m.canRegisterStudents} label="Alunos" />
          <PermissionChip on={m.canSendPaymentLinks} label="Cobranças" />
          <PermissionChip on={m.canCreateWorkouts} label="Treinos" />
        </div>
      ),
    },
    {
      key: "access",
      header: "Acesso",
      mobileLabel: "Acesso",
      render: (m) => <AccessBadge state={staffAccessState(m)} />,
    },
    {
      key: "since",
      header: "Entrada",
      mobileLabel: "Entrada",
      render: (m) => <span className="text-[12px] text-ink-500">{m.startedAt ? formatDateValue(m.startedAt) : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (m) => <ActiveBadge active={m.active} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Equipe"
        title="Quem opera a academia"
        description={
          canManage
            ? "Cada funcionário tem um perfil, uma unidade e o que pode fazer no sistema. Dê acesso para que ele entre com o próprio login."
            : "Quem faz parte da equipe e o que cada um pode fazer no sistema."
        }
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Novo funcionário
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full lg:max-w-[420px]"
          placeholder="Buscar por nome, e-mail ou perfil"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter label="Perfil" value={role} onChange={setRole} options={ROLE_OPTIONS} />
          <SelectFilter label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          {units.length > 1 && <SelectFilter label="Unidade" value={unitFilter} onChange={setUnitFilter} options={unitOptions} />}
        </div>
      </div>

      <div ref={tableRef}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(m) => m.id}
          emptyState={
            staff.length === 0 && !loading ? (
              <EmptyState
                icon={<UserCog className="h-5 w-5" strokeWidth={2.2} />}
                title="Sua equipe ainda não está cadastrada"
                description="Cadastre recepção, contabilidade, personal e gestão. Defina o que cada um pode fazer."
              />
            ) : (
              <EmptyState title="Nenhum funcionário com esses filtros" description="Ajuste a busca ou os filtros." />
            )
          }
          actions={
            canManage
              ? (m) => (
                  <>
                    {m.id !== profile?.staffId && (
                      <TableButton
                        tone={staffAccessState(m) === "sem_acesso" && m.active ? "primary" : "ghost"}
                        onClick={() => setAccessTarget(m)}
                      >
                        <KeyRound className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {staffAccessState(m) === "sem_acesso" ? "Dar acesso" : "Acesso"}
                      </TableButton>
                    )}
                    <TableButton
                      onClick={() => {
                        setEditing(m);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Editar
                    </TableButton>
                    <TableButton tone="danger" onClick={() => setConfirmDelete(m)}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Excluir
                    </TableButton>
                  </>
                )
              : undefined
          }
        />
      </div>

      <StaffFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        member={editing ?? undefined}
      />

      <StaffAccessDialog
        open={!!accessTarget}
        onClose={() => setAccessTarget(null)}
        member={accessTarget ? staff.find((s) => s.id === accessTarget.id) ?? accessTarget : undefined}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `Excluir ${confirmDelete.fullName}?` : "Excluir funcionário?"}
        description={
          confirmDelete && staffAccessState(confirmDelete) !== "sem_acesso"
            ? "O cadastro some da equipe e o acesso ao sistema é removido. Se a pessoa só saiu, prefira informar a data de saída e marcar como inativo."
            : "O cadastro some da equipe. Se a pessoa só saiu, prefira informar a data de saída e marcar como inativo, para manter o histórico."
        }
        confirmLabel="Excluir funcionário"
        cancelLabel="Manter"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            if (staffAccessState(confirmDelete) !== "sem_acesso") await revokeStaffAccess(confirmDelete.id);
            const ok = await removeStaff(confirmDelete.id);
            if (ok) push({ tone: "info", title: "Funcionário excluído" });
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function PermissionChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
        on ? "bg-brand/8 text-brand ring-brand/25" : "bg-ink-50 text-ink-400 ring-ink-200",
      )}
      title={on ? `Pode: ${label}` : `Não pode: ${label}`}
    >
      {on ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <Minus className="h-2.5 w-2.5" strokeWidth={3} />}
      {label}
    </span>
  );
}

function AccessBadge({ state }: { state: StaffAccessState }) {
  const map: Record<StaffAccessState, { label: string; cls: string; dot: string }> = {
    com_acesso: { label: "Com acesso", cls: "bg-success-50 text-success-700 ring-success-200", dot: "bg-success-500" },
    convite_pendente: { label: "Convite pendente", cls: "bg-warning-50 text-warning-800 ring-warning-200", dot: "bg-warning-500" },
    sem_acesso: { label: "Sem acesso", cls: "bg-ink-50 text-ink-500 ring-ink-200", dot: "bg-ink-300" },
  };
  const { label, cls, dot } = map[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
        cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
