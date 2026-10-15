"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "./DatePickerField";
import { Field, inputClass, ModalFooter, selectClass, textareaClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { usePlataformaStore } from "@/lib/plataforma/store";
import { TASK_PRIORITY_LABEL } from "@/lib/plataforma/format";
import type { TaskPriority } from "@/lib/plataforma/types";

const PRIORITIES = (Object.keys(TASK_PRIORITY_LABEL) as TaskPriority[]).map((value) => ({
  value,
  label: TASK_PRIORITY_LABEL[value],
}));

export function AddTaskModal({
  open,
  onClose,
  defaultStudentId,
}: {
  open: boolean;
  onClose: () => void;
  defaultStudentId?: string;
}) {
  const { addTask, students, staff } = usePlataformaStore();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [studentId, setStudentId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setDueAt("");
    setStudentId(defaultStudentId ?? "");
    setStaffId("");
    setPriority("media");
  }, [open, defaultStudentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const task = await addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : undefined,
      studentId: studentId || undefined,
      staffId: staffId || undefined,
      priority,
    });
    setSubmitting(false);
    if (task) {
      push({ tone: "success", title: "Tarefa criada", description: task.title });
      onClose();
    }
  }

  const activeStaff = staff.filter((s) => s.active);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      description="O que precisa acontecer e até quando. Tarefas abertas aparecem no dashboard."
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="add-task-form"
          submitting={submitting}
          submitLabel="Criar tarefa"
          submittingLabel="Criando..."
        />
      }
    >
      <form id="add-task-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Título" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ligar para o aluno sobre…"
            required
            autoFocus
            className={inputClass}
          />
        </Field>

        <Field label="Detalhes">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Contexto, próximos passos…"
            className={textareaClass}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Aluno">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={selectClass}>
              <option value="">Sem aluno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsável">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={selectClass}>
              <option value="">Eu mesmo</option>
              {activeStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prioridade">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={selectClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <DatePickerField label="Prazo" value={dueAt} onChange={setDueAt} />
        </div>
      </form>
    </Modal>
  );
}
