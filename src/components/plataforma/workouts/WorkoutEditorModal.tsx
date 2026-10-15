"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Copy, Plus, Send, Trash2, X } from "lucide-react";
import { Field, inputClass, selectClass, textareaClass } from "../FormKit";
import { Modal } from "../Modal";
import { HealthAlert } from "../health/HealthKit";
import { useToast } from "../Toast";
import { cn } from "@/lib/cn";
import { WEEKDAY_ORDER, WEEKDAY_SHORT, WORKOUT_LEVEL_LABEL, addMonthsToDateValue, firstName, todayValue } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { WorkoutDay, WorkoutExercise, WorkoutLevel, WorkoutProgram } from "@/lib/plataforma/types";
import { ALL_EXERCISES, CYCLE_OPTIONS, DEFAULT_CYCLE_MONTHS, WORKOUT_TEMPLATES, cleanDays, cycleLabel, emptyDay, emptyExercise } from "@/lib/plataforma/workouts";

type Props = {
  open: boolean;
  onClose: () => void;
  // Aluno fixo (ficha do aluno) ou escolhido no próprio modal (página Treinos).
  studentId?: string;
  workout?: WorkoutProgram;
  // Nova ficha a partir de uma existente.
  copyFrom?: WorkoutProgram;
};

const LEVELS = Object.keys(WORKOUT_LEVEL_LABEL) as WorkoutLevel[];
const cellInput =
  "h-9 w-full rounded-[6px] border border-ink-200 bg-white px-2 text-[12.5px] text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

