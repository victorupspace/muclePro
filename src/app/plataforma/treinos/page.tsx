"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Download, Dumbbell, Eye, Plus, UserRoundX } from "lucide-react";
import { DataTable, TableButton, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput, SelectFilter } from "@/components/admin/Filters";
import { KpiCard } from "@/components/plataforma/KpiCard";
import { AnimatedNumber, PageIntro, useRevealRows } from "@/components/plataforma/motion";
import { WorkoutEditorModal } from "@/components/plataforma/workouts/WorkoutEditorModal";
import { WorkoutStatusBadge } from "@/components/plataforma/workouts/WorkoutView";
import { cn } from "@/lib/cn";
import { formatDateValue, formatRelative, initials, toDateValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Student, WorkoutProgram } from "@/lib/plataforma/types";
import { cycleLabel, downloadWorkoutPdf, exerciseCount, workoutStatus } from "@/lib/plataforma/workouts";

type View = "fichas" | "sem_ficha";

const STATUS_OPTIONS = [
  { value: "uso", label: "Em uso e rascunhos" },
  { value: "rascunho", label: "Rascunhos (a revisar)" },
  { value: "vencendo", label: "Vencem em breve" },
  { value: "reavaliar", label: "Ciclo vencido" },
  { value: "arquivada", label: "Encerradas (histórico)" },
  { value: "all", label: "Todas" },
];

