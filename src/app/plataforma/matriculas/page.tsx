"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { CalendarClock, GraduationCap, Percent, Plus, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { KpiCard } from "@/components/plataforma/KpiCard";
import { StudentFormModal } from "@/components/plataforma/StudentFormModal";
import { useToast } from "@/components/plataforma/Toast";
import { LeadCard, LeadColumn } from "@/components/plataforma/leads/LeadBoard";
import { LeadFormModal } from "@/components/plataforma/leads/LeadFormModal";
import { LeadSlideOver } from "@/components/plataforma/leads/LeadSlideOver";
import { LostLeadModal, ScheduleTrialModal } from "@/components/plataforma/leads/StageDialogs";
import { AnimatedNumber, PageIntro, useRevealRows } from "@/components/plataforma/motion";
import { onlyDigits } from "@/lib/cadastro/masks";
import { LEAD_SOURCE_LABEL, LEAD_STAGE_LABEL, firstName } from "@/lib/plataforma/format";
import { CLOSED_WINDOW_DAYS, LEAD_STAGES, funnelStats, isVisibleOnBoard, nextStage } from "@/lib/plataforma/leads";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Lead, LeadSource, LeadStage } from "@/lib/plataforma/types";

const SOURCE_OPTIONS = [
  { value: "all", label: "Todas as origens" },
  ...(Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((s) => ({ value: s, label: LEAD_SOURCE_LABEL[s] })),
];

export default function MatriculasPage() {
  return (
    <Suspense fallback={null}>
      <Funnel />
    </Suspense>
  );
}

function Funnel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { leads, staff, units, loading, staffById, updateLead, removeLead } = usePlataformaStore();
  const { profile } = useAccountSession();
  const { push } = useToast();
  const perms = profile?.permissions;
  const canEdit = Boolean(perms?.canRegisterStudents);
  const canDelete = Boolean(perms?.canDeleteRecords);
  const companyName = profile?.companyName ?? "academia";

  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [owner, setOwner] = useState("all");
  const [unit, setUnit] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formStage, setFormStage] = useState<LeadStage>("novo");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Lead | null>(null);
  const [lostFor, setLostFor] = useState<Lead | null>(null);
  const [enrollFor, setEnrollFor] = useState<Lead | null>(null);
  const [deleteFor, setDeleteFor] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);

  const openId = searchParams.get("lead");
  const openLead = openId ? leads.find((l) => l.id === openId) ?? null : null;

  const setOpenLead = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("lead", id);
      else params.delete("lead");
      const qs = params.toString();
      router.replace(qs ? `/plataforma/matriculas?${qs}` : "/plataforma/matriculas", { scroll: false });
    },
    [router, searchParams],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return leads.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (owner !== "all" && (l.ownerStaffId ?? "none") !== owner) return false;
      if (unit !== "all" && l.unitId !== unit) return false;
      if (!q) return true;
      return (
        l.fullName.toLowerCase().includes(q) ||
        (l.interest?.toLowerCase().includes(q) ?? false) ||
        (qDigits.length > 0 && onlyDigits(l.whatsapp ?? "").includes(qDigits))
      );
    });
  }, [leads, search, source, owner, unit]);

  const columns = useMemo(() => {
    const byStage = new Map<LeadStage, Lead[]>(LEAD_STAGES.map((s) => [s, []]));
    for (const lead of filtered) {
      if (!isVisibleOnBoard(lead)) continue;
      byStage.get(lead.stage)!.push(lead);
    }
    for (const [stage, list] of byStage) {
      list.sort((a, b) => {
        if (stage === "agendada") return (a.trialAt ?? "9").localeCompare(b.trialAt ?? "9");
        if (stage === "matriculado" || stage === "perdido") return b.stageChangedAt.localeCompare(a.stageChangedAt);
        // Etapas abertas: quem está parado há mais tempo primeiro.
        return a.stageChangedAt.localeCompare(b.stageChangedAt);
      });
    }
    return byStage;
  }, [filtered]);

  const stats = useMemo(() => funnelStats(leads), [leads]);
  const boardRef = useRevealRows<HTMLDivElement>([loading, source, owner, unit]);

  function move(lead: Lead, stage: LeadStage) {
    if (!canEdit || stage === lead.stage) return;
    if (stage === "agendada") return setScheduleFor(lead);
    if (stage === "perdido") return setLostFor(lead);
    if (stage === "matriculado") return setEnrollFor(lead);
    void updateLead(lead.id, { stage }).then((saved) => {
      if (saved) push({ tone: "success", title: `${firstName(lead.fullName)} em ${LEAD_STAGE_LABEL[stage]}` });
    });
  }

  function onDrop(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setOverStage(null);
    setDraggingId(null);
    const lead = leads.find((l) => l.id === id);
    if (lead) move(lead, stage);
  }

  const ownerOptions = useMemo(
    () => [
      { value: "all", label: "Todos os responsáveis" },
      ...staff.filter((s) => s.active).map((s) => ({ value: s.id, label: s.fullName })),
      { value: "none", label: profile?.isOwner ? "Dono / sem responsável" : "Sem responsável" },
    ],
    [staff, profile?.isOwner],
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Matrículas"
        title="Funil de matrículas"
        description="Do primeiro contato à matrícula. Arraste os cartões entre as etapas; aula marcada, perda e matrícula pedem só o essencial."
        actions={
          canEdit ? (
            <button
              type="button"
              onClick={() => {
                setFormStage("novo");
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Novo interessado
            </button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="No funil"
          value={<AnimatedNumber value={stats.open} />}
          hint="Interessados ainda em negociação"
          icon={<Users className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.05}
        />
        <KpiCard
          label="Aulas nos próximos 7 dias"
          value={<AnimatedNumber value={stats.trialsThisWeek} />}
          hint="Confirme na véspera"
          icon={<CalendarClock className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.1}
        />
        <KpiCard
          label="Matrículas no mês"
          value={<AnimatedNumber value={stats.enrolledThisMonth} />}
          hint="Vindas do funil"
          highlight
          icon={<GraduationCap className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.15}
        />
        <KpiCard
          label="Conversão · 90 dias"
          value={stats.conversion === null ? "—" : <AnimatedNumber value={stats.conversion} format={(v) => `${Math.round(v)}%`} />}
          hint={stats.createdInWindow > 0 ? `De ${stats.createdInWindow} interessado${stats.createdInWindow === 1 ? "" : "s"}` : "Sem interessados no período"}
          icon={<Percent className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.2}
        />
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} className="w-full lg:max-w-[360px]" placeholder="Buscar por nome, WhatsApp ou interesse" />
        <div className="flex flex-wrap items-center gap-2">
          <SelectFilter label="Origem" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
          <SelectFilter label="Responsável" value={owner} onChange={setOwner} options={ownerOptions} />
          {units.length > 1 && !profile?.unitScopeId && (
            <SelectFilter
              label="Unidade"
              value={unit}
              onChange={setUnit}
              options={[{ value: "all", label: "Todas as unidades" }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
            />
          )}
        </div>
      </div>

      <div ref={boardRef} className="-mx-3.5 overflow-x-auto px-3.5 pb-2 md:-mx-8 md:px-8">
        <div className="flex snap-x gap-3 2xl:grid 2xl:grid-cols-6">
          {LEAD_STAGES.map((stage) => {
            const list = columns.get(stage) ?? [];
            const closed = stage === "matriculado" || stage === "perdido";
            return (
              <LeadColumn
                key={stage}
                stage={stage}
                count={list.length}
                isOver={overStage === stage}
                canDrop={canEdit && draggingId !== null}
                footnote={closed ? `Últimos ${CLOSED_WINDOW_DAYS} dias` : undefined}
                onDragOver={() => setOverStage(stage)}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => onDrop(e, stage)}
                onAdd={
                  canEdit && (stage === "novo" || stage === "contato")
                    ? () => {
                        setEditing(null);
                        setFormStage(stage);
                        setFormOpen(true);
                      }
                    : undefined
                }
              >
                {loading
                  ? stage === "novo" && <div className="h-[110px] animate-pulse rounded-card border border-ink-100 bg-white" />
                  : list.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        ownerName={staffById(lead.ownerStaffId)?.fullName}
                        draggable={canEdit}
                        dragging={draggingId === lead.id}
                        companyName={companyName}
                        onOpen={() => setOpenLead(lead.id)}
                        onAdvance={() => {
                          const next = nextStage(lead.stage);
                          if (next) move(lead, next);
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", lead.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingId(lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverStage(null);
                        }}
                      />
                    ))}
              </LeadColumn>
            );
          })}
        </div>
      </div>

      {!loading && leads.length === 0 && (
        <p className="text-center text-[12.5px] text-ink-500">
          {canEdit
            ? "Ninguém no funil ainda. Cadastre quem perguntou pelo Instagram, WhatsApp ou passou na recepção."
            : "Os interessados cadastrados pela equipe aparecem aqui."}
        </p>
      )}

      <LeadSlideOver
        lead={openLead}
        canEdit={canEdit}
        canDelete={canDelete}
        companyName={companyName}
        onClose={() => setOpenLead(null)}
        onEdit={(lead) => {
          setEditing(lead);
          setFormOpen(true);
        }}
        onMove={move}
        onDelete={setDeleteFor}
      />

      <LeadFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        lead={editing ?? undefined}
        defaultStage={formStage}
      />
      <ScheduleTrialModal open={!!scheduleFor} onClose={() => setScheduleFor(null)} lead={scheduleFor} />
      <LostLeadModal open={!!lostFor} onClose={() => setLostFor(null)} lead={lostFor} />
      <StudentFormModal
        open={!!enrollFor}
        onClose={() => setEnrollFor(null)}
        title={enrollFor ? `Matricular ${firstName(enrollFor.fullName)}` : undefined}
        prefill={
          enrollFor
            ? {
                fullName: enrollFor.fullName,
                whatsapp: enrollFor.whatsapp,
                email: enrollFor.email,
                unitId: enrollFor.unitId,
                notes: [enrollFor.interest, enrollFor.notes].filter(Boolean).join(" · ") || undefined,
              }
            : undefined
        }
        onCreated={async (student) => {
          if (enrollFor) await updateLead(enrollFor.id, { stage: "matriculado", studentId: student.id });
        }}
      />
      <ConfirmDialog
        open={!!deleteFor}
        title={deleteFor ? `Excluir ${deleteFor.fullName} do funil?` : "Excluir interessado?"}
        description="O histórico do interessado também é apagado. Se ele só não fechou, prefira marcar como perdido: o motivo entra nos relatórios."
        confirmLabel="Excluir"
        cancelLabel="Manter"
        tone="danger"
        onCancel={() => setDeleteFor(null)}
        onConfirm={async () => {
          if (deleteFor) {
            const ok = await removeLead(deleteFor.id);
            if (ok) {
              setOpenLead(null);
              push({ tone: "info", title: "Interessado excluído" });
            }
          }
          setDeleteFor(null);
        }}
      />
    </div>
  );
}
