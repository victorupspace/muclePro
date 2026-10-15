"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserMinus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SelectFilter } from "@/components/admin/Filters";
import { PageIntro, useRevealList } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { CHURN_REASON_LABEL, LEAD_LOST_REASON_LABEL, STAFF_ROLE_LABEL, initials, toDateValue, todayValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import { supabase } from "@/lib/supabase/client";
import type { ChurnReason, LeadLostReason, StaffRole, TeamLogAction, TeamLogEntity, TeamLogEntry } from "@/lib/plataforma/types";

const PAGE_SIZE = 60;

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const ENTITY_OPTIONS: { value: "all" | TeamLogEntity; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "aluno", label: "Alunos" },
  { value: "lead", label: "Funil de matrículas" },
  { value: "pagamento", label: "Pagamentos" },
  { value: "treino", label: "Treinos" },
  { value: "avaliacao", label: "Avaliações físicas" },
  { value: "plano", label: "Planos" },
  { value: "funcionario", label: "Equipe" },
  { value: "unidade", label: "Unidades" },
  { value: "tarefa", label: "Tarefas" },
];

const ACTION_STYLE: Record<TeamLogAction, { icon: LucideIcon; tone: string }> = {
  criou: { icon: Plus, tone: "bg-brand/10 text-brand" },
  editou: { icon: Pencil, tone: "bg-ink-100 text-ink-700" },
  excluiu: { icon: Trash2, tone: "bg-danger-50 text-danger-700" },
  recebeu: { icon: CircleDollarSign, tone: "bg-success-50 text-success-700" },
  cancelou: { icon: Ban, tone: "bg-warning-50 text-warning-800" },
  inativou: { icon: UserMinus, tone: "bg-warning-50 text-warning-800" },
  reativou: { icon: RotateCcw, tone: "bg-success-50 text-success-700" },
  concluiu: { icon: CheckCircle2, tone: "bg-success-50 text-success-700" },
  acesso: { icon: KeyRound, tone: "bg-info-50 text-info-700" },
  moveu: { icon: ArrowRightLeft, tone: "bg-ink-100 text-ink-700" },
  matriculou: { icon: GraduationCap, tone: "bg-success-50 text-success-700" },
  perdeu: { icon: UserX, tone: "bg-danger-50 text-danger-700" },
};

type LogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string;
  actor_role: string | null;
  entity_type: TeamLogEntity;
  entity_id: string | null;
  action: TeamLogAction;
  summary: string;
  metadata: Record<string, unknown> | null;
};

const mapRow = (r: LogRow): TeamLogEntry => ({
  id: r.id,
  createdAt: r.created_at,
  actorUserId: r.actor_user_id ?? undefined,
  actorName: r.actor_name,
  actorRole: r.actor_role ?? undefined,
  entityType: r.entity_type,
  entityId: r.entity_id ?? undefined,
  action: r.action,
  summary: r.summary,
  metadata: r.metadata ?? undefined,
});

function roleLabel(role?: string) {
  if (!role) return "";
  if (role === "dono") return "Dono";
  if (role === "sistema") return "Automático";
  return STAFF_ROLE_LABEL[role as StaffRole] ?? role;
}

