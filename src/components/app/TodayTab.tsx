"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Check, CheckCircle2, ClipboardList, Cloud, CloudOff, Coffee, Loader2, Timer, X } from "lucide-react";
import { prefersReducedMotion } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { lastLoads, pickTodayDay, restSeconds, saveLog, todayKey, type AppHome, type AppLog } from "@/lib/app/student-app";
import { WEEKDAY_ORDER, WEEKDAY_SHORT, toDateValue, weekdaysLabel } from "@/lib/plataforma/format";
import type { WorkoutDay, WorkoutLogExercise } from "@/lib/plataforma/types";
import { CardioList } from "@/components/plataforma/workouts/CardioList";

type Props = { home: AppHome; onSaved: (log: AppLog) => void; onOpenFicha: () => void };
type SaveState = "idle" | "saving" | "saved" | "error";

export function TodayTab({ home, onSaved, onOpenFicha }: Props) {
  const workout = home.workout;
  const pick = useMemo(() => (workout ? pickTodayDay(workout, home.logs) : null), [workout, home.logs]);
  const [dayName, setDayName] = useState<string | null>(pick?.day?.name ?? null);

  if (!workout) {
    return (
      <Card className="mt-0 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-ink-300" strokeWidth={1.8} />
        <p className="mt-3 text-[16px] font-bold text-ink-900">Sua ficha ainda não chegou</p>
        <p className="mt-1 text-[14px] leading-[1.55] text-ink-500">
          Assim que o seu professor liberar o treino, ele aparece aqui. Até lá, fale com ele na academia.
        </p>
      </Card>
    );
  }

  const day = workout.days.find((d) => d.name === dayName) ?? null;

  return (
    <div className="space-y-3">
      <WeekStrip home={home} />
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Treinos da ficha">
        {workout.days.map((d) => {
          const active = d.name === dayName;
          const isToday = pick?.day?.name === d.name;
          return (
            <button
              key={d.name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDayName(d.name)}
              className={cn(
                "flex h-14 min-w-[74px] shrink-0 flex-col items-center justify-center rounded-card border px-3 transition-colors",
                active ? "border-brand bg-brand text-white" : "border-ink-200 bg-white text-ink-800",
              )}
            >
              <span className="text-[15px] font-bold leading-none">Treino {d.name}</span>
              <span className={cn("mt-1 text-[10.5px] font-semibold", active ? "text-white/75" : "text-ink-500")}>
                {isToday ? "Hoje" : weekdaysLabel(d.weekdays) || " "}
              </span>
            </button>
          );
        })}
      </div>

      {day ? (
        <DayWorkout key={`${workout.id}-${day.name}`} home={home} day={day} onSaved={onSaved} onOpenFicha={onOpenFicha} />
      ) : (
        <Card className="text-center">
          <Coffee className="mx-auto h-8 w-8 text-brand-light" strokeWidth={1.8} />
          <p className="mt-3 text-[16px] font-bold text-ink-900">Hoje é dia de descanso</p>
          <p className="mt-1 text-[14px] leading-[1.55] text-ink-500">
            Pela sua ficha, não tem treino hoje. Quer treinar mesmo assim? Escolha um treino acima.
          </p>
        </Card>
      )}
    </div>
  );
}

