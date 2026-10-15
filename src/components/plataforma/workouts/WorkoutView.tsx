"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Copy, Download, Dumbbell, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { WORKOUT_LEVEL_LABEL, daysFromToday, formatDateValue, formatRelative, weekdaysLabel, whatsappLink } from "@/lib/plataforma/format";
import type { Student, WorkoutProgram } from "@/lib/plataforma/types";
import {
  WORKOUT_STATUS_LABEL,
  cycleLabel,
  cycleProgress,
  downloadWorkoutPdf,
  exerciseCount,
  workoutStatus,
  workoutWhatsappText,
  type WorkoutStatus,
} from "@/lib/plataforma/workouts";

export const WORKOUT_STATUS_TONE: Record<WorkoutStatus, string> = {
  ativa: "bg-success-50 text-success-700 ring-success-200",
  vencendo: "bg-warning-50 text-warning-800 ring-warning-200",
  reavaliar: "bg-danger-50 text-danger-700 ring-danger-200",
  arquivada: "bg-ink-100 text-ink-500 ring-ink-200",
};

export function WorkoutStatusBadge({ workout }: { workout: WorkoutProgram }) {
  const status = workoutStatus(workout);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
        WORKOUT_STATUS_TONE[status],
      )}
    >
      {WORKOUT_STATUS_LABEL[status]}
    </span>
  );
}

type Props = {
  workout: WorkoutProgram;
  student: Student;
  companyName: string;
  canEdit: boolean;
  canDelete: boolean;
  defaultOpen?: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

// Ficha completa: treinos lado a lado (ou empilhados no celular) e ações.
export function WorkoutView({ workout, student, companyName, canEdit, canDelete, defaultOpen = true, onEdit, onCopy, onToggleActive, onDelete }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [pdfBusy, setPdfBusy] = useState(false);
  const total = exerciseCount(workout);
  const status = workoutStatus(workout);
  const progress = cycleProgress(workout);
  const daysLeft = workout.reviewOn ? daysFromToday(workout.reviewOn) : null;
  const cycleCaption =
    daysLeft === null ? "" : daysLeft < 0 ? `Venceu há ${-daysLeft} dia${daysLeft === -1 ? "" : "s"}` : daysLeft === 0 ? "Vence hoje" : `Faltam ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`;

  async function pdf() {
    setPdfBusy(true);
    await downloadWorkoutPdf(workout, student, companyName).catch(() => null);
    setPdfBusy(false);
  }

  return (
    <article className={cn("rounded-card border bg-white", workout.active ? "border-ink-200" : "border-ink-200/70 bg-ink-50/40")}>
      <header className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between md:p-5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-start gap-3 text-left">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Dumbbell className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold tracking-[-0.01em] text-ink-900">{workout.title}</span>
              <WorkoutStatusBadge workout={workout} />
            </span>
            <span className="mt-0.5 block text-[12px] text-ink-500">
              {[
                workout.goal,
                workout.level ? WORKOUT_LEVEL_LABEL[workout.level] : null,
                `${workout.days.length} treino${workout.days.length === 1 ? "" : "s"} · ${total} exercício${total === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="mt-0.5 block text-[11.5px] text-ink-400">
              {workout.authorName ? `Por ${workout.authorName} · ` : ""}
              {workout.cycleMonths ? `Ciclo de ${cycleLabel(workout.cycleMonths)} · ` : ""}
              {formatDateValue(workout.startsOn)}
              {workout.active
                ? workout.reviewOn
                  ? ` a ${formatDateValue(workout.reviewOn)}`
                  : " · sem vencimento"
                : workout.endedOn
                  ? ` a ${formatDateValue(workout.endedOn)}`
                  : ""}
              {` · atualizada ${formatRelative(workout.updatedAt)}`}
            </span>
            {workout.active && progress !== null && (
              <span className="mt-2 flex max-w-[360px] items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <span
                    className={cn("block h-full rounded-full", status === "reavaliar" ? "bg-danger-500" : status === "vencendo" ? "bg-warning-500" : "bg-brand")}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 text-[10.5px] font-semibold text-ink-500">{cycleCaption}</span>
              </span>
            )}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
          {student.whatsapp && workout.active && (
            <a
              href={whatsappLink(student.whatsapp, workoutWhatsappText(workout, student, companyName))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-success-50 px-2.5 text-[11.5px] font-semibold text-success-700 ring-1 ring-inset ring-success-200 transition-colors hover:bg-success-100"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
              WhatsApp
            </a>
          )}
          <ActionBtn onClick={() => void pdf()} icon={<Download className="h-3.5 w-3.5" strokeWidth={2.2} />}>
            {pdfBusy ? "Gerando..." : "PDF"}
          </ActionBtn>
          {canEdit && (
            <>
              <ActionBtn onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />}>
                Editar
              </ActionBtn>
              <ActionBtn onClick={onCopy} icon={<Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}>
                {workout.active ? "Renovar ciclo" : "Usar como base"}
              </ActionBtn>
              <ActionBtn
                onClick={onToggleActive}
                icon={workout.active ? <Archive className="h-3.5 w-3.5" strokeWidth={2.2} /> : <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={2.2} />}
              >
                {workout.active ? "Arquivar" : "Reativar"}
              </ActionBtn>
            </>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Excluir ficha"
              className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </header>

      {open && (
        <div className="grid gap-3 border-t border-ink-100 p-4 md:p-5 xl:grid-cols-2">
          {workout.days.map((day, di) => (
            <section key={di} className="overflow-hidden rounded-btn border border-ink-200">
              <h3 className="flex items-baseline gap-2 border-b border-ink-200 bg-ink-50 px-3 py-2">
                <span className="text-[12.5px] font-bold text-ink-900">Treino {day.name}</span>
                {day.focus && <span className="min-w-0 truncate text-[11.5px] text-ink-500">{day.focus}</span>}
                {weekdaysLabel(day.weekdays) && (
                  <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-brand ring-1 ring-inset ring-brand/20">
                    {weekdaysLabel(day.weekdays)}
                  </span>
                )}
              </h3>
              <ol className="divide-y divide-ink-100">
                {day.exercises.map((e, ei) => (
                  <li key={ei} className="flex items-start gap-3 px-3 py-2">
                    <span className="w-4 shrink-0 pt-px text-[11px] font-semibold tabular-nums text-ink-400">{ei + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-ink-900">{e.name}</p>
                      {e.notes && <p className="text-[11px] text-ink-500">{e.notes}</p>}
                    </div>
                    <div className="shrink-0 text-right text-[11.5px] tabular-nums text-ink-700">
                      <p className="font-semibold">
                        {e.sets && e.reps ? `${e.sets} × ${e.reps}` : e.sets || e.reps || "—"}
                      </p>
                      <p className="text-ink-500">{[e.load, e.rest && `desc. ${e.rest}`].filter(Boolean).join(" · ")}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {workout.notes && (
            <p className="rounded-btn bg-ink-50 px-3 py-2 text-[12px] leading-[1.55] text-ink-700 xl:col-span-2">
              <span className="font-semibold">Observações: </span>
              {workout.notes}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ActionBtn({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-2.5 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
    >
      {icon}
      {children}
    </button>
  );
}
