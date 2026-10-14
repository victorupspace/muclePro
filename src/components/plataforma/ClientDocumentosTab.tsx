"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileBadge,
  FileSignature,
  FileText,
  FileWarning,
  Receipt,
  Trash2,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SelectFilter } from "@/components/admin/Filters";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { formatDateLong, formatRelative } from "@/lib/plataforma/format";
import type { ClientDocument, ClientDocumentKind } from "@/lib/plataforma/types";

const KIND_LABEL: Record<ClientDocumentKind, string> = {
  contrato_social: "Contrato social",
  fatura: "Fatura",
  procuracao: "Procuração",
  denuncia_distribuidora: "Denúncia distribuidora",
  ccee: "CCEE",
  outros: "Outros",
};

const KIND_ICON: Record<ClientDocumentKind, LucideIcon> = {
  contrato_social: FileText,
  fatura: Receipt,
  procuracao: FileSignature,
  denuncia_distribuidora: FileWarning,
  ccee: FileBadge,
  outros: FileText,
};

const KIND_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })),
];

export function ClientDocumentosTab({ documents }: { documents: ClientDocument[] }) {
  const [kind, setKind] = useState<string>("all");

  const rows = useMemo(
    () =>
      documents
        .filter((d) => (kind === "all" ? true : d.kind === kind))
        .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)),
    [documents, kind],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SelectFilter label="Tipo" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <UploadCloud className="h-3.5 w-3.5" strokeWidth={2.2} />
          Enviar documento
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum documento aqui"
          description="Envie contratos, faturas e procurações para manter o cliente sempre pronto para auditoria."
          icon={<FileText className="h-5 w-5" strokeWidth={2.2} />}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((doc) => {
            const Icon = KIND_ICON[doc.kind];
            const expiringSoon =
              !!doc.expiresAt && new Date(doc.expiresAt).getTime() - Date.now() < 60 * 86_400_000;
            return (
              <li
                key={doc.id}
                className="group rounded-card border border-ink-200 bg-white p-4 transition-colors hover:border-ink-400"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-ink-100 text-ink-700">
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{doc.name}</p>
                    <p className="text-[11.5px] text-ink-500">{KIND_LABEL[doc.kind]}</p>
                  </div>
                </div>

                <dl className="mt-3 space-y-1 text-[11.5px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Enviado</dt>
                    <dd className="text-ink-900">{formatRelative(doc.uploadedAt)}</dd>
                  </div>
                  {doc.expiresAt && (
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Validade</dt>
                      <dd className={cn("font-medium", expiringSoon ? "text-danger-600" : "text-ink-900")}>
                        {formatDateLong(doc.expiresAt)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Tamanho</dt>
                    <dd className="text-ink-700">{formatSize(doc.sizeKb)}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3">
                  <button
                    type="button"
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Baixar
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-btn border border-danger-200 bg-white px-2.5 text-[11.5px] font-semibold text-danger-600 transition-colors hover:border-danger-400 hover:bg-danger-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
  return `${(kb / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