function dayLabel(iso: string) {
  const day = toDateValue(new Date(iso));
  const today = todayValue();
  const yesterday = toDateValue(new Date(Date.now() - 86_400_000));
  if (day === today) return "Hoje";
  if (day === yesterday) return "Ontem";
  const label = new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function AtividadesPage() {
  const { profile, status } = useAccountSession();
  const isManager = Boolean(profile?.permissions.isManager);

  if (status !== "checking" && profile && !isManager) {
    return (
      <div className="space-y-6">
        <PageIntro eyebrow="Atividade da equipe" title="Acesso restrito" description="Só a gestão acompanha o registro da equipe." />
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" strokeWidth={2.2} />}
          title="Você não tem acesso a esta página"
          description="Fale com o dono da academia se precisar dessas informações."
        />
      </div>
    );
  }

  return <TeamLog enabled={isManager} />;
}

function TeamLog({ enabled }: { enabled: boolean }) {
  const { payments, assessments, workouts } = usePlataformaStore();
  const [period, setPeriod] = useState("7");
  const [entity, setEntity] = useState<string>("all");
  const [actor, setActor] = useState<string>("all");
  const [entries, setEntries] = useState<TeamLogEntry[]>([]);
  const [actors, setActors] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const since = useMemo(() => new Date(Date.now() - Number(period) * 86_400_000).toISOString(), [period]);

  const fetchPage = useCallback(
    async (offset: number) => {
      let query = supabase
        .from("team_activity_log")
        .select("id, created_at, actor_user_id, actor_name, actor_role, entity_type, entity_id, action, summary, metadata")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (entity !== "all") query = query.eq("entity_type", entity);
      if (actor === "sistema") query = query.is("actor_user_id", null);
      else if (actor !== "all") query = query.eq("actor_user_id", actor);
      const { data, error } = await query;
      if (error) {
        setLoadError(error.message);
        return [];
      }
      setLoadError(null);
      return ((data ?? []) as LogRow[]).map(mapRow);
    },
    [since, entity, actor],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void fetchPage(0).then((rows) => {
      if (cancelled) return;
      setEntries(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, fetchPage]);

  // Lista de pessoas para o filtro: quem aparece no registro dos últimos 90 dias.
  useEffect(() => {
    if (!enabled) return;
    void supabase
      .from("team_activity_log")
      .select("actor_user_id, actor_name, actor_role")
      .gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        const seen = new Map<string, string>();
        for (const r of (data ?? []) as Pick<LogRow, "actor_user_id" | "actor_name" | "actor_role">[]) {
          const key = r.actor_user_id ?? "sistema";
          if (!seen.has(key)) seen.set(key, r.actor_user_id ? `${r.actor_name} · ${roleLabel(r.actor_role ?? undefined)}` : "Automático");
        }
        setActors(
          Array.from(seen.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      });
  }, [enabled]);

  async function loadMore() {
    setLoadingMore(true);
    const rows = await fetchPage(entries.length);
    setEntries((prev) => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  const groups = useMemo(() => {
    const out: { label: string; items: TeamLogEntry[] }[] = [];
    for (const entry of entries) {
      const label = dayLabel(entry.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(entry);
      else out.push({ label, items: [entry] });
    }
    return out;
  }, [entries]);

  const stats = useMemo(() => {
    const people = new Set(entries.filter((e) => e.actorUserId).map((e) => e.actorUserId));
    const received = entries.filter((e) => e.action === "recebeu").length;
    return { people: people.size, received };
  }, [entries]);

  const paymentStudent = useMemo(() => new Map(payments.map((p) => [p.id, p.studentId])), [payments]);
  const listRef = useRevealList<HTMLDivElement>([groups.length, period, entity, actor, loading]);

  function linkFor(entry: TeamLogEntry) {
    if (!entry.entityId || entry.action === "excluiu") return undefined;
    switch (entry.entityType) {
      case "aluno":
        return `/plataforma/alunos/${entry.entityId}`;
      case "pagamento": {
        const studentId = paymentStudent.get(entry.entityId);
        return studentId ? `/plataforma/alunos/${studentId}` : undefined;
      }
      case "plano":
        return "/plataforma/planos";
      case "funcionario":
        return "/plataforma/equipe";
      case "unidade":
        return "/plataforma/configuracoes";
      case "tarefa":
        return "/plataforma/tarefas";
      case "lead":
        return `/plataforma/matriculas?lead=${entry.entityId}`;
      case "treino": {
        const studentId = workouts.find((w) => w.id === entry.entityId)?.studentId;
        return studentId ? `/plataforma/alunos/${studentId}` : "/plataforma/treinos";
      }
      case "avaliacao": {
        const studentId = assessments.find((a) => a.id === entry.entityId)?.studentId;
        return studentId ? `/plataforma/alunos/${studentId}` : undefined;
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Atividade da equipe"
        title="Quem fez o quê"
        description="Cadastros, cobranças, pagamentos e mudanças de acesso, registrados automaticamente. Ninguém da equipe consegue editar ou apagar este registro."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter label="Período" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
          <SelectFilter label="Tipo" value={entity} onChange={setEntity} options={ENTITY_OPTIONS} />
          <SelectFilter label="Pessoa" value={actor} onChange={setActor} options={[{ value: "all", label: "Todos" }, ...actors]} />
        </div>
        {!loading && entries.length > 0 && (
          <p className="text-[12px] text-ink-500">
            <span className="font-bold text-ink-900">{entries.length}{hasMore ? "+" : ""}</span> registro{entries.length === 1 ? "" : "s"}
            {stats.people > 0 && <> · {stats.people} pessoa{stats.people === 1 ? "" : "s"}</>}
            {stats.received > 0 && <> · {stats.received} pagamento{stats.received === 1 ? "" : "s"} recebido{stats.received === 1 ? "" : "s"}</>}
          </p>
        )}
      </div>

      {loadError && (
        <div className="rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[13px] font-medium text-danger-700">
          Não foi possível carregar o registro: {loadError}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-card border border-ink-100 bg-ink-50/60" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Nada registrado nesse período"
          description="Tudo o que a equipe fizer a partir de agora aparece aqui: alunos cadastrados, pagamentos recebidos, acessos liberados."
        />
      ) : (
        <div ref={listRef} className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="sticky top-14 z-10 -mx-1 mb-2 bg-surface/90 px-1 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500 backdrop-blur-sm sm:top-[76px]">
                {group.label}
              </h2>
              <ol className="overflow-hidden rounded-card border border-ink-200 bg-white">
                {group.items.map((entry) => {
                  const style = ACTION_STYLE[entry.action];
                  const Icon = style.icon;
                  const href = linkFor(entry);
                  const motivo = entry.metadata?.motivo as string | undefined;
                  const reasonLabel = motivo
                    ? entry.entityType === "lead"
                      ? LEAD_LOST_REASON_LABEL[motivo as LeadLostReason]
                      : CHURN_REASON_LABEL[motivo as ChurnReason]
                    : undefined;
                  const body = (
                    <>
                      <span className="relative shrink-0">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                          {entry.actorUserId ? initials(entry.actorName) : "MP"}
                        </span>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white",
                            style.tone,
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" strokeWidth={2.8} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] leading-[1.45] text-ink-800">
                          <span className="font-semibold text-ink-900">{entry.actorName}</span>{" "}
                          <span className="text-ink-600">{lowerFirst(entry.summary)}</span>
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-500">
                          <span className="tabular-nums">
                            {new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {entry.actorRole && <span className="uppercase tracking-[0.08em]">{roleLabel(entry.actorRole)}</span>}
                          {reasonLabel && <span>Motivo: {reasonLabel}</span>}
                        </span>
                      </span>
                      {href && (
                        <ArrowUpRight
                          className="h-3.5 w-3.5 shrink-0 text-ink-300 transition-colors group-hover:text-ink-700"
                          strokeWidth={2.4}
                        />
                      )}
                    </>
                  );
                  const rowClass = "group flex items-start gap-3 border-t border-ink-100 px-3.5 py-3 first:border-t-0 md:px-4";
                  return (
                    <li key={entry.id}>
                      {href ? (
                        <Link href={href} className={cn(rowClass, "transition-colors hover:bg-ink-50/70")}>
                          {body}
                        </Link>
                      ) : (
                        <div className={rowClass}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex h-10 items-center justify-center rounded-btn border border-ink-200 bg-white px-4 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 disabled:opacity-60"
              >
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
