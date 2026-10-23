"use client";

import { DateTimeField } from "../DateTimeField";
import { useEffect, useState } from "react";
import { Field, ModalFooter, inputClass, selectClass, textareaClass } from "../FormKit";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { maskPhoneBR } from "@/lib/cadastro/masks";
import { LEAD_SOURCE_LABEL, LEAD_STAGE_LABEL, firstName } from "@/lib/plataforma/format";
import { OPEN_STAGES, fromLocalInput, toLocalInput } from "@/lib/plataforma/leads";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Lead, LeadSource, LeadStage } from "@/lib/plataforma/types";

const SOURCES = Object.keys(LEAD_SOURCE_LABEL) as LeadSource[];

// Novo interessado ou edição dos dados de um interessado.
export function LeadFormModal({
  open,
  onClose,
  lead,
  defaultStage = "novo",
}: {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
  defaultStage?: LeadStage;
}) {
  const { units, staff, addLead, updateLead } = usePlataformaStore();
  const { profile } = useAccountSession();
  const { push } = useToast();
  const editing = Boolean(lead);
  const scopeUnitId = profile?.unitScopeId;

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("instagram");
  const [interest, setInterest] = useState("");
  const [unitId, setUnitId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [stage, setStage] = useState<LeadStage>("novo");
  const [trialAt, setTrialAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(lead?.fullName ?? "");
    setWhatsapp(lead?.whatsapp ?? "");
    setEmail(lead?.email ?? "");
    setSource(lead?.source ?? "instagram");
    setInterest(lead?.interest ?? "");
    setUnitId(scopeUnitId ?? lead?.unitId ?? units.find((u) => u.isMain)?.id ?? units[0]?.id ?? "");
    setOwnerId(lead?.ownerStaffId ?? profile?.staffId ?? "");
    setStage(lead?.stage ?? defaultStage);
    setTrialAt(toLocalInput(lead?.trialAt));
    setNotes(lead?.notes ?? "");
  }, [open, lead, units, scopeUnitId, profile?.staffId, defaultStage]);

  const activeStaff = staff.filter((s) => s.active);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSubmitting(true);
    const base = {
      fullName,
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      source,
      interest: interest.trim(),
      unitId,
      ownerStaffId: ownerId,
      trialAt: fromLocalInput(trialAt),
      notes: notes.trim(),
    };
    const saved = lead
      ? await updateLead(lead.id, base)
      : await addLead({ ...base, stage: stage === "novo" && trialAt ? "agendada" : stage });
    setSubmitting(false);
    if (saved) {
      push({
        tone: "success",
        title: lead ? "Interessado atualizado" : `${firstName(saved.fullName)} entrou no funil`,
        description: lead ? undefined : `Etapa: ${LEAD_STAGE_LABEL[saved.stage]}.`,
      });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar interessado" : "Novo interessado"}
      description={editing ? undefined : "Quem perguntou sobre a academia e ainda não é aluno."}
      size="lg"
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="lead-form"
          submitting={submitting}
          submitLabel={editing ? "Salvar alterações" : "Adicionar ao funil"}
        />
      }
    >
      <form id="lead-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" required className="sm:col-span-2">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus className={inputClass} placeholder="Nome do interessado" />
        </Field>
        <Field label="WhatsApp">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhoneBR(e.target.value))}
            inputMode="tel"
            placeholder="(11) 98765-4321"
            className={inputClass}
          />
        </Field>
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" className={inputClass} />
        </Field>
        <Field label="Como conheceu">
          <select value={source} onChange={(e) => setSource(e.target.value as LeadSource)} className={selectClass}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {LEAD_SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interesse" hint="Modalidade, objetivo ou horário.">
          <input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Ex.: musculação à noite, emagrecer" className={inputClass} />
        </Field>
        {!editing && (
          <Field label="Etapa">
            <select value={stage} onChange={(e) => setStage(e.target.value as LeadStage)} className={selectClass}>
              {OPEN_STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Aula experimental" hint={editing ? undefined : "Se marcar, o lead já entra em Aula agendada."}>
          <DateTimeField value={trialAt} onChange={setTrialAt} defaultTime="18:00" />
        </Field>
        {units.length > 1 && !scopeUnitId && (
          <Field label="Unidade">
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={selectClass}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Responsável">
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectClass}>
            <option value="">{profile?.isOwner ? "Eu (dono)" : "Sem responsável"}</option>
            {activeStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={textareaClass} placeholder="Já treinou antes? Alguma restrição? O que pesa na decisão?" />
        </Field>
      </form>
    </Modal>
  );
}
