"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  businessTypeLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  studentsRangeLabel,
  unitsRangeLabel,
} from "@/lib/admin/format";
import type { Account } from "@/lib/admin/types";
import { AccountStatusBadge, ActiveBadge, PaymentStatusBadge } from "./StatusBadge";

type Props = {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onGeneratePasswordLink?: (account: Account) => void;
};

export function AccountDetailDrawer({ account, open, onClose, onGeneratePasswordLink }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && account && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-ink-900/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: EASE }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col bg-white shadow-[0_30px_70px_-20px_rgba(17,17,17,0.35)] sm:border-l sm:border-ink-200"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-ink-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand">
                  {account.businessType ? businessTypeLabel(account.businessType) : "Estabelecimento"}
                </p>
                <h2 className="mt-1 truncate text-[17px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900 sm:text-[18px]">
                  {account.companyName ?? account.fullName}
                </h2>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
                  {account.companyName ? `${account.fullName} · ${account.email}` : account.email}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900 sm:h-8 sm:w-8"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center gap-2">
                <AccountStatusBadge status={account.status} />
                <ActiveBadge active={account.active} />
                <PaymentStatusBadge status={account.payment.status} />
              </div>

              {account.status === "criada" && onGeneratePasswordLink && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => onGeneratePasswordLink(account)}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Gerar novo link de senha
                  </button>
                </div>
              )}

              <Section title="Responsável">
                <Row label="Nome" value={account.fullName} />
                <Row label="Telefone" value={account.phone} />
                <Row label="E-mail" value={account.email} />
              </Section>

              <Section title="Estabelecimento">
                <Row label="Nome" value={account.companyName ?? "—"} />
                <Row label="Tipo" value={businessTypeLabel(account.businessType)} />
                <Row
                  label={account.documentKind === "cnpj" ? "CNPJ" : "CPF"}
                  value={account.document}
                />
                {account.unitsRange && <Row label="Unidades" value={unitsRangeLabel(account.unitsRange)} />}
                {account.activeStudentsRange && (
                  <Row label="Alunos ativos" value={studentsRangeLabel(account.activeStudentsRange)} />
                )}
                {account.contactPhone && <Row label="Telefone de contato" value={account.contactPhone} />}
                {account.contactEmail && <Row label="E-mail de contato" value={account.contactEmail} />}
                {account.address && <Row label="Endereço" value={account.address} multiline />}
              </Section>

              <Section title="Plano e pagamento">
                <Row label="Plano" value={account.payment.plan ?? "—"} />
                <Row
                  label="Mensalidade"
                  value={
                    account.payment.monthlyAmount
                      ? formatCurrency(account.payment.monthlyAmount)
                      : "—"
                  }
                />
                <Row
                  label="Próximo vencimento"
                  value={account.payment.nextDueAt ? formatDate(account.payment.nextDueAt) : "—"}
                />
                <Row
                  label="Último pagamento"
                  value={account.payment.lastPaidAt ? formatDate(account.payment.lastPaidAt) : "—"}
                />
              </Section>

              <Section title="Datas">
                <Row label="Cadastro recebido" value={formatDateTime(account.createdAt)} />
                {account.approvedAt && (
                  <Row label="Conta aprovada" value={formatDateTime(account.approvedAt)} />
                )}
              </Section>

              <Section title="Histórico de ações">
                <ol className="space-y-2.5">
                  {account.history.map((evt) => (
                    <li key={evt.id} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <div className="flex-1">
                        <p className="text-[12.5px] font-semibold text-ink-900">{evt.label}</p>
                        <p className="text-[11.5px] text-ink-500">
                          {formatDateTime(evt.at)}
                          {evt.by && (
                            <>
                              {" · "}
                              <span className="font-medium text-ink-600">{evt.by}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-ink-200 pt-5 first:mt-5 first:border-0 first:pt-5">
      <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{title}</h3>
      <dl className="mt-2.5 space-y-1.5">{children}</dl>
    </section>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3 text-[12.5px]",
        multiline ? "flex-col" : "items-baseline justify-between",
      )}
    >
      <dt className={cn("text-ink-500", multiline ? "text-[10.5px] font-bold uppercase tracking-[0.12em]" : "")}>
        {label}
      </dt>
      <dd className={cn("text-right font-medium text-ink-900", multiline && "text-left leading-[1.55]")}>
        {value}
      </dd>
    </div>
  );
}
