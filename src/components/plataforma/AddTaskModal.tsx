"use client";

import { useState } from "react";
import { DatePickerField } from "./DatePickerField";
import { Modal } from "./Modal";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { TaskPriority } from "@/lib/plataforma/types";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTask, clients } = usePlataformaStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setDueAt("");
    setClientId("");
    setPriority("media");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const task = await addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : undefined,
      clientId: clientId || undefined,
      priority,
    });
    setSubmitting(false);
    if (task) handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nova tarefa"
      description="Defina o foco do dia. As tarefas ficam visíveis no dashboard e no CRM."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="add-task-form"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {submitting ? "Criando..." : "Criar tarefa"}
          </button>
        </div>
      }
    >
      <form id="add-task-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Título" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Retornar contato com…"
            required
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>

        <Field label="Detalhes">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Notas, próximos passos, contexto…"
            className="w-full rounded-btn border border-ink-200 bg-white px-3 py-2.5 text-[13px] leading-[1.5] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente vinculado">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400"
            >
              <option value="">Sem cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.companyName ? ` — ${c.companyName}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <DatePickerField label="Vencimento" value={dueAt} onChange={setDueAt} />
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </span>
      {children}
    </label>
  );
}