export default function TreinosPage() {
  const { workouts, students, staff, loading, studentById, planById, unitById } = usePlataformaStore();
  const { profile } = useAccountSession();
  const canEdit = Boolean(profile?.permissions.canCreateWorkouts);
  const companyName = profile?.companyName ?? "academia";

  const [view, setView] = useState<View>("fichas");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("uso");
  const [author, setAuthor] = useState(profile?.staffRole === "personal" && profile.staffId ? profile.staffId : "all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorStudent, setEditorStudent] = useState<string | undefined>();

  const activeStudents = useMemo(() => students.filter((s) => s.status === "ativo"), [students]);
  const withActiveWorkout = useMemo(() => new Set(workouts.filter((w) => w.active).map((w) => w.studentId)), [workouts]);
  const withoutWorkout = useMemo(
    () => activeStudents.filter((s) => !withActiveWorkout.has(s.id)).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [activeStudents, withActiveWorkout],
  );

  const stats = useMemo(() => {
    const month = toDateValue(new Date()).slice(0, 7);
    return {
      inUse: workouts.filter((w) => w.active).length,
      expiring: workouts.filter((w) => workoutStatus(w) === "vencendo").length,
      toReview: workouts.filter((w) => workoutStatus(w) === "reavaliar").length,
      createdThisMonth: workouts.filter((w) => w.createdAt.slice(0, 7) === month).length,
    };
  }, [workouts]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workouts
      .map((w) => ({ workout: w, student: studentById(w.studentId) }))
      .filter((r): r is { workout: WorkoutProgram; student: Student } => Boolean(r.student))
      .filter(({ workout, student }) => {
        const st = workoutStatus(workout);
        if (status === "uso" && st === "arquivada") return false;
        if (status === "rascunho" && st !== "rascunho") return false;
        if (status === "reavaliar" && st !== "reavaliar") return false;
        if (status === "vencendo" && st !== "vencendo") return false;
        if (status === "arquivada" && st !== "arquivada") return false;
        if (author !== "all" && (workout.authorStaffId ?? "dono") !== author) return false;
        if (!q) return true;
        return student.fullName.toLowerCase().includes(q) || workout.title.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const RANK = { rascunho: 0, reavaliar: 1, vencendo: 2, ativa: 3, arquivada: 4 } as const;
        const rank = (w: WorkoutProgram) => RANK[workoutStatus(w)];
        return rank(a.workout) - rank(b.workout) || a.student.fullName.localeCompare(b.student.fullName);
      });
  }, [workouts, studentById, search, status, author]);

  const missingRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withoutWorkout.filter((s) => !q || s.fullName.toLowerCase().includes(q));
  }, [withoutWorkout, search]);

  const tableRef = useRevealRows<HTMLDivElement>([view, rows.length, missingRows.length, status, author]);

  const authorOptions = useMemo(
    () => [
      { value: "all", label: "Todos" },
      ...staff.filter((s) => s.canCreateWorkouts || s.role === "gestao" || s.role === "personal").map((s) => ({ value: s.id, label: s.fullName })),
      { value: "dono", label: "Responsável da conta" },
    ],
    [staff],
  );

  function newWorkout(studentId?: string) {
    setEditorStudent(studentId);
    setEditorOpen(true);
  }

  const columns: Column<{ workout: WorkoutProgram; student: Student }>[] = [
    {
      key: "student",
      header: "Aluno",
      render: ({ student }) => (
        <Link href={`/plataforma/alunos/${student.id}`} className="group flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
            {initials(student.fullName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink-900 group-hover:underline">{student.fullName}</span>
            {student.status === "inativo" && <span className="text-[11px] text-ink-500">Aluno inativo</span>}
          </span>
        </Link>
      ),
    },
    {
      key: "workout",
      header: "Ficha",
      mobileLabel: "Ficha",
      render: ({ workout }) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{workout.title}</p>
          <p className="truncate text-[11px] text-ink-500">
            {workout.days.map((d) => d.name).join(" · ")} · {exerciseCount(workout)} exercícios{workout.goal ? ` · ${workout.goal}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "author",
      header: "Professor",
      mobileLabel: "Professor",
      render: ({ workout }) => <span className="text-[12.5px] text-ink-700">{workout.authorName ?? "—"}</span>,
    },
    {
      key: "review",
      header: "Vence em",
      mobileLabel: "Vence em",
      render: ({ workout }) => (
        <div>
          <p
            className={cn(
              "text-[12.5px] font-semibold",
              workoutStatus(workout) === "reavaliar" ? "text-danger-700" : workoutStatus(workout) === "vencendo" ? "text-warning-800" : "text-ink-900",
            )}
          >
            {workout.active ? formatDateValue(workout.reviewOn) : `Encerrada ${formatDateValue(workout.endedOn)}`}
          </p>
          <p className="text-[11px] text-ink-500">{workout.cycleMonths ? `Ciclo de ${cycleLabel(workout.cycleMonths)}` : `Desde ${formatDateValue(workout.startsOn)}`}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Situação",
      hideOnMobile: true,
      render: ({ workout }) => <WorkoutStatusBadge workout={workout} />,
    },
  ];

  const missingColumns: Column<Student>[] = [
    {
      key: "student",
      header: "Aluno",
      render: (student) => (
        <Link href={`/plataforma/alunos/${student.id}`} className="group flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
            {initials(student.fullName)}
          </span>
          <span className="truncate font-semibold text-ink-900 group-hover:underline">{student.fullName}</span>
        </Link>
      ),
    },
    {
      key: "plan",
      header: "Plano",
      mobileLabel: "Plano",
      render: (student) => <span className="text-[12.5px] text-ink-700">{planById(student.planId)?.name ?? "Sem plano"}</span>,
    },
    {
      key: "unit",
      header: "Unidade",
      mobileLabel: "Unidade",
      render: (student) => <span className="text-[12.5px] text-ink-700">{unitById(student.unitId)?.name ?? "—"}</span>,
    },
    {
      key: "since",
      header: "Aluno desde",
      mobileLabel: "Desde",
      render: (student) => <span className="text-[12px] text-ink-500">{formatRelative(student.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Treinos"
        title="Fichas de treino"
        description="Quem está com ficha em uso, quem precisa reavaliar e quem ainda está treinando sem ficha."
        actions={
          canEdit ? (
            <button
              type="button"
              onClick={() => newWorkout()}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover md:w-auto"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Nova ficha
            </button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Fichas em uso"
          value={<AnimatedNumber value={stats.inUse} />}
          hint={`${stats.createdThisMonth} montada${stats.createdThisMonth === 1 ? "" : "s"} neste mês`}
          icon={<Dumbbell className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.05}
        />
        <KpiCard
          label="Vencem em 14 dias"
          value={<AnimatedNumber value={stats.expiring} />}
          hint="Hora de reavaliar e montar o próximo ciclo"
          highlight={stats.expiring > 0}
          icon={<CalendarClock className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.1}
        />
        <KpiCard
          label="Ciclos vencidos"
          value={<AnimatedNumber value={stats.toReview} />}
          hint="Aluno treinando com ficha antiga"
          tone={stats.toReview > 0 ? "danger" : undefined}
          icon={<ClipboardList className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.15}
        />
        <KpiCard
          label="Ativos sem ficha"
          value={<AnimatedNumber value={withoutWorkout.length} />}
          hint={`De ${activeStudents.length} alunos ativos`}
          tone={withoutWorkout.length > 0 ? "danger" : undefined}
          icon={<UserRoundX className="h-3.5 w-3.5" strokeWidth={2.4} />}
          delay={0.2}
        />
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex shrink-0 rounded-btn border border-ink-200 bg-white p-0.5">
          {(
            [
              ["fichas", "Fichas"],
              ["sem_ficha", `Sem ficha (${withoutWorkout.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={cn(
                "h-9 rounded-[5px] px-3 text-[12.5px] font-semibold transition-colors",
                view === value ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} className="w-full lg:max-w-[340px]" placeholder={view === "fichas" ? "Buscar por aluno ou ficha" : "Buscar aluno"} />
        {view === "fichas" && (
          <div className="flex flex-wrap items-center gap-2">
            <SelectFilter label="Situação" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <SelectFilter label="Professor" value={author} onChange={setAuthor} options={authorOptions} />
          </div>
        )}
      </div>

      <div ref={tableRef}>
        {view === "fichas" ? (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={({ workout }) => workout.id}
            actions={({ workout, student }) => (
              <>
                <TableButton onClick={() => void downloadWorkoutPdf(workout, student, companyName)}>
                  <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
                  PDF
                </TableButton>
                <TableButton href={`/plataforma/alunos/${student.id}`}>
                  <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Abrir
                </TableButton>
              </>
            )}
            emptyState={
              <EmptyState
                title={loading ? "Carregando fichas…" : workouts.length === 0 ? "Nenhuma ficha montada ainda" : "Nenhuma ficha com esses filtros"}
                description={
                  workouts.length === 0 && canEdit
                    ? "Comece pelos alunos sem ficha: dá para montar a partir de um modelo pronto e mandar pelo WhatsApp."
                    : "Ajuste os filtros para ver outras fichas."
                }
              />
            }
          />
        ) : (
          <DataTable
            rows={missingRows}
            columns={missingColumns}
            rowKey={(s) => s.id}
            actions={
              canEdit
                ? (student) => (
                    <TableButton tone="primary" onClick={() => newWorkout(student.id)}>
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Montar ficha
                    </TableButton>
                  )
                : undefined
            }
            emptyState={<EmptyState title="Todos os alunos ativos têm ficha" description="Quando alguém novo se matricular, aparece aqui até ganhar a primeira ficha." />}
          />
        )}
      </div>

      <WorkoutEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} studentId={editorStudent} />
    </div>
  );
}
