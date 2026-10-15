"use client";

import { useEffect, useState } from "react";
import { ChurnReasonPicker } from "./ChurnReasonModal";
import { DatePickerField } from "./DatePickerField";
import { HealthFields, MeasureFields, emptyMeasureDraft, measuresFrom, type HealthDraft, type MeasureDraft } from "./health/HealthKit";
import { CurrencyInput, Field, inputClass, ModalFooter, SectionLabel, selectClass, textareaClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { maskCPF, maskPhoneBR } from "@/lib/cadastro/masks";
import { hasAnyMeasure } from "@/lib/plataforma/assessments";
import { PLAN_FREQUENCY_LABEL, formatCurrency, todayValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { ChurnReason, Student, StudentStatus } from "@/lib/plataforma/types";

type Props = {
  open: boolean;
  onClose: () => void;
  // Sem aluno = cadastro novo; com aluno = edição.
  student?: Student;
  // Abre direto na seção do plano (usado por "Vincular plano").
  focusPlan?: boolean;
  // Cadastro novo já preenchido (ex.: matrícula vinda do funil).
  prefill?: { fullName?: string; whatsapp?: string; email?: string; unitId?: string; notes?: string };
  title?: string;
  onCreated?: (student: Student) => void | Promise<void>;
};

export function StudentFormModal({ open, onClose, student, focusPlan, prefill, title, onCreated }: Props) {
  const { units, plans, addStudent, updateStudent, assignPlan, addAssessment } = usePlataformaStore();
  const { push } = useToast();
  const { profile } = useAccountSession();
  const editing = Boolean(student);
  const scopeUnitId = profile?.unitScopeId;
  // No cadastro, quem cadastra aluno escolhe o plano (abre o 1º ciclo).
  // Na edição, trocar plano é ação de cobrança.
  const canChoosePlan = !editing || Boolean(profile?.permissions.canSendPaymentLinks);

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [unitId, setUnitId] = useState("");
  const [planId, setPlanId] = useState("");
  const [planStartedAt, setPlanStartedAt] = useState(todayValue());
  const [health, setHealth] = useState<HealthDraft>({ conditions: [], restrictions: "", medicalNotes: "" });
  const [measures, setMeasures] = useState<MeasureDraft>(emptyMeasureDraft());
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<StudentStatus>("ativo");
  const [churnReason, setChurnReason] = useState<ChurnReason | null>(null);
  const [churnNotes, setChurnNotes] = useState("");
  const [churnMissing, setChurnMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(student?.fullName ?? prefill?.fullName ?? "");
    setWhatsapp(student?.whatsapp ?? prefill?.whatsapp ?? "");
    setEmail(student?.email ?? prefill?.email ?? "");
    setCpf(student?.cpf ? maskCPF(student.cpf) : "");
    setBirthDate(student?.birthDate ?? "");
    setUnitId(scopeUnitId ?? student?.unitId ?? prefill?.unitId ?? (units.find((u) => u.isMain)?.id ?? units[0]?.id ?? ""));
    setPlanId(student?.planId ?? "");
    setPlanStartedAt(student?.planStartedAt ?? todayValue());
    setHealth({
      conditions: student?.healthConditions ?? [],
      restrictions: student?.healthRestrictions ?? "",
      medicalNotes: student?.medicalNotes ?? "",
    });
    setMeasures(emptyMeasureDraft());
    setEmergencyName(student?.emergencyContactName ?? "");
    setEmergencyPhone(student?.emergencyContactPhone ?? "");
    setNotes(student?.notes ?? prefill?.notes ?? "");
    setStatus(student?.status ?? "ativo");
    setChurnReason(null);
    setChurnNotes("");
    setChurnMissing(false);
    // prefill é lido só ao abrir; mudanças com o modal aberto não reiniciam o formulário.
  }, [open, student, units, scopeUnitId]);

  const activePlans = plans.filter((p) => p.active || p.id === student?.planId);
  const selectedPlan = plans.find((p) => p.id === planId);
  const planChanged = editing && planId !== (student?.planId ?? "");
  const inactivating = editing && student?.status === "ativo" && status === "inativo";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    if (inactivating && !churnReason) {
      setChurnMissing(true);
      return;
    }
    setSubmitting(true);

    const base = {
      fullName: fullName.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      cpf: cpf.replace(/\D/g, ""),
      birthDate,
      unitId,
      medicalNotes: health.medicalNotes.trim(),
      healthConditions: health.conditions,
      healthRestrictions: health.restrictions.trim(),
      emergencyContactName: emergencyName.trim(),
      emergencyContactPhone: emergencyPhone.trim(),
      notes: notes.trim(),
    };

    if (!student) {
      const created = await addStudent({ ...base, planId: planId || undefined, planStartedAt: planId ? planStartedAt : undefined });
      setSubmitting(false);
      if (created) {
        const initial = measuresFrom(measures);
        if (hasAnyMeasure(initial)) await addAssessment({ studentId: created.id, kind: "inicial", ...initial });
        await onCreated?.(created);
        push({ tone: "success", title: "Aluno cadastrado", description: `${created.fullName} já está na sua base.` });
        onClose();
      }
      return;
    }

    const updated = await updateStudent(student.id, {
      ...base,
      status,
      ...(inactivating && churnReason ? { churnReason, churnNotes: churnNotes.trim() } : {}),
    });
    let ok = Boolean(updated);
    if (ok && planChanged) {
      if (planId) {
        ok = await assignPlan(student.id, planId, planStartedAt);
      } else {
        ok = Boolean(await updateStudent(student.id, { planId: "", planStartedAt: "" }));
      }
    }
    setSubmitting(false);
    if (ok) {
      push({ tone: "success", title: "Cadastro atualizado" });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? (editing ? "Editar aluno" : "Novo aluno")}
      description={
        editing
          ? "Mantenha contato, plano e informações críticas em dia."
          : "O essencial para começar. Dá para completar o resto depois, na ficha do aluno."
      }
      size="lg"
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="student-form"
          submitting={submitting}
          submitLabel={editing ? "Salvar alterações" : "Cadastrar aluno"}
          submittingLabel={editing ? "Salvando..." : "Cadastrando..."}
        />
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <Field label="Nome completo" required>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Maria Souza"
              required
              autoFocus={!focusPlan}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp">
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhoneBR(e.target.value))}
                placeholder="(11) 99999-0000"
                inputMode="tel"
                className={inputClass}
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@email.com"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF">
              <input
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className={inputClass}
              />
            </Field>
            <DatePickerField label="Data de nascimento" value={birthDate} onChange={setBirthDate} />
          </div>
        </div>

        <SectionLabel>Plano e unidade</SectionLabel>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plano" hint={selectedPlan ? `${formatCurrency(selectedPlan.amount)} · ${PLAN_FREQUENCY_LABEL[selectedPlan.frequency]}` : undefined}>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                autoFocus={focusPlan}
                disabled={!canChoosePlan}
                className={selectClass}
              >
                <option value="">Sem plano por enquanto</option>
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatCurrency(p.amount)}
                  </option>
                ))}
              </select>
            </Field>
            {units.length > 0 && (
              <Field label="Unidade">
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  disabled={Boolean(scopeUnitId)}
                  className={selectClass}
                >
                  {!scopeUnitId && <option value="">Sem unidade</option>}
                  {units
                    .filter((u) => u.active || u.id === student?.unitId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
          </div>
          {planId && (!editing || planChanged) && (
            <DatePickerField
              label="Início do plano"
              value={planStartedAt}
              onChange={setPlanStartedAt}
              required
            />
          )}
          {planChanged && planId && (
            <p className="rounded-btn bg-warning-50 px-3 py-2 text-[12px] leading-[1.5] text-warning-800 ring-1 ring-inset ring-warning-200">
              Ao trocar o plano, as cobranças pendentes do plano anterior são canceladas e um novo ciclo começa na data de início.
            </p>
          )}
        </div>

        {!editing && (
          <>
            <SectionLabel>Anamnese inicial</SectionLabel>
            <MeasureFields value={measures} onChange={setMeasures} />
          </>
        )}

        <SectionLabel>Saúde e atendimento</SectionLabel>
        <div className="space-y-3">
          <HealthFields value={health} onChange={setHealth} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contato de emergência">
              <input
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Nome"
                className={inputClass}
              />
            </Field>
            <Field label="Telefone de emergência">
              <input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(maskPhoneBR(e.target.value))}
                placeholder="(11) 99999-0000"
                inputMode="tel"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Horário preferido, objetivo, como conheceu a academia…"
              className={textareaClass}
            />
          </Field>
          {editing && (
            <Field label="Situação do aluno">
              <select value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)} className={selectClass}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </Field>
          )}
          {inactivating && (
            <div className="space-y-3 rounded-btn border border-ink-200 bg-ink-50/50 p-3">
              <div>
                <p className="mb-2 text-[12px] font-semibold text-ink-800">
                  Por que o aluno está saindo? <span className="text-danger-600">*</span>
                </p>
                <ChurnReasonPicker
                  value={churnReason}
                  onChange={(v) => {
                    setChurnReason(v);
                    setChurnMissing(false);
                  }}
                />
                {churnMissing && (
                  <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-danger-600">
                    Escolha um motivo para inativar o aluno.
                  </p>
                )}
              </div>
              <Field label="Detalhes da saída" hint="Opcional.">
                <textarea
                  value={churnNotes}
                  onChange={(e) => setChurnNotes(e.target.value)}
                  rows={2}
                  className={textareaClass}
                />
              </Field>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// Reexportado para quem precisa só do campo de valor.
export { CurrencyInput };
