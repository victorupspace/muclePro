"use client";

import { useEffect, useState } from "react";
import { ReasonPicker } from "../ChurnReasonModal";
import { Field, ModalFooter, inputClass, textareaClass } from "../FormKit";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { LEAD_LOST_REASON_LABEL, firstName } from "@/lib/plataforma/format";
import { fromLocalInput, toLocalInput } from "@/lib/plataforma/leads";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Lead, LeadLostReason } from "@/lib/plataforma/types";

// Marcar a aula experimental (ou remarcar).
export function ScheduleTrialModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead | null }) {
  const { updateLead } = usePlataformaStore();
  const { push } = useToast();
  const [when, setWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (lead?.trialAt) {
      setWhen(toLocalInput(lead.trialAt));
    } else {
      const tomorrow = new Date(Date.now() + 86_400_000);
      tomorrow.setHours(18, 0, 0, 0);
      setWhen(toLocalInput(tomorrow.toISOString()));
    }
  }, [open, lead]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !when) return;
    setSubmitting(true);
    const saved = await updateLead(lead.id, { stage: "agendada", trialAt: fromLocalInput(when) });
    setSubmitting(false);
    if (saved) {
      push({ tone: "success", title: "Aula experimental marcada", description: "Lembre o interessado na véspera." });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead?.trialAt ? "Remarcar aula experimental" : "Marcar aula experimental"}
      description={lead ? `${lead.fullName} vai para Aula agendada.` : undefined}
      footer={<ModalFooter onCancel={onClose} formId="trial-form" submitting={submitting} submitLabel="Marcar aula" />}
    >
      <form id="trial-form" onSubmit={handleSubmit}>
        <Field label="Dia e horário" required>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className={inputClass} />
        </Field>
      </form>
    </Modal>
  );
}

const LOST_REASONS = Object.keys(LEAD_LOST_REASON_LABEL) as LeadLostReason[];

// Perdido exige motivo: é o que mostra onde o funil vaza.
export function LostLeadModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead | null }) {
  const { updateLead } = usePlataformaStore();
  const { push } = useToast();
  const [reason, setReason] = useState<LeadLostReason | null>(null);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason(null);
    setNotes("");
    setTouched(false);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!lead || !reason) return;
    setSubmitting(true);
    const saved = await updateLead(lead.id, { stage: "perdido", lostReason: reason, lostNotes: notes.trim() });
    setSubmitting(false);
    if (saved) {
      push({ tone: "info", title: `${firstName(lead.fullName)} marcado como perdido`, description: "Dá para trazer de volta ao funil quando quiser." });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Por que não fechou?"
      description={lead ? `${lead.fullName} sai do funil. O motivo entra no relatório de matrículas.` : undefined}
      footer={
        <ModalFooter onCancel={onClose} formId="lost-form" submitting={submitting} submitLabel="Marcar como perdido" tone="danger" />
      }
    >
      <form id="lost-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ReasonPicker
            label="Motivo da perda"
            options={LOST_REASONS.map((r) => ({ value: r, label: LEAD_LOST_REASON_LABEL[r] }))}
            value={reason}
            onChange={setReason}
          />
          {touched && !reason && (
            <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-danger-600">
              Escolha um motivo para continuar.
            </p>
          )}
        </div>
        <Field label="Detalhes" hint="Opcional.">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={textareaClass} placeholder="Ex.: fechou com a academia do lado por R$ 89" />
        </Field>
      </form>
    </Modal>
  );
}
