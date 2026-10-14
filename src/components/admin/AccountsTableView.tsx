"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, Copy, Eye, KeyRound, Power, Trash2 } from "lucide-react";
import { DataTable, TableButton, type Column } from "./DataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { AccountDetailDrawer } from "./DetailDrawer";
import { EmptyState } from "./EmptyState";
import { SearchInput, SelectFilter } from "./Filters";
import {
  AccountStatusBadge,
  ActiveBadge,
  PaymentStatusBadge,
} from "./StatusBadge";
import { useAdminStore } from "@/lib/admin/store";
import {
  ACCOUNT_KIND_LABEL,
  formatRelative,
} from "@/lib/admin/format";
import { onlyDigits } from "@/lib/cadastro/masks";
import type { Account, AccountStatus, PaymentStatus } from "@/lib/admin/types";

type Props = {
  filterStatus: AccountStatus;
};

const KIND_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "consultor", label: "Consultor" },
  { value: "comercializadora", label: "Comercializadora" },
];

const ACTIVE_OPTIONS = [
  { value: "all", label: "Ativas e inativas" },
  { value: "active", label: "Apenas ativas" },
  { value: "inactive", label: "Apenas inativas" },
];

const PAYMENT_OPTIONS: { value: "all" | PaymentStatus; label: string }[] = [
  { value: "all", label: "Todos pagamentos" },
  { value: "em_dia", label: "Em dia" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
  { value: "trial", label: "Trial" },
  { value: "cancelado", label: "Cancelado" },
  { value: "nao_iniciado", label: "Não iniciado" },
];

export function AccountsTableView({ filterStatus }: Props) {
  const { accounts, approve, generatePasswordLink, toggleActive, remove } = useAdminStore();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [activity, setActivity] = useState("all");
  const [payment, setPayment] = useState("all");

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [generatingPasswordLink, setGeneratingPasswordLink] = useState(false);
  const [accessLink, setAccessLink] = useState<{
    accountName: string;
    url: string;
    title: string;
    description: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return accounts
      .filter((a) => a.status === filterStatus)
      .filter((a) => (kind === "all" ? true : a.kind === kind))
      .filter((a) =>
        activity === "all" ? true : activity === "active" ? a.active : !a.active,
      )
      .filter((a) => (payment === "all" ? true : a.payment.status === payment))
      .filter((a) => {
        if (!q) return true;
        return (
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.companyName?.toLowerCase().includes(q) ?? false) ||
          onlyDigits(a.phone).includes(qDigits) ||
          onlyDigits(a.document).includes(qDigits)
        );
      });
  }, [accounts, filterStatus, kind, activity, payment, search]);

  const drawerAccount = drawerId ? accounts.find((a) => a.id === drawerId) ?? null : null;
  const approveAcc = confirmApprove ? accounts.find((a) => a.id === confirmApprove) : undefined;
  const deleteAcc = confirmDelete ? accounts.find((a) => a.id === confirmDelete) : undefined;
  const toggleAcc = confirmToggle ? accounts.find((a) => a.id === confirmToggle) : undefined;

  const columns: Column<Account>[] = [
    {
      key: "name",
      header: "Conta",
      mobilePrimary: true,
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{a.fullName}</p>
          <p className="truncate text-[11.5px] text-ink-500">{a.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 md:hidden">
            <AccountStatusBadge status={a.status} />
            <ActiveBadge active={a.active} />
            <PaymentStatusBadge status={a.payment.status} />
          </div>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Tipo",
      render: (a) => (
        <span className="text-[12px] font-semibold text-ink-700">
          {ACCOUNT_KIND_LABEL[a.kind]}
        </span>
      ),
    },
    {
      key: "doc",
      header: "Documento",
      mobileLabel: "Documento",
      render: (a) => (
        <div className="md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400 md:block">
            {a.documentKind}
          </p>
          <p className="text-[12.5px] font-medium text-ink-900">{a.document}</p>
        </div>
      ),
    },
    {
      key: "company",
      header: "Empresa",
      render: (a) =>
        a.companyName ? (
          <span className="text-[12.5px] text-ink-700">{a.companyName}</span>
        ) : (
          <span className="text-[12.5px] text-ink-400">—</span>
        ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (a) => <span className="text-[12.5px] text-ink-700">{a.phone}</span>,
    },
    {
      key: "createdAt",
      header: "Criada",
      render: (a) => (
        <span className="text-[12px] text-ink-500" title={a.createdAt}>
          {formatRelative(a.createdAt)}
        </span>
      ),
    },
    {
      key: "active",
      header: "Atividade",
      hideOnMobile: true,
      render: (a) => <ActiveBadge active={a.active} />,
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (a) => <AccountStatusBadge status={a.status} />,
    },
    {
      key: "payment",
      header: "Pagamento",
      hideOnMobile: true,
      render: (a) => <PaymentStatusBadge status={a.payment.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} className="w-full lg:max-w-[420px]" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SelectFilter label="Tipo" value={kind} onChange={setKind} options={KIND_OPTIONS} />
          <SelectFilter label="Atividade" value={activity} onChange={setActivity} options={ACTIVE_OPTIONS} />
          <SelectFilter label="Pagamento" value={payment} onChange={setPayment} options={PAYMENT_OPTIONS} />
        </div>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(a) => a.id}
        emptyState={
          <EmptyState
            title={
              filterStatus === "nova"
                ? "Nenhuma conta nova no momento"
                : "Nenhuma conta ativa com esses filtros"
            }
            description="Ajuste a busca ou os filtros para visualizar outras contas."
          />
        }
        actions={(a) => (
          <>
            <TableButton onClick={() => setDrawerId(a.id)} aria-label="Ver detalhes">
              <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
              Detalhes
            </TableButton>

            {filterStatus === "nova" ? (
              <TableButton tone="success" onClick={() => setConfirmApprove(a.id)}>
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                Aprovar
              </TableButton>
            ) : (
              <>
                <TableButton
                  onClick={() => handleGeneratePasswordLink(a)}
                  disabled={generatingPasswordLink}
                >
                  <KeyRound className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {generatingPasswordLink ? "Gerando..." : "Link senha"}
                </TableButton>
                <TableButton onClick={() => setConfirmToggle(a.id)}>
                  <Power className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {a.active ? "Desativar" : "Ativar"}
                </TableButton>
              </>
            )}

            <TableButton tone="danger" onClick={() => setConfirmDelete(a.id)} aria-label="Deletar conta">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Deletar
            </TableButton>
          </>
        )}
      />

      <AccountDetailDrawer
        account={drawerAccount}
        open={!!drawerAccount}
        onClose={() => setDrawerId(null)}
        onGeneratePasswordLink={handleGeneratePasswordLink}
      />

      <ConfirmDialog
        open={!!approveAcc}
        title="Aprovar esta conta?"
        description={
          approveAcc
            ? `A conta de ${approveAcc.fullName} será movida para "Contas ativas" e o usuário poderá ser ativado para uso da plataforma.`
            : ""
        }
        onCancel={() => setConfirmApprove(null)}
        onConfirm={() => {
          if (approveAcc) {
            const accountName = approveAcc.fullName;
            setApproving(true);
            void approve(approveAcc.id)
              .then((result) => {
                if (result?.setupLink) {
                  setAccessLink({
                    accountName,
                    url: result.setupLink,
                    title: "Conta aprovada",
                    description:
                      "Envie manualmente este link para a pessoa definir a senha e acessar a plataforma.",
                  });
                }
              })
              .finally(() => setApproving(false));
          }
          setConfirmApprove(null);
        }}
        confirmLabel={approving ? "Aprovando..." : "Aprovar conta"}
      />

      <AccessLinkDialog
        open={!!accessLink}
        accountName={accessLink?.accountName ?? ""}
        url={accessLink?.url ?? ""}
        title={accessLink?.title ?? ""}
        description={accessLink?.description ?? ""}
        onClose={() => setAccessLink(null)}
      />

      <ConfirmDialog
        open={!!toggleAcc}
        title={toggleAcc?.active ? "Desativar esta conta?" : "Ativar esta conta?"}
        description={
          toggleAcc
            ? toggleAcc.active
              ? `A conta de ${toggleAcc.fullName} ficará indisponível para acesso até ser reativada.`
              : `A conta de ${toggleAcc.fullName} voltará a ter acesso normal à plataforma.`
            : ""
        }
        confirmLabel={toggleAcc?.active ? "Desativar conta" : "Ativar conta"}
        tone={toggleAcc?.active ? "danger" : "default"}
        onCancel={() => setConfirmToggle(null)}
        onConfirm={() => {
          if (toggleAcc) toggleActive(toggleAcc.id);
          setConfirmToggle(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteAcc}
        title="Tem certeza que deseja deletar esta conta?"
        description="Essa ação não poderá ser desfeita. Todos os dados associados serão removidos do backoffice."
        confirmLabel="Deletar conta"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (deleteAcc) remove(deleteAcc.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );

  function handleGeneratePasswordLink(account: Account) {
    setGeneratingPasswordLink(true);
    void generatePasswordLink(account.id)
      .then((result) => {
        if (result?.setupLink) {
          setAccessLink({
            accountName: account.fullName,
            url: result.setupLink,
            title: "Novo link de senha gerado",
            description:
              "Envie manualmente este link para a pessoa redefinir a senha de acesso à plataforma.",
          });
        }
      })
      .finally(() => setGeneratingPasswordLink(false));
  }
}

function AccessLinkDialog({
  open,
  accountName,
  url,
  title,
  description,
  onClose,
}: {
  open: boolean;
  accountName: string;
  url: string;
  title: string;
  description: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm"
        aria-label="Fechar modal"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-full w-full max-w-[560px] flex-col overflow-y-auto rounded-panel border border-ink-200 bg-white p-5 shadow-[0_30px_70px_-20px_rgba(17,17,17,0.35)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900">
              {title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-600">
              {description} Destinatário: {accountName}.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-card border border-ink-200 bg-ink-50/70 p-3">
          <p className="break-all text-[12px] leading-[1.5] text-ink-700">{url}</p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-btn bg-ink-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800 sm:h-10 sm:w-auto"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
            )}
            {copied ? "Copiado" : "Copiar link"}
          </button>
        </div>
      </div>
    </div>
  );
}
