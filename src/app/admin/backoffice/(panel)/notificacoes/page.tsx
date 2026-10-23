"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  ListTodo,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { AnnouncementComposer } from "@/components/admin/AnnouncementComposer";
import { cn } from "@/lib/cn";
import {
  announcementStatus,
  useAdminAnnouncements,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementKind,
} from "@/lib/admin/announcements";

const KIND_META: Record<AnnouncementKind, { label: string; icon: LucideIcon; tone: string }> = {
  sistema: { label: "Sistema", icon: Sparkles, tone: "bg-brand/10 text-brand ring-brand/30" },
  lead: { label: "Lead", icon: Users, tone: "bg-info-50 text-info-700 ring-info-200" },
  tarefa: { label: "Tarefa", icon: ListTodo, tone: "bg-warning-50 text-warning-700 ring-warning-200" },
  pagamento: { label: "Pagamento", icon: CreditCard, tone: "bg-success-50 text-success-700 ring-success-200" },
};

const STATUS_TONE: Record<"rascunho" | "publicado" | "expirado", { wrap: string; dot: string; label: string }> = {
  rascunho: {
    wrap: "bg-ink-100 text-ink-600 ring-ink-200",
    dot: "bg-ink-400",
    label: "Rascunho",
  },
  publicado: {
    wrap: "bg-success-50 text-success-700 ring-success-200",
    dot: "bg-success-500",
    label: "Publicado",
  },
  expirado: {
    wrap: "bg-ink-100 text-ink-500 ring-ink-200",
    dot: "bg-ink-400",
    label: "Expirado",
  },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotificacoesPage() {
  const { items, loading, error, create, update, publish, unpublish, remove } = useAdminAnnouncements();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const stats = useMemo(() => {
    const publicados = items.filter((a) => announcementStatus(a) === "publicado").length;
    const rascunhos = items.filter((a) => announcementStatus(a) === "rascunho").length;
    const totalLeituras = items.reduce((acc, a) => acc + a.readsCount, 0);
    return { publicados, rascunhos, totalLeituras, total: items.length };
  }, [items]);

  function openCreate() {
    setEditing(null);
    setComposerOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setComposerOpen(true);
    setOpenMenu(null);
  }

  async function handleSubmit(input: AnnouncementInput): Promise<boolean> {
    if (editing) {
      return update(editing.id, {
        kind: input.kind,
        title: input.title.trim(),
        body: input.body.trim(),
        href: input.href?.trim() || null,
        expires_at: input.expiresAt,
        published_at: input.publishNow ? editing.publishedAt ?? new Date().toISOString() : null,
      });
    }
    return create(input);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description="Emita anúncios que aparecem para todos os estabelecimentos na plataforma. Cada anúncio é entregue uma única vez por conta e o estado de leitura fica registrado."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover sm:h-9 sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Emitir anúncio
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Publicados" value={stats.publicados} icon={Send} />
        <StatTile label="Rascunhos" value={stats.rascunhos} icon={Pencil} />
        <StatTile label="Leituras" value={stats.totalLeituras} icon={CheckCircle2} />
        <StatTile label="Total" value={stats.total} icon={Bell} />
      </div>

      {error && (
        <div className="rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[12.5px] text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-card border border-ink-200 bg-white px-4 py-12 text-center text-[12.5px] text-ink-400">
          Carregando…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" strokeWidth={2.2} />}
          title="Nenhuma notificação por aqui"
          description="Crie seu primeiro anúncio para que apareça no sino dos estabelecimentos na plataforma."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const status = announcementStatus(a);
            const KindIcon = KIND_META[a.kind].icon;
            const tone = STATUS_TONE[status];
            const isMenuOpen = openMenu === a.id;
            return (
              <li
                key={a.id}
                className="group relative rounded-card border border-ink-200 bg-white p-3.5 transition-colors hover:border-ink-300 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                      KIND_META[a.kind].tone,
                    )}
                  >
                    <KindIcon className="h-4 w-4" strokeWidth={2.2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                          tone.wrap,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                        {tone.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-700 ring-1 ring-inset ring-ink-200">
                        {KIND_META[a.kind].label}
                      </span>
                    </div>

                    <p className="mt-2 text-[14px] font-bold leading-[1.25] text-ink-900">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.5] text-ink-500">{a.body}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-500">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
                        {a.readsCount} {a.readsCount === 1 ? "leitura" : "leituras"}
                      </span>
                      <span className="hidden text-ink-300 sm:inline">·</span>
                      <span>
                        {a.publishedAt ? `Publicado ${formatRelative(a.publishedAt)}` : `Criado ${formatRelative(a.createdAt)}`}
                      </span>
                      {a.expiresAt && (
                        <>
                          <span className="hidden text-ink-300 sm:inline">·</span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" strokeWidth={2.4} />
                            Expira em {formatDateLong(a.expiresAt)}
                          </span>
                        </>
                      )}
                      {a.href && (
                        <>
                          <span className="hidden text-ink-300 sm:inline">·</span>
                          <span className="block w-full truncate font-mono text-[10.5px] sm:inline sm:w-auto">
                            {a.href}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-center gap-1.5 self-start sm:flex">
                    <PrimaryAction
                      status={status}
                      onPublish={() => void publish(a.id)}
                      onUnpublish={() => void unpublish(a.id)}
                    />

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(isMenuOpen ? null : a.id)}
                        aria-label="Ações"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                      >
                        <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                      {isMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-card border border-ink-200 bg-white py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]">
                            <button
                              type="button"
                              onClick={() => openEdit(a)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-700 transition-colors hover:bg-ink-50"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenu(null);
                                setConfirmDelete(a);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-danger-600 transition-colors hover:bg-danger-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-ink-100 pt-3 sm:hidden">
                  <PrimaryAction
                    status={status}
                    onPublish={() => void publish(a.id)}
                    onUnpublish={() => void unpublish(a.id)}
                    fullWidth
                  />
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-2 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={2.4} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(a)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-danger-200 bg-white px-2 text-[11.5px] font-semibold text-danger-600 transition-colors hover:bg-danger-50"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2.4} />
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AnnouncementComposer
        open={composerOpen}
        mode={editing ? "edit" : "create"}
        initial={editing}
        onClose={() => {
          setComposerOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir anúncio?"
        description={
          confirmDelete
            ? `"${confirmDelete.title}" será removido permanentemente. As leituras registradas também serão apagadas.`
            : ""
        }
        confirmLabel="Excluir"
        tone="danger"
        onConfirm={async () => {
          if (!confirmDelete) return;
          await remove(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function PrimaryAction({
  status,
  onPublish,
  onUnpublish,
  fullWidth,
}: {
  status: "rascunho" | "publicado" | "expirado";
  onPublish: () => void;
  onUnpublish: () => void;
  fullWidth?: boolean;
}) {
  const sizing = fullWidth
    ? "h-9 w-full px-2 text-[11.5px]"
    : "h-8 px-2.5 text-[11.5px]";
  if (status === "publicado") {
    return (
      <button
        type="button"
        onClick={onUnpublish}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50",
          sizing,
        )}
      >
        <EyeOff className="h-3 w-3" strokeWidth={2.4} />
        Despublicar
      </button>
    );
  }
  if (status === "rascunho") {
    return (
      <button
        type="button"
        onClick={onPublish}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-btn bg-ink-900 font-semibold text-white transition-colors hover:bg-ink-800",
          sizing,
        )}
      >
        <Send className="h-3 w-3" strokeWidth={2.4} />
        Publicar
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onPublish}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50",
        sizing,
      )}
    >
      <Eye className="h-3 w-3" strokeWidth={2.4} />
      Reativar
    </button>
  );
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-ink-200 bg-white p-4">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-ink-100 text-ink-700">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
        <p className="text-[18px] font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