function DayWorkout({ home, day, onSaved, onOpenFicha }: { home: AppHome; day: WorkoutDay; onSaved: (log: AppLog) => void; onOpenFicha: () => void }) {
  const workout = home.workout!;
  const todayLog = home.logs.find((l) => l.workoutId === workout.id && l.dayName === day.name && l.performedOn === todayKey());
  const previous = useMemo(() => lastLoads(home.logs), [home.logs]);

  const [items, setItems] = useState<WorkoutLogExercise[]>(() =>
    day.exercises.map((e) => {
      const saved = todayLog?.exercises.find((x) => x.name === e.name);
      return { name: e.name, done: saved?.done ?? false, load: saved?.load ?? "" };
    }),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [finished, setFinished] = useState(Boolean(todayLog?.finishedAt));
  const [finishOpen, setFinishOpen] = useState(false);
  const [timer, setTimer] = useState<{ total: number; left: number; label: string } | null>(null);
  const dirty = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      if (!listRef.current || prefersReducedMotion()) return;
      gsap.from(listRef.current.children, { y: 10, autoAlpha: 0, duration: 0.4, stagger: 0.05, ease: "power3.out", clearProps: "all" });
    },
    { scope: listRef },
  );

  // Salva o andamento sozinho, um instante depois da última mudança.
  useEffect(() => {
    if (!dirty.current) return;
    setSaveState("saving");
    const t = window.setTimeout(() => {
      saveLog({ workoutId: workout.id, dayName: day.name, exercises: items })
        .then((log) => {
          onSaved(log);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 900);
    return () => window.clearTimeout(t);
  }, [items, workout.id, day.name, onSaved]);

  // Cronômetro de descanso.
  useEffect(() => {
    if (!timer || timer.left <= 0) return;
    const t = window.setTimeout(() => setTimer((prev) => (prev ? { ...prev, left: prev.left - 1 } : prev)), 1000);
    return () => window.clearTimeout(t);
  }, [timer]);
  useEffect(() => {
    if (timer && timer.left <= 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    }
  }, [timer]);

  function update(index: number, patch: Partial<WorkoutLogExercise>) {
    dirty.current = true;
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length ? doneCount / items.length : 0;

  return (
    <>
      <Card className="p-0">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[18px] font-bold tracking-[-0.01em] text-ink-900">Treino {day.name}</p>
              {day.focus && <p className="text-[13px] text-ink-500">{day.focus}</p>}
            </div>
            <SaveBadge state={saveState} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
              <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.35, ease: EASE }} />
            </div>
            <span className="text-[12px] font-bold tabular-nums text-ink-700">
              {doneCount}/{items.length}
            </span>
          </div>
        </div>
        {finished && (
          <p className="mx-4 mb-3 flex items-center gap-2 rounded-btn bg-success-50 px-3 py-2 text-[13px] font-semibold text-success-700">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
            Treino concluído hoje. Ainda dá para ajustar as cargas.
          </p>
        )}
      </Card>

      <ol ref={listRef} className="space-y-2.5">
        {day.exercises.map((ex, i) => {
          const it = items[i];
          const rest = restSeconds(ex.rest);
          const prev = previous.get(ex.name);
          return (
            <li key={`${ex.name}-${i}`} className={cn("rounded-card border bg-white p-3.5 transition-colors", it.done ? "border-success-200 bg-success-50/40" : "border-ink-200")}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => update(i, { done: !it.done })}
                  aria-pressed={it.done}
                  aria-label={it.done ? `Desmarcar ${ex.name}` : `Marcar ${ex.name} como feito`}
                  className={cn(
                    "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    it.done ? "border-success-500 bg-success-500 text-white" : "border-ink-300 text-transparent",
                  )}
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[15.5px] font-bold leading-snug text-ink-900", it.done && "text-ink-500 line-through decoration-ink-300")}>{ex.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink-600">
                    <span className="font-semibold text-ink-900">{ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ex.sets || ex.reps || ""}</span>
                    {ex.load && ` · sugerido ${ex.load}`}
                    {ex.rest && ` · descanso ${ex.rest}`}
                  </p>
                  {ex.notes && <p className="mt-1 text-[12.5px] leading-[1.45] text-ink-500">{ex.notes}</p>}
                  <div className="mt-2.5 flex items-center gap-2">
                    <label className="relative flex-1">
                      <span className="sr-only">Carga usada em {ex.name}</span>
                      <input
                        value={it.load ?? ""}
                        onChange={(e) => update(i, { load: e.target.value.slice(0, 20) })}
                        inputMode="text"
                        placeholder={prev ? `Última: ${prev}` : ex.load ? `Carga (sugerido ${ex.load})` : "Carga usada"}
                        className="h-11 w-full rounded-btn border border-ink-200 bg-white px-3 text-[15px] font-semibold text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                      />
                    </label>
                    {rest && (
                      <button
                        type="button"
                        onClick={() => setTimer({ total: rest, left: rest, label: ex.name })}
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-700 active:bg-ink-50"
                      >
                        <Timer className="h-4 w-4" strokeWidth={2.2} />
                        {ex.rest}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {(day.cardio?.length ?? 0) > 0 && (
        <div className="rounded-card border border-ink-200 bg-white">
          <CardioList items={day.cardio} size="lg" bare />
        </div>
      )}

      <button
        type="button"
        onClick={() => setFinishOpen(true)}
        className="h-14 w-full rounded-card bg-brand text-[16px] font-bold text-white shadow-[0_12px_30px_-14px_rgba(1,33,92,0.6)] active:bg-brand-hover"
      >
        {finished ? "Enviar outro comentário" : doneCount === items.length ? "Concluir treino" : `Concluir treino (${doneCount}/${items.length})`}
      </button>
      <button type="button" onClick={onOpenFicha} className="w-full py-2 text-center text-[13px] font-semibold text-ink-500">
        Ver a ficha completa
      </button>

      <AnimatePresence>
        {timer && <RestTimer timer={timer} onClose={() => setTimer(null)} onAdd={() => setTimer((t) => (t ? { ...t, left: t.left + 15, total: t.total + 15 } : t))} />}
      </AnimatePresence>
      <AnimatePresence>
        {finishOpen && (
          <FinishSheet
            already={finished}
            onClose={() => setFinishOpen(false)}
            onConfirm={async (comment) => {
              const log = await saveLog({ workoutId: workout.id, dayName: day.name, exercises: items, comment, finish: true });
              onSaved(log);
              setFinished(true);
              setFinishOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
        state === "error" ? "bg-danger-50 text-danger-700" : "bg-ink-100 text-ink-600",
      )}
    >
      {state === "saving" ? (
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.6} />
      ) : state === "error" ? (
        <CloudOff className="h-3 w-3" strokeWidth={2.4} />
      ) : (
        <Cloud className="h-3 w-3" strokeWidth={2.4} />
      )}
      {state === "saving" ? "Salvando" : state === "error" ? "Sem conexão" : "Salvo"}
    </span>
  );
}

function RestTimer({ timer, onClose, onAdd }: { timer: { total: number; left: number; label: string }; onClose: () => void; onAdd: () => void }) {
  const done = timer.left <= 0;
  const mm = Math.floor(Math.max(0, timer.left) / 60);
  const ss = String(Math.max(0, timer.left) % 60).padStart(2, "0");
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      role="timer"
      aria-live="polite"
      className={cn(
        "fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[496px] rounded-card p-4 text-white shadow-[0_20px_40px_-16px_rgba(0,0,0,0.5)]",
        done ? "bg-success-600" : "bg-ink-900",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-white/70">{done ? "Descanso terminou" : `Descanso · ${timer.label}`}</p>
          <p className="text-[34px] font-bold leading-none tabular-nums">{done ? "Bora!" : `${mm}:${ss}`}</p>
        </div>
        <div className="flex items-center gap-2">
          {!done && (
            <button type="button" onClick={onAdd} className="h-11 rounded-btn bg-white/15 px-3 text-[14px] font-bold">
              +15s
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Fechar cronômetro" className="inline-flex h-11 w-11 items-center justify-center rounded-btn bg-white/15">
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
      </div>
      {!done && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${(timer.left / timer.total) * 100}%` }} />
        </div>
      )}
    </motion.div>
  );
}

function FinishSheet({ already, onClose, onConfirm }: { already: boolean; onClose: () => void; onConfirm: (comment: string) => Promise<void> }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-ink-900/45" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.3, ease: EASE }}
        role="dialog"
        aria-modal="true"
        aria-label="Concluir treino"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[520px] rounded-t-[20px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5"
      >
        <p className="text-[18px] font-bold text-ink-900">{already ? "Mandar um recado ao professor" : "Como foi o treino?"}</p>
        <p className="mt-1 text-[13.5px] leading-[1.5] text-ink-500">
          Sentiu dor, achou leve ou pesado demais? Escreva aqui: o recado chega na agenda do seu professor. Pode deixar em branco.
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="Ex.: senti o joelho no agachamento"
          className="mt-3 w-full rounded-btn border border-ink-200 px-3 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
        {error && <p className="mt-2 text-[13px] font-semibold text-danger-600">{error}</p>}
        <button
          type="button"
          disabled={busy || (already && !comment.trim())}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onConfirm(comment);
            } catch {
              setError("Não foi possível salvar. Verifique a internet e tente de novo.");
              setBusy(false);
            }
          }}
          className="mt-4 h-14 w-full rounded-card bg-brand text-[16px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Salvando..." : already ? "Enviar recado" : "Concluir treino"}
        </button>
        <button type="button" onClick={onClose} className="mt-2 h-11 w-full text-[14px] font-semibold text-ink-500">
          Voltar
        </button>
      </motion.div>
    </>
  );
}

// Semana atual: dias com treino feito.
function WeekStrip({ home }: { home: AppHome }) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const doneDays = new Set(home.logs.filter((l) => l.finishedAt || l.exercises.some((e) => e.done)).map((l) => l.performedOn));
  return (
    <Card className="mt-0 flex items-center justify-between px-3 py-3">
      {WEEKDAY_ORDER.map((wd, i) => {
        const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const key = toDateValue(date);
        const isToday = key === todayKey();
        const done = doneDays.has(key);
        return (
          <div key={wd} className="flex flex-col items-center gap-1">
            <span className={cn("text-[10.5px] font-semibold", isToday ? "text-brand" : "text-ink-400")}>{WEEKDAY_SHORT[wd]}</span>
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold",
                done ? "bg-success-500 text-white" : isToday ? "bg-brand/10 text-brand ring-2 ring-brand" : "bg-ink-100 text-ink-400",
              )}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : date.getDate()}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-card border border-ink-200 bg-white p-4", className)}>{children}</section>;
}
