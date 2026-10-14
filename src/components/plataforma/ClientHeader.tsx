"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  FileText,
  ListTodo,
  Loader2,
  Pencil,
  StickyNote,
  Tag,
} from "lucide-react";
import { ClientLifecycleBadge } from "./ClientLifecycleBadge";
import { ClientSegmentField } from "./ClientSegmentField";
import { cn } from "@/lib/cn";
import { CLIENT_PROFILE_LABEL, CLIENT_STATUS_LABEL, formatDocument } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Client, ClientProfile, ClientStatus } from "@/lib/plataforma/types";

type Action = {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
};

const STATUS_TONE: Record<ClientStatus, { dot: string; text: string }> = {
  novo: { dot: "bg-brand", text: "text-brand" },
  qualificando: { dot: "bg-warning-500", text: "text-warning-700" },
  proposta_enviada: { dot: "bg-info-500", text: "text-info-700" },
  em_negociacao: { dot: "bg-warning-500", text: "text-warning-700" },
  assinado: { dot: "bg-success-500", text: "text-success-700" },
  migrando: { dot: "bg-info-500", text: "text-info-700" },
  ativo: { dot: "bg-success-500", text: "text-success-700" },
  inativo: { dot: "bg-ink-400", text: "text-ink-500" },
};

export function ClientHeader({
  client,
  profile,
  onEdit,
  onAddNote,
  onAddTask,
  onSimulate,
}: {
  client: Client;
  profile: ClientProfile;
  onEdit: () => void;
  onAddNote: () => void;
  onAddTask: () => void;
  onSimulate: () => void;
}) {
  const { updateClient } = usePlataformaStore();
  const [segment, setSegment] = useState(client.segment ?? "");
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [saving, setSaving] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSegment(client.segment ?? "");
    setStatus(client.status);
  }, [client.id, client.segment, client.status]);

  useEffect(() => {
    if (!statusOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!statusRef.current) return;
      if (!statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStatusOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [statusOpen]);

  async function saveQuickFields(next?: { segment?: string; status?: ClientStatus }) {
    const nextSegment = next?.segment ?? segment;
    const nextStatus = next?.status ?? status;
    setSegment(nextSegment);
    setStatus(nextStatus);
    setSaving(true);
    await updateClient(client.id, {
      segment: nextSegment || undefined,
      status: nextStatus,
    });
    setSaving(false);
  }

  const secondaryActions: Action[] = [
    {
      label: "Editar",
      onClick: onEdit,
      icon: <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      label: "Tarefa",
      onClick: onAddTask,
      icon: <ListTodo className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      label: "Nota",
      onClick: onAddNote,
      icon: <StickyNote className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
  ];

  const statusTone = STATUS_TONE[status];

  return (
    <div className="sticky top-14 z-20 -mx-3.5 mb-1 border-b border-ink-200 bg-white/85 px-3.5 py-4 backdrop-blur-sm md:-mx-8 md:px-8 md:py-5">
      <Link
        href="/plataforma/clientes"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
        Voltar para clientes
      </Link>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ClientLifecycleBadge status={profile.lifecycle} />
            {profile.profileTag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-700 ring-1 ring-inset ring-ink-200">
                <FileText className="h-3 w-3" strokeWidth={2.4} />
                {CLIENT_PROFILE_LABEL[profile.profileTag]}
              </span>
            )}
          </div>
          <h1 className="mt-2 truncate text-[20px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[26px]">
            {profile.legalName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-500">
            {profile.tradeName && <span className="truncate">{profile.tradeName}</span>}
            {profile.tradeName && <span className="text-ink-300">·</span>}
            <span className="font-mono text-[11.5px] tracking-tight">{formatDocument(profile.document)}</span>
            <span className="text-ink-300">·</span>
            <span className="truncate">{client.email}</span>
            <span className="text-ink-300">·</span>
            <span>{client.phone}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-stretch gap-2">
            <InlineField icon={<Tag className="h-3 w-3" strokeWidth={2.4} />} label="Segmento">
              <ClientSegmentField
                value={segment}
                onChange={(next) => void saveQuickFields({ segment: next })}
                inline
              />
            </InlineField>

            <div ref={statusRef} className="relative">
              <InlineField icon={<span className={cn("h-2 w-2 rounded-full", statusTone.dot)} />} label="Status">
                <button
                  type="button"
                  onClick={() => setStatusOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={statusOpen}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-left text-[12.5px] font-semibold transition-colors",
                    statusOpen ? "bg-ink-100" : "hover:bg-ink-100",
                    statusTone.text,
                  )}
                >
                  <span>{CLIENT_STATUS_LABEL[status]}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-ink-400 transition-transform",
                      statusOpen && "rotate-180 text-ink-700",
                    )}
                    strokeWidth={2.4}
                  />
                </button>
              </InlineField>

              {statusOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[200px] overflow-hidden rounded-card border border-ink-200 bg-white py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]">
                  {(Object.keys(CLIENT_STATUS_LABEL) as ClientStatus[]).map((value) => {
                    const tone = STATUS_TONE[value];
                    const active = value === status;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setStatusOpen(false);
                          if (value !== status) void saveQuickFields({ status: value });
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors",
                          active ? "bg-ink-50" : "hover:bg-ink-50",
                        )}
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
                        <span className={cn("flex-1 font-semibold", tone.text)}>
                          {CLIENT_STATUS_LABEL[value]}
                        </span>
                        {active && <Check className="h-3.5 w-3.5 text-ink-700" strokeWidth={2.6} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {saving && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-card border border-dashed border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                Salvando
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:mt-[26px] lg:flex-nowrap lg:justify-end">
          <button
            type="button"
            onClick={onSimulate}
            className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3.5 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover"
          >
            <Calculator className="h-3.5 w-3.5" strokeWidth={2.4} />
            Nova simulação
          </button>

          <div className="inline-flex h-9 items-center rounded-btn border border-ink-200 bg-white p-0.5">
            {secondaryActions.map((a, i) => (
              <span key={a.label} className="flex items-center">
                {i > 0 && <span className="h-4 w-px bg-ink-200" />}
                <button
                  type="button"
                  onClick={a.onClick}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
                >
                  {a.icon}
                  {a.label}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex h-9 items-center gap-1.5 rounded-card border border-ink-200 bg-white pl-2.5 pr-1 transition-colors hover:border-ink-300">
      <span className="inline-flex h-4 w-4 items-center justify-center text-ink-400">{icon}</span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</span>
      <span className="h-4 w-px bg-ink-200" />
      {children}
    </div>
  );
}
