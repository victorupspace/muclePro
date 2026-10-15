"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  ArrowRight,
  CalendarClock,
  Check,
  ListTodo,
  Plus,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { AddTaskModal } from "@/components/plataforma/AddTaskModal";
import { ChurnRadar } from "@/components/plataforma/ChurnRadar";
import { ForecastCard } from "@/components/plataforma/ForecastCard";
import { KpiCard } from "@/components/plataforma/KpiCard";
import { ModuleCard, ModuleEmpty } from "@/components/plataforma/ModuleCard";
import { RecommendedActions } from "@/components/plataforma/RecommendedActions";
import { StudentFormModal } from "@/components/plataforma/StudentFormModal";
import { AnimatedNumber, useRevealList } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { TASK_PRIORITY_LABEL, firstName, formatCurrency, formatDateTime } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Task } from "@/lib/plataforma/types";

export default function PlataformaDashboardPage() {
  const { profile } = useAccountSession();
  const { error, loading, metrics, recommendedActions, tasks, students, toggleTask } = usePlataformaStore();
  const [addStudent, setAddStudent] = useState(false);
  const [addTask, setAddTask] = useState(false);
  const perms = profile?.permissions;
  const seesMoney = Boolean(perms?.isManager || perms?.canSendPaymentLinks);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const openTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done)
        .sort((a, b) => {
          const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        })
        .slice(0, 5),
    [tasks],
  );

  const summary = useMemo(() => {
    if (loading) return "Carregando os números do dia…";
    const parts: string[] = [];
    if (metrics.delinquentStudents > 0) {
      parts.push(
        `${metrics.delinquentStudents} aluno${metrics.delinquentStudents === 1 ? "" : "s"} em atraso somam ${formatCurrency(metrics.delinquentAmount)}`,
      );
    }
    if (metrics.dueSoonStudents > 0) {
      parts.push(`${metrics.dueSoonStudents} vence${metrics.dueSoonStudents === 1 ? "" : "m"} nos próximos 7 dias`);
    }
    if (parts.length === 0) return "Nenhuma cobrança atrasada. Bom momento para olhar as tarefas e os cadastros.";
    return `${parts.join(" e ")}. Comece pelas ações recomendadas.`;
  }, [loading, metrics]);

  return (
    <div className="space-y-6 md:space-y-7">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          {profile?.companyName ?? "Dashboard"}
        </p>
        <h1 className="mt-1 text-[22px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[26px]">
          {greeting}, {profile ? firstName(profile.fullName) : ""}.
        </h1>
        <p className="mt-1 max-w-[640px] text-[13px] leading-[1.55] text-ink-500">{summary}</p>
      </motion.header>

      {error && (
        <div className="rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[13px] font-medium text-danger-700">
          Não foi possível carregar seus dados: {error}
        </div>
      )}

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard
            label="Alunos ativos"
            value={<AnimatedNumber value={metrics.activeStudents} />}
            hint={`${students.length} cadastrados no total`}
            icon={<Users className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/alunos"
            action={
              perms?.canRegisterStudents
                ? {
                    label: "Cadastrar aluno",
                    onClick: () => setAddStudent(true),
                    icon: <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />,
                  }
                : undefined
            }
            delay={0.05}
          />
          <KpiCard
            label="Inadimplentes"
            value={<AnimatedNumber value={metrics.delinquentStudents} />}
            hint={
              metrics.delinquentStudents > 0
                ? `${formatCurrency(metrics.delinquentAmount)} em atraso`
                : "Ninguém em atraso"
            }
            tone={metrics.delinquentStudents > 0 ? "danger" : undefined}
            icon={<AlertOctagon className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/alunos?situacao=inadimplente"
            delay={0.1}
          />
          <KpiCard
            label="Vencem em 7 dias"
            value={<AnimatedNumber value={metrics.dueSoonStudents} />}
            hint="Lembrete evita o atraso"
            icon={<CalendarClock className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/alunos?situacao=a_vencer"
            delay={0.15}
          />
          <KpiCard
            label="Funcionários"
            value={<AnimatedNumber value={metrics.activeStaff} />}
            hint="Ativos na equipe"
            icon={<UserCog className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/equipe"
            delay={0.2}
          />
          <KpiCard
            label="Tarefas em aberto"
            value={<AnimatedNumber value={metrics.openTasks} />}
            hint={metrics.overdueTasks > 0 ? `${metrics.overdueTasks} atrasada${metrics.overdueTasks === 1 ? "" : "s"}` : "Nenhuma atrasada"}
            highlight={metrics.overdueTasks > 0}
            icon={<ListTodo className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/tarefas"
            action={
              perms?.readOnly
                ? undefined
                : {
                    label: "Nova tarefa",
                    onClick: () => setAddTask(true),
                    icon: <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />,
                  }
            }
            delay={0.25}
          />
          {seesMoney && (
          <KpiCard
            label="Receita recorrente"
            value={<AnimatedNumber value={metrics.monthlyRecurring} format={formatCurrency} />}
            hint="Por mês, com os planos ativos"
            highlight
            icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />}
            href="/plataforma/planos"
            delay={0.3}
          />
          )}
        </div>
      </section>

      <section className={cn("grid gap-4", seesMoney && "xl:grid-cols-[1.4fr_1fr]")}>
        {seesMoney && <ForecastCard canEditGoals={Boolean(perms?.isManager && !perms.readOnly)} />}
        <ChurnRadar />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RecommendedActions actions={recommendedActions} loading={loading} limit={5} />

        <ModuleCard
          title="Próximas tarefas"
          hint={metrics.openTasks > 0 ? `${metrics.openTasks} em aberto` : "Nada pendente"}
          icon={<ListTodo className="h-3.5 w-3.5" strokeWidth={2.4} />}
          count={metrics.openTasks}
          countTone={metrics.overdueTasks > 0 ? "danger" : "default"}
          onSeeAll={metrics.openTasks > 5 ? () => (window.location.href = "/plataforma/tarefas") : undefined}
        >
          <TaskList tasks={openTasks} onToggle={toggleTask} onCreate={() => setAddTask(true)} />
        </ModuleCard>
      </section>

      <StudentFormModal open={addStudent} onClose={() => setAddStudent(false)} />
      <AddTaskModal open={addTask} onClose={() => setAddTask(false)} />
    </div>
  );
}

function TaskList({
  tasks,
  onToggle,
  onCreate,
}: {
  tasks: Task[];
  onToggle: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  const { students } = usePlataformaStore();
  const listRef = useRevealList<HTMLUListElement>([tasks.length]);

  if (tasks.length === 0) {
    return (
      <ModuleEmpty>
        Nenhuma tarefa em aberto.
        <button
          type="button"
          onClick={onCreate}
          className="mt-2 inline-flex h-8 items-center gap-1 rounded-btn bg-ink-900 px-3 text-[11.5px] font-semibold text-white hover:bg-ink-800"
        >
          <Plus className="h-3 w-3" strokeWidth={2.6} />
          Criar tarefa
        </button>
      </ModuleEmpty>
    );
  }

  return (
    <ul ref={listRef} className="space-y-1.5">
      {tasks.map((task) => {
        const student = task.studentId ? students.find((s) => s.id === task.studentId) : undefined;
        const overdue = task.dueAt ? new Date(task.dueAt).getTime() < Date.now() : false;
        return (
          <li
            key={task.id}
            className="flex items-start gap-2.5 rounded-btn border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-200"
          >
            <button
              type="button"
              onClick={() => void onToggle(task.id)}
              aria-label="Concluir tarefa"
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-300 text-transparent transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-ink-900">{task.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-ink-500">
                {task.dueAt && (
                  <span className={cn("font-semibold", overdue ? "text-danger-700" : "text-ink-600")}>
                    {overdue ? "Atrasada · " : ""}
                    {formatDateTime(task.dueAt)}
                  </span>
                )}
                {student && (
                  <Link href={`/plataforma/alunos/${student.id}`} className="truncate hover:text-ink-900">
                    {student.fullName}
                  </Link>
                )}
                <span className="uppercase tracking-[0.08em]">{TASK_PRIORITY_LABEL[task.priority]}</span>
              </p>
            </div>
          </li>
        );
      })}
      <li className="pt-1">
        <Link
          href="/plataforma/tarefas"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-600 transition-colors hover:text-ink-900"
        >
          Ver todas as tarefas
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </li>
    </ul>
  );
}
