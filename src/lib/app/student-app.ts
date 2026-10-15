import { supabase } from "@/lib/supabase/client";
import { toDateValue } from "@/lib/plataforma/format";
import type { Assessment, HealthCondition, WorkoutDay, WorkoutLogExercise } from "@/lib/plataforma/types";

// Área do aluno: tudo passa pelas funções student_app_* do banco, que só
// devolvem os dados do próprio aluno.

export type AppWorkout = {
  id: string;
  title: string;
  goal?: string;
  notes?: string;
  days: WorkoutDay[];
  startsOn: string;
  reviewOn?: string;
  cycleMonths?: number;
  authorName?: string;
};

export type AppLog = {
  id: string;
  workoutId: string;
  dayName: string;
  performedOn: string;
  exercises: WorkoutLogExercise[];
  comment?: string;
  finishedAt?: string;
};

export type AppPayment = { id: string; amount: number; dueAt: string; status: "pendente" | "pago" | "cancelado"; paidAt?: string; reference?: string };

export type AppHome = {
  student: {
    id: string;
    fullName: string;
    healthConditions: HealthCondition[];
    healthRestrictions?: string;
    medicalNotes?: string;
    planName?: string;
  };
  account: { companyName: string };
  workout: AppWorkout | null;
  logs: AppLog[];
  assessments: Assessment[];
  payments: AppPayment[];
};

const n = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : Number(v));
const s = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : String(v));

type Raw = Record<string, unknown>;

export class AppAccessError extends Error {}

export async function loadHome(): Promise<AppHome> {
  const { data, error } = await supabase.rpc("student_app_home");
  if (error) {
    if (error.code === "42501") throw new AppAccessError(error.message);
    throw new Error(error.message);
  }
  const raw = data as Raw;
  const student = raw.student as Raw;
  const workout = raw.workout as Raw | null;
  return {
    student: {
      id: String(student.id),
      fullName: String(student.fullName),
      healthConditions: (student.healthConditions as HealthCondition[] | null) ?? [],
      healthRestrictions: s(student.healthRestrictions),
      medicalNotes: s(student.medicalNotes),
      planName: s(student.planName),
    },
    account: { companyName: String((raw.account as Raw | null)?.companyName ?? "Academia") },
    workout: workout
      ? {
          id: String(workout.id),
          title: String(workout.title),
          goal: s(workout.goal),
          notes: s(workout.notes),
          days: Array.isArray(workout.days) ? (workout.days as WorkoutDay[]) : [],
          startsOn: String(workout.startsOn),
          reviewOn: s(workout.reviewOn),
          cycleMonths: n(workout.cycleMonths),
          authorName: s(workout.authorName),
        }
      : null,
    logs: ((raw.logs as Raw[]) ?? []).map(mapLog),
    assessments: ((raw.assessments as Raw[]) ?? []).map((a) => ({
      id: String(a.id),
      studentId: String(student.id),
      kind: a.kind as Assessment["kind"],
      measuredOn: String(a.measuredOn),
      weightKg: n(a.weightKg),
      heightCm: n(a.heightCm),
      armCm: n(a.armCm),
      chestCm: n(a.chestCm),
      waistCm: n(a.waistCm),
      abdomenCm: n(a.abdomenCm),
      thighCm: n(a.thighCm),
      createdAt: String(a.measuredOn),
    })),
    payments: ((raw.payments as Raw[]) ?? []).map((p) => ({
      id: String(p.id),
      amount: Number(p.amount),
      dueAt: String(p.dueAt),
      status: p.status as AppPayment["status"],
      paidAt: s(p.paidAt),
      reference: s(p.reference),
    })),
  };
}

function mapLog(l: Raw): AppLog {
  return {
    id: String(l.id),
    workoutId: String(l.workoutId),
    dayName: String(l.dayName),
    performedOn: String(l.performedOn),
    exercises: Array.isArray(l.exercises) ? (l.exercises as WorkoutLogExercise[]) : [],
    comment: s(l.comment),
    finishedAt: s(l.finishedAt),
  };
}

export async function saveLog(input: { workoutId: string; dayName: string; exercises: WorkoutLogExercise[]; comment?: string; finish?: boolean }) {
  const { data, error } = await supabase.rpc("student_app_save_log", {
    p_workout: input.workoutId,
    p_day: input.dayName,
    p_exercises: input.exercises,
    p_comment: input.comment ?? null,
    p_finish: input.finish ?? false,
  });
  if (error) throw new Error(error.message);
  return mapLog(data as Raw);
}

export async function reportHealth(message: string) {
  const { error } = await supabase.rpc("student_app_report_health", { p_message: message });
  if (error) throw new Error(error.message);
}

export const todayKey = () => toDateValue(new Date());

// Treino de hoje: pelo dia da semana; sem dias definidos, segue o rodízio
// (o próximo depois do último feito). null = dia de descanso.
export function pickTodayDay(workout: AppWorkout, logs: AppLog[]): { day: WorkoutDay | null; reason: "semana" | "rodizio" | "descanso" } {
  const weekday = new Date().getDay();
  const scheduled = workout.days.find((d) => d.weekdays?.includes(weekday));
  if (scheduled) return { day: scheduled, reason: "semana" };
  const hasSchedule = workout.days.some((d) => (d.weekdays ?? []).length > 0);
  if (hasSchedule) return { day: null, reason: "descanso" };
  const last = logs.filter((l) => l.workoutId === workout.id && l.performedOn !== todayKey())[0];
  const idx = last ? workout.days.findIndex((d) => d.name === last.dayName) : -1;
  return { day: workout.days[(idx + 1) % workout.days.length] ?? null, reason: "rodizio" };
}

// Última carga anotada para cada exercício (qualquer treino anterior).
export function lastLoads(logs: AppLog[]) {
  const map = new Map<string, string>();
  for (const log of logs) {
    if (log.performedOn === todayKey()) continue;
    for (const e of log.exercises) if (e.load && !map.has(e.name)) map.set(e.name, e.load);
  }
  return map;
}

// "60s", "90 s", "1min", "1:30", "2 min" → segundos.
export function restSeconds(rest?: string) {
  if (!rest) return null;
  const t = rest.toLowerCase().replace(/\s/g, "");
  const mmss = /^(\d+):(\d{2})$/.exec(t);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const min = /^(\d+(?:[.,]\d+)?)m(in)?/.exec(t);
  if (min) return Math.round(Number(min[1].replace(",", ".")) * 60);
  const sec = /^(\d+)s?$/.exec(t);
  if (sec) return Number(sec[1]);
  return null;
}
