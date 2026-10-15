"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Field, ModalFooter, textareaClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";
import { CHURN_REASON_LABEL, firstName } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { ChurnReason, Student } from "@/lib/plataforma/types";

export const CHURN_REASONS = Object.keys(CHURN_REASON_LABEL) as ChurnReason[];

// Grade de motivos de saída, usada no modal e no formulário do aluno.
export function ChurnReasonPicker({ value, onChange }: { value: ChurnReason | null; onChange: (v: ChurnReason) => void }) {
  return (
    <div role="radiogroup" aria-label="Motivo da saída" className="grid gap-1.5 sm:grid-cols-2">
      {CHURN_REASONS.map((reason) => {
        const active = value === reason;
        return (
          <button
            key={reason}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(reason)}
            className={cn(
              "flex min-h-[40px] items-center gap-2 rounded-btn border px-3 py-2 text-left text-[12.5px] font-semibold transition-colors",
              active
                ? "border-brand bg-brand/[0.05] text-brand"
                : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
            )}
          >
            <span
              className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                active ? "border-brand bg-brand text-white" : "border-ink-300",
              )}
            >
              {active && <Check className="h-2.5 w-2.5" strokeWidth={3.2} />}
            </span>
            {CHURN_REASON_LABEL[reason]}
          </button>
        );
      })}
    </div>
  );
}

// Inativar um aluno exige o motivo: é isso que alimenta o relatório de saídas.
export function ChurnReasonModal({ open, onClose, student }: { open: boolean; onClose: () => void; student: Student }) {
  const { updateStudent } = usePlataformaStore();
  const { push } = useToast();
  const [reason, setReason] = useState<ChurnReason | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason(null);
    setNotes("");
    setTouched(false);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!reason) return;
    setSubmitting(true);
    const updated = await updateStudent(student.id, { status: "inativo", churnReason: reason, churnNotes: notes.trim() });
    setSubmitting(false);
    if (updated) {
      push({
        tone: "info",
        title: `${firstName(student.fullName)} inativo`,
        description: "Cobranças futuras deixam de contar. Dá para reativar quando quiser.",
      });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Por que o aluno está saindo?"
      description={`${student.fullName} será marcado como inativo. O motivo entra no relatório de saídas do painel.`}
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="churn-form"
          submitting={submitting}
          submitLabel="Inativar aluno"
          submittingLabel="Inativando..."
          tone="danger"
        />
      }
    >
      <form id="churn-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ChurnReasonPicker value={reason} onChange={setReason} />
          {touched && !reason && (
            <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-danger-600">
              Escolha um motivo para continuar.
            </p>
          )}
        </div>
        <Field label="Detalhes" hint="Opcional. Ajuda a entender o que mudar.">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: mudou para outro bairro, achou o horário das 7h cheio…"
            className={textareaClass}
          />
        </Field>
      </form>
    </Modal>
  );
}
