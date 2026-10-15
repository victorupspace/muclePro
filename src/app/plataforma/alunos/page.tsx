"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CreditCard, Eye, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { BillingBadge, StudentStatusBadge } from "@/components/plataforma/Badges";
import { RegisterPaymentModal } from "@/components/plataforma/PaymentModals";
import { StudentFormModal } from "@/components/plataforma/StudentFormModal";
import { useToast } from "@/components/plataforma/Toast";
import { PageIntro, useRevealRows } from "@/components/plataforma/motion";
import { onlyDigits } from "@/lib/cadastro/masks";
import {
  BILLING_STATE_LABEL,
  formatCurrency,
  formatDateValue,
  formatRelative,
  initials,
  planCadenceLabel,
} from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { BillingState, Payment, Student } from "@/lib/plataforma/types";

const BILLING_OPTIONS: { value: "all" | BillingState; label: string }[] = [
  { value: "all", label: "Todas as situações" },
  { value: "inadimplente", label: BILLING_STATE_LABEL.inadimplente },
  { value: "a_vencer", label: BILLING_STATE_LABEL.a_vencer },
  { value: "em_dia", label: BILLING_STATE_LABEL.em_dia },
  { value: "sem_plano", label: BILLING_STATE_LABEL.sem_plano },
];

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
  { value: "all", label: "Todos" },
];

export default function AlunosPage() {
  return (
    <Suspense fallback={null}>
      <AlunosPageContent />
    </Suspense>
  );
}

function AlunosPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { students, plans, units, billingFor, planById, unitById, removeStudent, loading } = usePlataformaStore();
  const { push } = useToast();

  const initialBilling = (searchParams.get("situacao") as BillingState | null) ?? "all";

  const [search, setSearch] = useState("");
  const [billing, setBilling] = useState<string>(
    BILLING_OPTIONS.some((o) => o.value === initialBilling) ? initialBilling : "all",
  );
  const [status, setStatus] = useState<string>("ativo");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{ student: Student; payment: Payment } | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return students
      .map((student) => ({ student, billing: billingFor(student.id), plan: planById(student.planId), unit: unitById(student.unitId) }))
      .filter(({ student, billing: b, plan, unit }) => {
        if (status !== "all" && student.status !== status) return false;
        if (billing !== "all" && b.state !== billing) return false;
        if (planFilter !== "all" && (plan?.id ?? "none") !== planFilter) return false;
        if (unitFilter !== "all" && (unit?.id ?? "none") !== unitFilter) return false;
        if (!q) return true;
        return (
          student.fullName.toLowerCase().includes(q) ||
          (student.email?.toLowerCase().includes(q) ?? false) ||
          (plan?.name.toLowerCase().includes(q) ?? false) ||
          (qDigits.length > 0 &&
            (onlyDigits(student.whatsapp ?? "").includes(qDigits) || onlyDigits(student.cpf ?? "").includes(qDigits)))
        );
      })
      .sort((a, b) => {
        // Inadimplentes primeiro quando o filtro é "todas as situações".
        if (billing === "all") {
          const rank = (s: BillingState) => (s === "inadimplente" ? 0 : s === "a_vencer" ? 1 : s === "sem_plano" ? 2 : 3);
          const diff = rank(a.billing.state) - rank(b.billing.state);
          if (diff !== 0) return diff;
        }
        return a.student.fullName.localeCompare(b.student.fullName);
      });
  }, [students, billingFor, planById, unitById, search, status, billing, planFilter, unitFilter]);

  const tableRef = useRevealRows<HTMLDivElement>([rows.length, billing, status]);

  const planOptions = useMemo(
    () => [
      { value: "all", label: "Todos os planos" },
      ...plans.map((p) => ({ value: p.id, label: p.name })),
      { value: "none", label: "Sem plano" },
    ],
    [plans],
  );

  const unitOptions = useMemo(
    () => [{ value: "all", label: "Todas as unidades" }, ...units.map((u) => ({ value: u.id, label: u.name }))],
    [units],
  );

  const deleteRow = confirmDelete ? rows.find((r) => r.student.id === confirmDelete) ?? null : null;

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Aluno",
      mobilePrimary: true,
      render: ({ student, billing: b }) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
            {initials(student.fullName)}
          </span>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2 md:block">
              <Link href={`/plataforma/alunos/${student.id}`} className="truncate font-semibold text-ink-900 hover:underline">
                {student.fullName}
              </Link>
              <span className="shrink-0 md:hidden">
                <BillingBadge state={student.status === "inativo" ? "sem_plano" : b.state} />
              </span>
            </div>
            <p className="truncate text-[11.5px] text-ink-500">{student.whatsapp ?? student.email ?? "Sem contato"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plano",
      mobileLabel: "Plano",
      render: ({ plan }) =>
        plan ? (
          <div>
            <p className="text-[12.5px] font-semibold text-ink-900">{plan.name}</p>
            <p className="text-[11px] text-ink-500">
              {formatCurrency(plan.amount)} {planCadenceLabel(plan.frequency)}
            </p>
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-400">Sem plano</span>
        ),
    },
    {
      key: "billing",
      header: "Situação",
      hideOnMobile: true,
      render: ({ student, billing: b }) =>
        student.status === "inativo" ? (
          <StudentStatusBadge status="inativo" />
        ) : (
          <BillingBadge
            state={b.state}
            detail={
              b.state === "inadimplente"
                ? `${b.overdueDays}d`
                : b.state === "a_vencer" && b.daysUntilDue !== undefined
                  ? b.daysUntilDue === 0
                    ? "hoje"
                    : `${b.daysUntilDue}d`
                  : undefined
            }
          />
        ),
    },
    {
      key: "due",
      header: "Próximo vencimento",
      mobileLabel: "Vencimento",
      render: ({ billing: b }) =>
        b.nextPayment ? (
          <div>
            <p className={`text-[12.5px] font-semibold ${b.state === "inadimplente" ? "text-danger-700" : "text-ink-900"}`}>
              {formatDateValue(b.nextPayment.dueAt)}
            </p>
            <p className="text-[11px] text-ink-500">{formatCurrency(b.nextPayment.amount)}</p>
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-400">—</span>
        ),
    },
    {
      key: "unit",
      header: "Unidade",
      mobileLabel: "Unidade",
      render: ({ unit }) => <span className="text-[12.5px] text-ink-700">{unit?.name ?? "—"}</span>,
    },
    {
      key: "since",
      header: "Cadastro",
      mobileLabel: "Cadastro",
      render: ({ student }) => <span className="text-[12px] text-ink-500">{formatRelative(student.createdAt)}</span>,
    },
  ];

  const nothingYet = students.length === 0 && !loading;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Alunos"
        title="Sua base de alunos"
        description="Quem está em dia, quem vence esta semana e quem precisa de cobrança. Clique no aluno para ver a ficha completa."
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Novo aluno
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full lg:max-w-[420px]"
          placeholder="Buscar por nome, WhatsApp, CPF ou plano"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter label="Situação" value={billing} onChange={setBilling} options={BILLING_OPTIONS} />
          <SelectFilter label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <SelectFilter label="Plano" value={planFilter} onChange={setPlanFilter} options={planOptions} />
          {units.length > 1 && (
            <SelectFilter label="Unidade" value={unitFilter} onChange={setUnitFilter} options={unitOptions} />
          )}
        </div>
      </div>

      <div ref={tableRef}>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={({ student }) => student.id}
          emptyState={
            nothingYet ? (
              <EmptyState
                title="Nenhum aluno cadastrado ainda"
                description="Cadastre o primeiro aluno com plano e contato de emergência. O ciclo de cobrança começa sozinho."
              />
            ) : (
              <EmptyState
                title="Nenhum aluno com esses filtros"
                description="Ajuste a busca, a situação ou o plano para ver mais resultados."
              />
            )
          }
          actions={({ student, billing: b }) => (
            <>
              {b.nextPayment && student.status === "ativo" ? (
                <TableButton
                  tone={b.state === "inadimplente" ? "primary" : "ghost"}
                  onClick={() => setPaymentTarget({ student, payment: b.nextPayment! })}
                >
                  <CreditCard className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Registrar pagamento
                </TableButton>
              ) : (
                <TableButton onClick={() => router.push(`/plataforma/alunos/${student.id}`)}>
                  <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Ver ficha
                </TableButton>
              )}
              <TableButton tone="danger" onClick={() => setConfirmDelete(student.id)}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                Excluir
              </TableButton>
            </>
          )}
        />
      </div>

      <StudentFormModal open={addOpen} onClose={() => setAddOpen(false)} />

      <RegisterPaymentModal
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        payment={paymentTarget?.payment}
        student={paymentTarget?.student}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title={deleteRow ? `Excluir ${deleteRow.student.fullName}?` : "Excluir aluno?"}
        description="A ficha, as cobranças e o histórico do aluno serão apagados. Isso não pode ser desfeito. Se o aluno só saiu, prefira marcar como inativo."
        confirmLabel="Excluir aluno"
        cancelLabel="Manter aluno"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (deleteRow) {
            const ok = await removeStudent(deleteRow.student.id);
            if (ok) push({ tone: "info", title: "Aluno excluído" });
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
