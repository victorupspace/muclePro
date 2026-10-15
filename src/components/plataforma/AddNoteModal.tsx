"use client";

import { useEffect, useState } from "react";
import { Field, ModalFooter, selectClass, textareaClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { usePlataformaStore } from "@/lib/plataforma/store";

type Kind = "nota" | "contato";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "presencial", label: "Presencial" },
  { value: "email", label: "E-mail" },
];

export function AddNoteModal({
  open,
  onClose,
  studentId,
  defaultKind = "nota",
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  defaultKind?: Kind;
}) {
  const { addStudentActivity } = usePlataformaStore();
  const { push } = useToast();
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [channel, setChannel] = useState("whatsapp");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    setChannel("whatsapp");
    setBody("");
  }, [open, defaultKind]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const channelLabel = CHANNELS.find((c) => c.value === channel)?.label ?? "";
    const activity = await addStudentActivity(studentId, {
      kind,
      title: kind === "nota" ? "Nota adicionada" : `Contato por ${channelLabel}`,
      body: body.trim(),
      metadata: kind === "contato" ? { channel } : undefined,
    });
    setSubmitting(false);
    if (activity) {
      push({ tone: "success", title: kind === "nota" ? "Nota salva" : "Contato registrado" });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === "nota" ? "Nova nota" : "Registrar contato"}
      description="Fica no histórico do aluno, visível para toda a equipe."
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="add-note-form"
          submitting={submitting}
          submitLabel={kind === "nota" ? "Salvar nota" : "Registrar contato"}
        />
      }
    >
      <form id="add-note-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={selectClass}>
              <option value="nota">Nota interna</option>
              <option value="contato">Contato com o aluno</option>
            </select>
          </Field>
          {kind === "contato" && (
            <Field label="Canal">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={selectClass}>
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Field label={kind === "nota" ? "Nota" : "O que foi combinado"} required>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
            autoFocus
            placeholder={kind === "nota" ? "Ex.: prefere treinar de manhã, objetivo é hipertrofia" : "Ex.: disse que paga até sexta"}
            className={textareaClass}
          />
        </Field>
      </form>
    </Modal>
  );
}
