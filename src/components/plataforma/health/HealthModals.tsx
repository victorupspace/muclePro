"use client";

import { DatePickerField } from "../DatePickerField";
import { useEffect, useState } from "react";
import { Field, ModalFooter, inputClass, textareaClass } from "../FormKit";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { HealthFields, MeasureFields, draftFrom, emptyMeasureDraft, measuresFrom, type HealthDraft, type MeasureDraft } from "./HealthKit";
import { hasAnyMeasure, latestHeight } from "@/lib/plataforma/assessments";
import { firstName, todayValue } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Assessment, Student } from "@/lib/plataforma/types";

export function HealthModal({ open, onClose, student }: { open: boolean; onClose: () => void; student: Student }) {
  const { updateStudentHealth } = usePlataformaStore();
  const { push } = useToast();
  const [draft, setDraft] = useState<HealthDraft>({ conditions: [], restrictions: "", medicalNotes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft({
      conditions: student.healthConditions,
      restrictions: student.healthRestrictions ?? "",
      medicalNotes: student.medicalNotes ?? "",
    });
  }, [open, student]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await updateStudentHealth(student.id, draft);
    setSubmitting(false);
    if (ok) {
      push({ tone: "success", title: "Dados de saúde salvos", description: "A equipe vê as restrições ao montar o treino." });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Dados de saúde"
      description={student.fullName}
      footer={<ModalFooter onCancel={onClose} formId="health-form" submitting={submitting} submitLabel="Salvar" />}
    >
      <form id="health-form" onSubmit={handleSubmit}>
        <HealthFields value={draft} onChange={setDraft} />
      </form>
    </Modal>
  );
}

// Anamnese inicial ou reavaliação. A primeira avaliação do aluno é sempre a inicial.
export function AssessmentModal({
  open,
  onClose,
  student,
  assessment,
}: {
  open: boolean;
  onClose: () => void;
  student: Student;
  assessment?: Assessment;
}) {
  const { assessmentsFor, addAssessment, updateAssessment } = usePlataformaStore();
  const { push } = useToast();
  const [measuredOn, setMeasuredOn] = useState(todayValue());
  const [measures, setMeasures] = useState<MeasureDraft>(emptyMeasureDraft());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const history = assessmentsFor(student.id);
  const isFirst = !assessment && history.length === 0;
  const kind = assessment?.kind ?? (isFirst ? "inicial" : "reavaliacao");

  useEffect(() => {
    if (!open) return;
    setMeasuredOn(assessment?.measuredOn ?? todayValue());
    // Reavaliação já traz a altura conhecida.
    setMeasures(assessment ? draftFrom(assessment) : draftFrom({ heightCm: latestHeight(assessmentsFor(student.id)) }));
    setNotes(assessment?.notes ?? "");
    setError(null);
    // Só reinicia ao abrir; o histórico é lido nesse momento.
  }, [open, assessment, student.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = measuresFrom(measures);
    if (!hasAnyMeasure(values)) return setError("Informe pelo menos o peso ou uma medida.");
    setError(null);
    setSubmitting(true);
    const saved = assessment
      ? await updateAssessment(assessment.id, { ...values, measuredOn, notes })
      : await addAssessment({ studentId: student.id, kind, measuredOn, notes, ...values });
    setSubmitting(false);
    if (saved) {
      push({
        tone: "success",
        title: kind === "inicial" ? "Anamnese inicial registrada" : "Reavaliação registrada",
        description: kind === "inicial" ? undefined : `A evolução de ${firstName(student.fullName)} já foi atualizada.`,
      });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={assessment ? "Editar avaliação" : kind === "inicial" ? "Anamnese inicial" : "Nova reavaliação"}
      description={kind === "inicial" ? `Ponto de partida de ${student.fullName}. As próximas medições mostram a evolução a partir daqui.` : student.fullName}
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="assessment-form"
          submitting={submitting}
          submitLabel={assessment ? "Salvar" : "Registrar avaliação"}
          extra={error ? <p role="alert" className="text-[12px] font-semibold text-danger-600">{error}</p> : undefined}
        />
      }
    >
      <form id="assessment-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Data da avaliação" className="sm:max-w-[220px]">
          <DatePickerField value={measuredOn} onChange={setMeasuredOn} max={todayValue()} hideShortcuts />
        </Field>
        <MeasureFields value={measures} onChange={setMeasures} />
        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: medido em jejum, pela manhã. Objetivo: reduzir cintura."
            className={textareaClass}
          />
        </Field>
      </form>
    </Modal>
  );
}
