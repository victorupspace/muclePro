"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Dumbbell, ListTodo, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SelectFilter } from "@/components/admin/Filters";
import { AddTaskModal } from "@/components/plataforma/AddTaskModal";
import { PageIntro, useRevealList } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { TASK_PRIORITY_LABEL, formatDateTime } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Task, TaskPriority } from "@/lib/plataforma/types";

const VIEW_OPTIONS = [
  { value: "open", label: "Em aberto" },
  { value: "done", label: "Concluídas" },
  { value: "all", label: "Todas" },
];

const PRIORITY_TONE: Record<TaskPriority, string> = {
  baixa: "bg-ink-100 text-ink-600 ring-ink-200",
  media: "bg-info-50 text-info-700 ring-info-200",
  alta: "bg-danger-50 text-danger-700 ring-danger-200",
};

type Group = { key: string; label: string; tasks: Task[]; tone?: "danger" | "brand" };

export default function TarefasPage() {
  const { tasks, students, staff, toggleTask, removeTask, loading } = usePlataformaStore();
  const { profile } = useAccountSession();
  // "mine" = tarefas do próprio usuário (do dono: as sem responsável).
  const myStaffId = profile?.staffId ?? null;
  const [view, setView] = useState("open");
  const [owner, setOwner] = useState(profile?.permissions.isManager ? "all" : "mine");
  const [studentFilter, setStudentFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const groups = useMemo<Group[]>(() => {
    const filtered = tasks.filter((t) => {
      if (view === "open" && t.done) return false;
      if (view === "done" && !t.done) return false;
      if (studentFilter !== "all" && (t.studentId ?? "none") !== studentFilter) return false;
      if (owner === "mine" && (t.staffId ?? null) !== myStaffId) return false;
      if (owner !== "all" && owner !== "mine" && (t.staffId ?? "none") !== owner) return false;
      return true;
    });

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const byDue = (a: Task, b: Task) => {
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    };

    const open = filtered.filter((t) => !t.done).sort(byDue);
    const done = filtered.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

    const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now.getTime());
    const today = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() >= now.getTime() && new Date(t.dueAt).getTime() < endOfToday);
    const upcoming = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() >= endOfToday);
    const noDate = open.filter((t) => !t.dueAt);

    return [
      { key: "overdue", label: "Atrasadas", tasks: overdue, tone: "danger" as const },
      { key: "today", label: "Hoje", tasks: today, tone: "brand" as const },
      { key: "upcoming", label: "Próximas", tasks: upcoming },
      { key: "nodate", label: "Sem prazo", tasks: noDate },
      { key: "done", label: "Concluídas", tasks: done },
    ].filter((g) => g.tasks.length > 0);
  }, [tasks, view, studentFilter, owner, myStaffId]);

  const total = groups.reduce((n, g) => n + g.tasks.length, 0);
  const openCount = tasks.filter((t) => !t.done).length;

  const ownerOptions = useMemo(
    () => [
      { value: "all", label: "Toda a equipe" },
      { value: "mine", label: "Minhas tarefas" },
      ...staff.filter((s) => s.active && s.id !== myStaffId).map((s) => ({ value: s.id, label: s.fullName })),
      ...(profile?.isOwner ? [] : [{ value: "none", label: "Sem responsável" }]),
    ],
    [staff, myStaffId, profile?.isOwner],
  );

  const studentOptions = useMemo(
    () => [
      { value: "all", label: "Todos os alunos" },
      ...students.map((s) => ({ value: s.id, label: s.fullName })),
      { value: "none", label: "Sem aluno" },
    ],
    [students],
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Tarefas"
        title="O que precisa acontecer"
        description={
          openCount > 0
            ? `${openCount} tarefa${openCount === 1 ? "" : "s"} em aberto. Comece pelas atrasadas.`
            : "Nenhuma tarefa em aberto. Crie uma para não depender da memória."
        }
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Nova tarefa
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SelectFilter label="Mostrar" value={view} onChange={setView} options={VIEW_OPTIONS} />
        <SelectFilter label="Responsável" value={owner} onChange={setOwner} options={ownerOptions} />
        <SelectFilter label="Aluno" value={studentFilter} onChange={setStudentFilter} options={studentOptions} />
      </div>

      {total === 0 ? (
        loading ? null : (
          <EmptyState
            icon={<ListTodo className="h-5 w-5" strokeWidth={2.2} />}
            title={view === "done" ? "Nenhuma tarefa concluída" : "Nenhuma tarefa por aqui"}
            description={view === "done" ? "As concluídas aparecem aqui." : "Crie a primeira tarefa e defina um prazo."}
          />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <TaskGroup
              key={group.key}
              group={group}
              studentName={(id) => students.find((s) => s.id === id)?.fullName}
              staffName={(id) => staff.find((s) => s.id === id)?.fullName}
              onToggle={(id) => void toggleTask(id)}
              onRemove={(id) => void removeTask(id)}
            />
          ))}
        </div>
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function TaskGroup({
  group,
  studentName,
  staffName,
  onToggle,
  onRemove,
}: {
  group: Group;
  studentName: (id: string) => string | undefined;
  staffName: (id: string) => string | undefined;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const listRef = useRevealList<HTMLUListElement>([group.tasks.length]);
  return (
    <section>
      <header className="mb-2 flex items-center gap-2">
        <h2
          className={cn(
            "text-[10.5px] font-bold uppercase tracking-[0.14em]",
            group.tone === "danger" ? "text-danger-700" : group.tone === "brand" ? "text-brand" : "text-ink-500",
          )}
        >
          {group.label}
        </h2>
        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink-100 px-1 text-[10px] font-bold text-ink-600">
          {group.tasks.length}
        </span>
      </header>
      <ul ref={listRef} className="space-y-2">
        {group.tasks.map((task) => {
          const student = task.studentId ? studentName(task.studentId) : undefined;
          const owner = task.staffId ? staffName(task.staffId) : undefined;
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-start gap-3 rounded-card border bg-white px-4 py-3.5 transition-colors",
                task.done ? "border-ink-100 opacity-70" : "border-ink-200 hover:border-ink-400",
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(task.id)}
                aria-label={task.done ? "Reabrir tarefa" : "Concluir tarefa"}
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  task.done
                    ? "border-success-500 bg-success-500 text-white"
                    : "border-ink-300 text-transparent hover:border-brand hover:bg-brand/10 hover:text-brand",
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={cn("text-[13.5px] font-semibold text-ink-900", task.done && "line-through")}>{task.title}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                      PRIORITY_TONE[task.priority],
                    )}
                  >
                    {TASK_PRIORITY_LABEL[task.priority]}
                  </span>
                </div>
                {task.description && <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-600">{task.description}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-500">
                  {task.dueAt && (
                    <span className={cn("font-semibold", group.tone === "danger" ? "text-danger-700" : "text-ink-600")}>
                      {formatDateTime(task.dueAt)}
                    </span>
                  )}
                  {student && task.studentId && (
                    <Link href={`/plataforma/alunos/${task.studentId}`} className="hover:text-ink-900 hover:underline">
                      {student}
                    </Link>
                  )}
                  {owner && <span>Resp.: {owner}</span>}
                  {task.workoutId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/[0.06] px-1.5 py-0.5 font-semibold text-brand">
                      <Dumbbell className="h-3 w-3" strokeWidth={2.4} />
                      Ciclo de treino
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(task.id)}
                aria-label="Excluir tarefa"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
