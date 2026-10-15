"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "../Toast";
import { WorkoutEditorModal } from "./WorkoutEditorModal";
import { WorkoutView } from "./WorkoutView";
import { EASE } from "@/lib/motion";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Student, WorkoutProgram } from "@/lib/plataforma/types";

// Aba "Treinos" da ficha do aluno.
export function StudentWorkoutsTab({ student }: { student: Student }) {
  const { workoutsFor, updateWorkout, removeWorkout } = usePlataformaStore();
  const { profile } = useAccountSession();
  const { push } = useToast();
  const canEdit = Boolean(profile?.permissions.canCreateWorkouts);
  const companyName = profile?.companyName ?? "academia";

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutProgram | undefined>();
  const [copyFrom, setCopyFrom] = useState<WorkoutProgram | undefined>();
  const [deleting, setDeleting] = useState<WorkoutProgram | null>(null);

  const list = workoutsFor(student.id);
  const active = list.filter((w) => w.active);
  const archived = list.filter((w) => !w.active);

  function canDeleteWorkout(w: WorkoutProgram) {
    return Boolean(profile?.permissions.canDeleteRecords || (profile?.staffId && w.authorStaffId === profile.staffId));
  }

  function openEditor(opts: { workout?: WorkoutProgram; copy?: WorkoutProgram } = {}) {
    setEditing(opts.workout);
    setCopyFrom(opts.copy);
    setEditorOpen(true);
  }

  async function toggle(w: WorkoutProgram) {
    const saved = await updateWorkout(w.id, { active: !w.active });
    if (saved) push({ tone: "info", title: saved.active ? "Ficha reativada" : "Ficha arquivada" });
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
    />
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-ink-500">
          {active.length > 0
            ? "Ficha em uso. Envie pelo WhatsApp ou em PDF para o aluno levar no celular."
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
          {active.map((w) => render(w, true))}
          {archived.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Fichas anteriores</p>
              {archived.map((w) => render(w, false))}
            </div>
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