export function WorkoutEditorModal({ open, onClose, studentId, workout, copyFrom }: Props) {
  const { students, workouts, addWorkout, updateWorkout } = usePlataformaStore();
  const { push } = useToast();
  const editing = Boolean(workout);

  const [student, setStudent] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<WorkoutLevel | "">("");
  const [startsOn, setStartsOn] = useState(todayValue());
  const [reviewOn, setReviewOn] = useState("");
  const [cycleMonths, setCycleMonths] = useState<number | "">(DEFAULT_CYCLE_MONTHS);
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<WorkoutDay[]>([emptyDay(0)]);
  const [activeDay, setActiveDay] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const source = workout ?? copyFrom;
    setStudent(workout?.studentId ?? studentId ?? copyFrom?.studentId ?? "");
    setTitle(workout?.title ?? (copyFrom ? `${copyFrom.title} (nova)` : ""));
    setGoal(source?.goal ?? "");
    setLevel(source?.level ?? "");
    setStartsOn(workout?.startsOn ?? todayValue());
    const months = workout ? workout.cycleMonths ?? "" : copyFrom?.cycleMonths ?? DEFAULT_CYCLE_MONTHS;
    setCycleMonths(months);
    setReviewOn(workout?.reviewOn ?? (workout ? "" : months ? addMonthsToDateValue(todayValue(), months) : ""));
    setNotes(source?.notes ?? "");
    setDays(
      source?.days.length
        ? source.days.map((d) => ({ ...d, weekdays: [...(d.weekdays ?? [])], exercises: d.exercises.map((e) => ({ ...e })) }))
        : [emptyDay(0)],
    );
    setActiveDay(0);
    setError(null);
  }, [open, workout, copyFrom, studentId]);

  const activeStudents = useMemo(
    () => students.filter((s) => s.status === "ativo").sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students],
  );
  // Ficha em uso que será arquivada quando esta for liberada.
  const currentActive = useMemo(
    () => workouts.filter((w) => w.studentId === student && w.active && w.id !== workout?.id),
    [workouts, student, workout?.id],
  );
  // Ficha nova ou rascunho: dá para salvar para revisar ou liberar ao aluno.
  const isDraftFlow = !workout || (!workout.active && !workout.publishedAt);
  const releaseRef = useRef(false);
  const studentObj = students.find((s) => s.id === student);
  const studentName = studentObj?.fullName;

  function changeCycle(value: string) {
    const months = value ? Number(value) : "";
    setCycleMonths(months);
    if (months) setReviewOn(addMonthsToDateValue(startsOn || todayValue(), months));
  }
  function changeStart(value: string) {
    setStartsOn(value);
    if (cycleMonths && value) setReviewOn(addMonthsToDateValue(value, cycleMonths));
  }
  function toggleWeekday(d: number) {
    const current = day.weekdays ?? [];
    patchDay(activeDay, { weekdays: current.includes(d) ? current.filter((x) => x !== d) : [...current, d] });
  }

  const day = days[activeDay] ?? days[0];

  function patchDay(index: number, patch: Partial<WorkoutDay>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }
  function patchExercise(ei: number, patch: Partial<WorkoutExercise>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === activeDay ? { ...d, exercises: d.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) } : d,
      ),
    );
  }
  function moveExercise(ei: number, dir: -1 | 1) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDay) return d;
        const list = [...d.exercises];
        const target = ei + dir;
        if (target < 0 || target >= list.length) return d;
        [list[ei], list[target]] = [list[target], list[ei]];
        return { ...d, exercises: list };
      }),
    );
  }
  function removeExercise(ei: number) {
    setDays((prev) =>
      prev.map((d, i) => (i === activeDay ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d)),
    );
  }
  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length)]);
    setActiveDay(days.length);
  }
  function duplicateDay() {
    setDays((prev) => [...prev, { ...emptyDay(prev.length), focus: day.focus, weekdays: [], exercises: day.exercises.map((e) => ({ ...e })) }]);
    setActiveDay(days.length);
  }
  function removeDay(index: number) {
    if (days.length === 1) return;
    setDays((prev) => prev.filter((_, i) => i !== index));
    setActiveDay((a) => Math.max(0, a >= index ? a - 1 : a));
  }
  function applyTemplate(id: string) {
    const t = WORKOUT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTitle((v) => v || t.title);
    setGoal((v) => v || t.goal);
    setDays(t.days.map((d) => ({ ...d, weekdays: [...(d.weekdays ?? [])], exercises: d.exercises.map((e) => ({ ...e })) })));
    setActiveDay(0);
  }

  const isBlank = days.every((d) => d.exercises.every((e) => !e.name.trim()));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanDays(days);
    if (!student) return setError("Escolha o aluno.");
    if (!title.trim()) return setError("Dê um nome para a ficha. Ex.: Hipertrofia ABC.");
    if (clean.length === 0) return setError("Adicione pelo menos um exercício.");
    setError(null);
    setSubmitting(true);
    const payload = {
      title,
      goal: goal.trim(),
      level: level || undefined,
      notes: notes.trim(),
      days: clean,
      startsOn,
      reviewOn,
      cycleMonths: cycleMonths || 0,
    };
    // Liberar = ativar; o banco arquiva a ficha em uso e registra a liberação.
    const release = isDraftFlow && releaseRef.current;
    let saved: WorkoutProgram | null;
    if (workout) {
      saved = await updateWorkout(workout.id, {
        ...payload,
        level: level || ("" as WorkoutLevel),
        ...(release ? { active: true } : {}),
      });
    } else {
      saved = await addWorkout({ studentId: student, ...payload, active: release });
    }
    setSubmitting(false);
    if (saved) {
      const name = studentName ? firstName(studentName) : "O aluno";
      push(
        release
          ? {
              tone: "success",
              title: "Ficha liberada ao aluno",
              description: `${currentActive.length > 0 ? "A ficha anterior foi para o histórico. " : ""}${name} já vê o novo treino na área do aluno.`,
            }
          : isDraftFlow
            ? { tone: "success", title: "Rascunho salvo", description: `Revise e libere quando estiver pronto. ${name} ainda não vê esta ficha.` }
            : { tone: "success", title: "Ficha atualizada", description: workout?.active ? `${name} já vê as mudanças.` : undefined },
      );
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={editing ? "Editar ficha de treino" : "Nova ficha de treino"}
      description={studentName && (studentId || editing) ? studentName : "Monte os treinos do aluno. Linhas sem exercício são ignoradas."}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {error && (
            <p role="alert" className="text-[12px] font-semibold text-danger-600 sm:mr-auto">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Cancelar
          </button>
          {isDraftFlow ? (
            <>
              <button
                type="submit"
                form="workout-form"
                onClick={() => (releaseRef.current = false)}
                disabled={submitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-brand/30 bg-brand/[0.05] px-4 text-[13px] font-semibold text-brand transition-colors hover:bg-brand/10 disabled:opacity-60 sm:h-10 sm:w-auto"
              >
                {submitting && !releaseRef.current ? "Salvando..." : "Salvar para revisar"}
              </button>
              <button
                type="submit"
                form="workout-form"
                onClick={() => (releaseRef.current = true)}
                disabled={submitting}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 sm:h-10 sm:w-auto"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                {submitting && releaseRef.current ? "Liberando..." : "Salvar e liberar ao aluno"}
              </button>
            </>
          ) : (
            <button
              type="submit"
              form="workout-form"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 sm:h-10 sm:w-auto"
            >
              {submitting ? "Salvando..." : "Salvar ficha"}
            </button>
          )}
        </div>
      }
    >
      <form id="workout-form" onSubmit={handleSubmit} className="space-y-4">
        {studentObj && <HealthAlert student={studentObj} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {!studentId && !editing && (
            <Field label="Aluno" required className="sm:col-span-2 lg:col-span-4">
              <select value={student} onChange={(e) => setStudent(e.target.value)} className={selectClass}>
                <option value="">Escolha o aluno</option>
                {activeStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Nome da ficha" required className="sm:col-span-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Hipertrofia ABC" className={inputClass} />
          </Field>
          <Field label="Objetivo" className="sm:col-span-2">
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: ganho de massa, emagrecimento" className={inputClass} />
          </Field>
          <Field label="Nível">
            <select value={level} onChange={(e) => setLevel(e.target.value as WorkoutLevel | "")} className={selectClass}>
              <option value="">Não informar</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {WORKOUT_LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Início do ciclo">
            <input type="date" value={startsOn} onChange={(e) => changeStart(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Trocar a rotina a cada">
            <select value={cycleMonths} onChange={(e) => changeCycle(e.target.value)} className={selectClass}>
              <option value="">Sem prazo definido</option>
              {CYCLE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {cycleLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vencimento do ciclo" hint={reviewOn ? "Lembrete na agenda de quem montou, 7 dias antes." : undefined}>
            <input type="date" value={reviewOn} onChange={(e) => setReviewOn(e.target.value)} className={inputClass} />
          </Field>
          {!editing && isBlank && (
            <Field label="Começar de um modelo">
              <select value="" onChange={(e) => applyTemplate(e.target.value)} className={selectClass}>
                <option value="">Ficha em branco</option>
                {WORKOUT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* Treinos A, B, C… */}
        <div className="rounded-card border border-ink-200">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-ink-200 px-2 pt-2">
            {days.map((d, i) => (
              <div key={i} className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setActiveDay(i)}
                  className={cn(
                    "relative h-9 rounded-t-[6px] px-3 text-[12.5px] font-semibold transition-colors",
                    i === activeDay ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100",
                  )}
                >
                  Treino {d.name || i + 1}
                  <span className={cn("ml-1.5 text-[10.5px]", i === activeDay ? "text-white/60" : "text-ink-400")}>
                    {d.exercises.filter((e) => e.name.trim()).length}
                  </span>
                </button>
              </div>
            ))}
            {days.length < 7 && (
              <button
                type="button"
                onClick={addDay}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-t-[6px] px-2.5 text-[12px] font-semibold text-brand hover:bg-brand/10"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Treino
              </button>
            )}
          </div>

          <div className="space-y-3 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="Letra" className="sm:w-[90px]">
                <input value={day.name} onChange={(e) => patchDay(activeDay, { name: e.target.value.slice(0, 6) })} className={inputClass} />
              </Field>
              <Field label="Foco do treino" className="flex-1">
                <input
                  value={day.focus ?? ""}
                  onChange={(e) => patchDay(activeDay, { focus: e.target.value })}
                  placeholder="Ex.: peito e tríceps"
                  className={inputClass}
                />
              </Field>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={duplicateDay}
                  className="inline-flex h-10 items-center gap-1 rounded-btn border border-ink-200 px-2.5 text-[12px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Duplicar
                </button>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(activeDay)}
                    className="inline-flex h-10 items-center gap-1 rounded-btn border border-ink-200 px-2.5 text-[12px] font-semibold text-danger-600 hover:border-danger-300 hover:bg-danger-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Remover
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Dias</span>
              {WEEKDAY_ORDER.map((d) => {
                const on = (day.weekdays ?? []).includes(d);
                const usedElsewhere = days.some((other, i) => i !== activeDay && (other.weekdays ?? []).includes(d));
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleWeekday(d)}
                    title={usedElsewhere && !on ? "Já usado em outro treino" : undefined}
                    className={cn(
                      "inline-flex h-8 min-w-[46px] items-center justify-center rounded-full border px-2.5 text-[12px] font-semibold transition-colors",
                      on
                        ? "border-brand bg-brand text-white"
                        : usedElsewhere
                          ? "border-dashed border-ink-200 bg-white text-ink-400 hover:border-ink-400"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-400",
                    )}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>

            <div className="hidden grid-cols-[22px_minmax(0,1fr)_60px_70px_80px_70px_76px] gap-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500 md:grid">
              <span>#</span>
              <span>Exercício</span>
              <span>Séries</span>
              <span>Reps</span>
              <span>Carga</span>
              <span title="Descanso entre as séries">Descanso</span>
              <span />
            </div>

            <ol className="space-y-2 md:space-y-1.5">
              {day.exercises.map((ex, ei) => (
                <li key={ei} className="rounded-btn border border-ink-100 p-2 md:border-0 md:p-0">
                  <div className="grid grid-cols-4 gap-1.5 md:grid-cols-[22px_minmax(0,1fr)_60px_70px_80px_70px_76px] md:items-center">
                    <span className="hidden text-[12px] font-semibold tabular-nums text-ink-400 md:block">{ei + 1}</span>
                    <input
                      value={ex.name}
                      onChange={(e) => patchExercise(ei, { name: e.target.value })}
                      list="exercise-library"
                      placeholder="Exercício"
                      aria-label={`Exercício ${ei + 1}`}
                      className={cn(cellInput, "col-span-4 font-semibold md:col-span-1")}
                    />
                    <input value={ex.sets ?? ""} onChange={(e) => patchExercise(ei, { sets: e.target.value })} placeholder="3" aria-label="Séries" className={cellInput} />
                    <input value={ex.reps ?? ""} onChange={(e) => patchExercise(ei, { reps: e.target.value })} placeholder="12" aria-label="Repetições" className={cellInput} />
                    <input value={ex.load ?? ""} onChange={(e) => patchExercise(ei, { load: e.target.value })} placeholder="20 kg" aria-label="Carga" className={cellInput} />
                    <input value={ex.rest ?? ""} onChange={(e) => patchExercise(ei, { rest: e.target.value })} placeholder="60s" aria-label="Descanso" className={cellInput} />
                    <div className="col-span-4 flex items-center justify-end gap-0.5 md:col-span-1">
                      <IconBtn label="Subir" disabled={ei === 0} onClick={() => moveExercise(ei, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </IconBtn>
                      <IconBtn label="Descer" disabled={ei === day.exercises.length - 1} onClick={() => moveExercise(ei, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </IconBtn>
                      <IconBtn label="Remover exercício" danger onClick={() => removeExercise(ei)}>
                        <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </IconBtn>
                    </div>
                  </div>
                  <input
                    value={ex.notes ?? ""}
                    onChange={(e) => patchExercise(ei, { notes: e.target.value })}
                    placeholder="Observação (opcional): cadência, técnica, máquina…"
                    aria-label="Observação do exercício"
                    className={cn(cellInput, "mt-1.5 h-8 border-dashed text-[11.5px] md:ml-[28px] md:w-[calc(100%-28px-82px)]")}
                  />
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => patchDay(activeDay, { exercises: [...day.exercises, emptyExercise()] })}
              className="inline-flex h-9 items-center gap-1 rounded-btn border border-dashed border-ink-300 px-3 text-[12px] font-semibold text-ink-600 hover:border-ink-500 hover:text-ink-900"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Adicionar exercício
            </button>
          </div>
        </div>

        <Field label="Observações gerais">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={textareaClass} placeholder="Aquecimento, frequência semanal, cuidados com lesões…" />
        </Field>

        {isDraftFlow && (
          <p className="flex items-start gap-2 rounded-btn border border-ink-200 bg-ink-50/60 px-3 py-2.5 text-[12.5px] leading-[1.5] text-ink-700">
            <Archive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" strokeWidth={2.2} />
            <span>
              &quot;Salvar para revisar&quot; guarda um rascunho que o aluno ainda não vê.
              {currentActive.length > 0
                ? ` Ao liberar, a ficha atual (${currentActive.map((w) => `"${w.title}"`).join(", ")}) é arquivada e vai para o histórico de ciclos.`
                : " Ao liberar, a ficha aparece na área do aluno."}
            </span>
          </p>
        )}

        <datalist id="exercise-library">
          {ALL_EXERCISES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </form>
    </Modal>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-500 transition-colors disabled:opacity-30",
        danger ? "hover:bg-danger-50 hover:text-danger-600" : "hover:bg-ink-100 hover:text-ink-900",
      )}
    >
      {children}
    </button>
  );
}
