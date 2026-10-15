"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CreditCard,
  Eye,
  ListTodo,
  Send,
  Sparkles,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import type {
  Announcement,
  AnnouncementInput,
  AnnouncementKind,
} from "@/lib/admin/announcements";

const KIND_OPTIONS: { value: AnnouncementKind; label: string; description: string; icon: LucideIcon }[] = [
  { value: "sistema", label: "Sistema", description: "Avisos e novidades da plataforma", icon: Sparkles },
  { value: "lead", label: "Lead", description: "Novas oportunidades e indicações", icon: UserPlus },
  { value: "tarefa", label: "Tarefa", description: "Lembretes e prazos importantes", icon: ListTodo },
  { value: "pagamento", label: "Pagamento", description: "Faturamento e cobrança", icon: CreditCard },
];

const KIND_TONE: Record<AnnouncementKind, { wrap: string; icon: string }> = {
  sistema: { wrap: "bg-brand/10 ring-brand/30", icon: "text-brand" },
  lead: { wrap: "bg-info-50 ring-info-200", icon: "text-info-600" },
  tarefa: { wrap: "bg-warning-50 ring-warning-200", icon: "text-warning-700" },
  pagamento: { wrap: "bg-success-50 ring-success-200", icon: "text-success-700" },
};

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  initial?: Announcement | null;
  onClose: () => void;
  onSubmit: (input: AnnouncementInput) => Promise<boolean>;
};

const EMPTY: AnnouncementInput = {
  kind: "sistema",
  title: "",
  body: "",
  href: null,
  expiresAt: null,
  publishNow: true,
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function AnnouncementComposer({ open, mode, initial, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AnnouncementInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        kind: initial.kind,
        title: initial.title,
        body: initial.body,
        href: initial.href,
        expiresAt: initial.expiresAt,
        publishNow: !!initial.publishedAt,
      });
    } else {
      setForm(EMPTY);
    }
    setShowPreview(false);
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const canSubmit = form.title.trim().length > 0 && form.body.trim().length > 0;
  const KindIcon = useMemo(
    () => KIND_OPTIONS.find((k) => k.value === form.kind)?.icon ?? Sparkles,
    [form.kind],
  );

  async function handleSubmit(publishNow: boolean) {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit({ ...form, publishNow });
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-ink-900/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className="pointer-events-none fixed inset-0 z-50 flex items-stretch justify-center p-2 sm:p-3 md:items-center md:p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="pointer-events-auto flex w-full flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-[0_30px_80px_-20px_rgba(17,17,17,0.35)] md:max-h-[88vh] md:max-w-[760px]"
            >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-200 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand">
                  Nova notificação
                </p>
                <h2 className="mt-0.5 truncate text-[15px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900 sm:text-[16px]">
                  {mode === "edit" ? "Editar anúncio" : "Emitir anúncio"}
                </h2>
                <p className="mt-1 hidden text-[12px] text-ink-500 sm:block">
                  Tudo o que for publicado aparece para todos os estabelecimentos dentro da plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[1fr_300px]">
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {showPreview && (
                  <div className="mb-4 rounded-card border border-ink-200 bg-ink-50/60 p-3 md:hidden">
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
                      Pré-visualização
                    </p>
                    <PreviewCard
                      kind={form.kind}
                      title={form.title || "Título do anúncio"}
                      body={form.body || "A mensagem aparecerá aqui."}
                      hasIcon={KindIcon}
                    />
                  </div>
                )}

                <Field label="Tipo">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {KIND_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = opt.value === form.kind;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, kind: opt.value }))}
                          className={cn(
                            "flex items-start gap-2.5 rounded-btn border p-2.5 text-left transition-all",
                            active
                              ? "border-ink-900 bg-ink-900 text-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                              : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                              active
                                ? "bg-white/15 ring-white/20 text-white"
                                : cn(KIND_TONE[opt.value].wrap, KIND_TONE[opt.value].icon),
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold">{opt.label}</p>
                            <p className={cn("mt-0.5 text-[11px]", active ? "text-white/70" : "text-ink-500")}>
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Título">
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex.: Nova versão da plataforma disponível"
                    maxLength={120}
                    className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
                  />
                </Field>

                <Field label="Mensagem">
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    placeholder="Conte o que está acontecendo. Frases curtas funcionam melhor."
                    rows={4}
                    maxLength={500}
                    className="w-full resize-none rounded-btn border border-ink-200 bg-white px-3 py-2 text-[13px] leading-[1.55] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
                  />
                  <p className="mt-1 text-right text-[10.5px] text-ink-400">{form.body.length}/500</p>
                </Field>

                <Field label="Link opcional" hint="URL absoluta ou caminho interno (ex: /plataforma)">
                  <input
                    value={form.href ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, href: e.target.value || null }))}
                    placeholder="https://… ou /plataforma/clientes"
                    className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
                  />
                </Field>

                <Field label="Expira em" hint="Opcional. Após a data, o anúncio some do sino dos estabelecimentos.">
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(form.expiresAt)}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: fromLocalInputValue(e.target.value) }))}
                    className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 outline-none transition-colors focus:border-ink-400"
                  />
                </Field>
              </div>

              <aside className="hidden border-l border-ink-200 bg-ink-50/50 p-4 md:block md:overflow-y-auto">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Pré-visualização</p>
                <PreviewCard
                  kind={form.kind}
                  title={form.title || "Título do anúncio"}
                  body={form.body || "A mensagem aparecerá aqui."}
                  hasIcon={KindIcon}
                />
                <p className="mt-3 text-[11px] leading-[1.5] text-ink-500">
                  Os destinatários verão exatamente isso no sino de notificações.
                </p>
              </aside>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-2.5 text-[12px] font-semibold text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 md:hidden"
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
                {showPreview ? "Esconder preview" : "Ver preview"}
              </button>
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleSubmit(false)}
                  disabled={!canSubmit || submitting}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9"
                >
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  disabled={!canSubmit || submitting}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-9"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Publicar agora
                </button>
              </div>
            </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

function PreviewCard({
  kind,
  title,
  body,
  hasIcon,
}: {
  kind: AnnouncementKind;
  title: string;
  body: string;
  hasIcon: LucideIcon;
}) {
  const Icon = hasIcon;
  const tone = KIND_TONE[kind];
  return (
    <div className="rounded-card border border-ink-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
            tone.wrap,
            tone.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink-900">{title}</p>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-500">{body}</p>
        </div>
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
      </div>
    </div>
  );
}
