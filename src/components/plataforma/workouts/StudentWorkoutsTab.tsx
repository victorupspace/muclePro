"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, ChevronDown, Dumbbell, History, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "../Toast";
import { HealthAlert } from "../health/HealthKit";
import { WorkoutEditorModal } from "./WorkoutEditorModal";
import { WorkoutView } from "./WorkoutView";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { formatDateValue, weekdaysLabel } from "@/lib/plataforma/format";
import { cycleDurationMonths, cycleLabel, exerciseCount } from "@/lib/plataforma/workouts";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Student, WorkoutLog, WorkoutProgram } from "@/lib/plataforma/types";

// Aba "Treinos" da ficha do aluno.
export function StudentWorkoutsTab({ student }: { student: Student }) {
  const { workoutsFor, updateWorkout, removeWorkout, logsFor } = usePlataformaStore();
  const { profile } = useAccountSession();
  const { push } = useToast();
  const canEdit = Boolean(profile?.permissions.canCreateWorkouts);
  const companyName = profile?.companyName ?? "academia";

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutProgram | undefined>();
  const [copyFrom, setCopyFrom] = useState<WorkoutProgram | undefined>();
  const [deleting, setDeleting] = useState<WorkoutProgram | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = workoutsFor(student.id);
  const logs = logsFor(student.id);
  const active = list.filter((w) => w.active);
  const drafts = list.filter((w) => !w.active && !w.publishedAt);
  const archived = list
    .filter((w) => !w.active && w.publishedAt)
    .sort((a, b) => (b.endedOn ?? b.startsOn).localeCompare(a.endedOn ?? a.startsOn));
  const byYear = archived.reduce<Map<string, WorkoutProgram[]>>((map, w) => {
    const year = (w.endedOn ?? w.startsOn).slice(0, 4);
    map.set(year, [...(map.get(year) ?? []), w]);
    return map;
  }, new Map());

  function canDeleteWorkout(w: WorkoutProgram) {
    return Boolean(profile?.permissions.canDeleteRecords || (profile?.staffId && w.authorStaffId === profile.staffId));
  }

  function openEditor(opts: { workout?: WorkoutProgram; copy?: WorkoutProgram } = {}) {
    setEditing(opts.workout);
    setCopyFrom(opts.copy);
    setEditorOpen(true);
  }

  async function publish(w: WorkoutProgram) {
    const current = active[0];
    const saved = await updateWorkout(w.id, { active: true });
    if (!saved) return;
    push({
      tone: "success",
      title: "Ficha liberada ao aluno",
      description: `${current ? `"${current.title}" foi para o histórico. ` : ""}${
        student.hasAppLogin ? "Avise pelo WhatsApp que o treino novo está na área do aluno." : "O aluno ainda não tem a área do aluno: envie o acesso pelo botão App."
      }`,
    });
  }

  async function toggle(w: WorkoutProgram) {
    const current = active.find((x) => x.id !== w.id);
    const saved = await updateWorkout(w.id, { active: !w.active });
    if (!saved) return;
    push(
      saved.active
        ? {
            tone: "info",
            title: "Ficha reativada",
            description: current ? `"${current.title}" foi arquivada e está no histórico de ciclos.` : undefined,
          }
        : { tone: "info", title: "Ficha arquivada", description: "Ela continua no histórico de ciclos." },
    );
  }

  const render = (w: WorkoutProgram, defaultOpen: boolean) => (
    <WorkoutView
      key={w.id}
      workout={w}
      student={student}
      companyName={companyName}
      canEdit={canEdit}
      canDelete={canDeleteWorkout(w)}
      defaultOpen={defaultOpen}
      onEdit={() => openEditor({ workout: w })}
      onCopy={() => openEditor({ copy: w })}
      onToggleActive={() => void toggle(w)}
      onDelete={() => setDeleting(w)}
      onPublish={() => void publish(w)}
      logs={logs}
    />
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-ink-500">
          {active.length > 0
            ? student.hasAppLogin
              ? "Ficha em uso, visível na área do aluno. Fichas novas ficam em rascunho até você liberar."
              : "Ficha em uso. Libere a área do aluno pelo botão App ou envie em PDF."
            : drafts.length > 0
              ? "Revise o rascunho e libere quando estiver pronto."
              : "Este aluno ainda não tem ficha em uso."}
        </p>
        {canEdit && student.status === "ativo" && (
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Nova ficha
          </button>
        )}
      </div>

      <HealthAlert student={student} />

      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-ink-300 bg-white px-6 py-10 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Dumbbell className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <p className="mt-3 text-[14px] font-semibold text-ink-900">Nenhuma ficha de treino</p>
          <p className="mt-1 max-w-[380px] text-[12.5px] leading-[1.55] text-ink-500">
            {canEdit
              ? "Monte os treinos A, B e C com séries, repetições e carga. Dá para começar de um modelo pronto."
              : "Quem tem permissão de treinos (como o personal) monta a ficha deste aluno."}
          </p>
        </div>
      ) : (
        <>
          {drafts.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-info-700">Rascunhos para revisar</p>
              {drafts.map((w) => render(w, true))}
            </div>
          )}
          {active.map((w) => render(w, true))}
          {logs.length > 0 && <TrainingLog logs={logs} />}
          {archived.length > 0 && (
            <section className="rounded-card border border-ink-200 bg-white">
              <header className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 md:px-5">
                <History className="h-4 w-4 text-ink-500" strokeWidth={2.2} />
                <h2 className="text-[13.5px] font-bold text-ink-900">Histórico de ciclos</h2>
                <span className="text-[11.5px] text-ink-500">
                  · {archived.length} ciclo{archived.length === 1 ? "" : "s"} encerrado{archived.length === 1 ? "" : "s"}
                </span>
              </header>
              <div className="divide-y divide-ink-100">
                {Array.from(byYear.entries()).map(([year, items]) => (
                  <div key={year} className="px-4 py-3 md:px-5">
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{year}</p>
                    <ol className="relative space-y-2 border-l border-ink-200 pl-4">
                      {items.map((w) => {
                        const open = expanded === w.id;
                        const months = cycleDurationMonths(w);
                        return (
                          <li key={w.id} className="relative">
                            <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-ink-300" />
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : w.id)}
                              aria-expanded={open}
                              className="flex w-full items-start justify-between gap-3 rounded-btn px-2 py-2 text-left transition-colors hover:bg-ink-50"
                            >
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold text-ink-900">{w.title}</span>
                                <span className="block text-[11.5px] text-ink-500">
                                  {formatDateValue(w.startsOn)} a {formatDateValue(w.endedOn)} ·{" "}
                                  {months < 1 ? "menos de 1 mês" : `${Math.round(months)} ${Math.round(months) === 1 ? "mês" : "meses"}`}
                                  {w.cycleMonths ? ` (previsto ${cycleLabel(w.cycleMonths)})` : ""}
                                </span>
                                <span className="block text-[11px] text-ink-400">
                                  {w.days.map((d) => `${d.name}${weekdaysLabel(d.weekdays) ? ` ${weekdaysLabel(d.weekdays)}` : ""}`).join("  /  ")} · {exerciseCount(w)} exercícios
                                  {w.authorName ? ` · ${w.authorName}` : ""}
                                </span>
                              </span>
                              <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} strokeWidth={2.2} />
                            </button>
                            {open && <div className="mt-2">{render(w, true)}</div>}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <WorkoutEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} studentId={student.id} workout={editing} copyFrom={copyFrom} />
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Excluir a ficha "${deleting.title}"?` : "Excluir ficha?"}
        description="Não dá para desfazer. Se ela só saiu de uso, prefira arquivar: fica no histórico do aluno."
        confirmLabel="Excluir ficha"
        cancelLabel="Manter"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && (await removeWorkout(deleting.id))) push({ tone: "info", title: "Ficha excluída" });
          setDeleting(null);
        }}
      />
    </motion.div>
  );
}

// Treinos feitos pelo aluno na área do aluno.
function TrainingLog({ logs }: { logs: WorkoutLog[] }) {
  const done = logs.filter((l) => l.finishedAt || l.exercises.some((e) => e.done));
  const since = (days: number) => done.filter((l) => Date.now() - new Date(`${l.performedOn}T12:00:00`).getTime() <= days * 86_400_000).length;
  return (
    <section className="rounded-card border border-ink-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-ink-500" strokeWidth={2.2} />
          <h2 className="text-[13.5px] font-bold text-ink-900">Treinos feitos pelo aluno</h2>
        </div>
        <p className="text-[11.5px] text-ink-500">
          <span className="font-bold text-ink-900">{since(7)}</span> nos últimos 7 dias · <span className="font-bold text-ink-900">{since(30)}</span> em 30 dias
        </p>
      </header>
      <ol className="divide-y divide-ink-100">
        {done.slice(0, 8).map((log) => {
          const checked = log.exercises.filter((e) => e.done).length;
          const loads = log.exercises.filter((e) => e.load);
          return (
            <li key={log.id} className="px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink-900">
                  Treino {log.dayName}
                  <span className="ml-2 text-[11.5px] font-normal text-ink-500">{formatDateValue(log.performedOn)}</span>
                </p>
                <span className={cn("text-[11.5px] font-semibold", log.finishedAt ? "text-success-700" : "text-warning-800")}>
                  {log.finishedAt ? "Concluído" : "Incompleto"} · {checked}/{log.exercises.length} exercícios
                </span>
              </div>
              {loads.length > 0 && (
                <p className="mt-1 text-[11.5px] leading-[1.5] text-ink-600">
                  {loads.map((e) => `${e.name}: ${e.load}`).join(" · ")}
                </p>
              )}
              {log.comment && (
                <p className="mt-1.5 rounded-btn bg-ink-50 px-2.5 py-1.5 text-[12px] leading-[1.5] text-ink-800">&ldquo;{log.comment}&rdquo;</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
