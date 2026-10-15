"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "./DatePickerField";
import { Field, inputClass, ModalFooter, SectionLabel, selectClass, textareaClass, Toggle } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { maskCPF, maskPhoneBR } from "@/lib/cadastro/masks";
import { STAFF_ROLE_LABEL } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Staff, StaffRole } from "@/lib/plataforma/types";

const ROLES = (Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map((value) => ({
  value,
  label: STAFF_ROLE_LABEL[value],
}));

// Alçadas sugeridas por perfil. O gestor ajusta como quiser.
const ROLE_DEFAULTS: Record<StaffRole, { register: boolean; links: boolean; workouts: boolean }> = {
  gestao: { register: true, links: true, workouts: true },
  recepcao: { register: true, links: true, workouts: false },
  contabilidade: { register: false, links: true, workouts: false },
  personal: { register: false, links: false, workouts: true },
  outro: { register: false, links: false, workouts: false },
};

export function StaffFormModal({
  open,
  onClose,
  member,
  focusUnit,
}: {
  open: boolean;
  onClose: () => void;
  member?: Staff;
  focusUnit?: boolean;
}) {
  const { units, addStaff, updateStaff } = usePlataformaStore();
  const { push } = useToast();
  const editing = Boolean(member);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("recepcao");
  const [roleLabel, setRoleLabel] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unitId, setUnitId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [canRegister, setCanRegister] = useState(false);
  const [canLinks, setCanLinks] = useState(false);
  const [canWorkouts, setCanWorkouts] = useState(false);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaults = ROLE_DEFAULTS[member?.role ?? "recepcao"];
    setFullName(member?.fullName ?? "");
    setRole(member?.role ?? "recepcao");
    setRoleLabel(member?.roleLabel ?? "");
    setCpf(member?.cpf ? maskCPF(member.cpf) : "");
    setEmail(member?.email ?? "");
    setPhone(member?.phone ?? "");
    setUnitId(member?.unitId ?? "");
    setStartedAt(member?.startedAt ?? "");
    setEndedAt(member?.endedAt ?? "");
    setCanRegister(member?.canRegisterStudents ?? defaults.register);
    setCanLinks(member?.canSendPaymentLinks ?? defaults.links);
    setCanWorkouts(member?.canCreateWorkouts ?? defaults.workouts);
    setActive(member?.active ?? true);
    setNotes(member?.notes ?? "");
  }, [open, member]);

  function changeRole(next: StaffRole) {
    setRole(next);
    if (!editing) {
      const d = ROLE_DEFAULTS[next];
      setCanRegister(d.register);
      setCanLinks(d.links);
      setCanWorkouts(d.workouts);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSubmitting(true);
    const payload = {
      fullName: fullName.trim(),
      role,
      roleLabel: role === "outro" ? roleLabel.trim() : "",
      cpf: cpf.replace(/\D/g, ""),
      email: email.trim(),
      phone: phone.trim(),
      unitId,
      startedAt,
      endedAt,
      canRegisterStudents: canRegister,
      canSendPaymentLinks: canLinks,
      canCreateWorkouts: canWorkouts,
      notes: notes.trim(),
    };
    const result = member ? await updateStaff(member.id, { ...payload, active }) : await addStaff(payload);
    setSubmitting(false);
    if (result) {
      push({
        tone: "success",
        title: member ? "Funcionário atualizado" : "Funcionário cadastrado",
        description: result.fullName,
      });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar funcionário" : "Novo funcionário"}
      description="Quem faz parte da equipe, em qual unidade e o que pode fazer no sistema."
      size="lg"
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="staff-form"
          submitting={submitting}
          submitLabel={editing ? "Salvar alterações" : "Cadastrar funcionário"}
          submittingLabel={editing ? "Salvando..." : "Cadastrando..."}
        />
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <Field label="Nome completo" required>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Carla Mendes"
              required
              autoFocus={!focusUnit}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Perfil" required>
              <select value={role} onChange={(e) => changeRole(e.target.value as StaffRole)} className={selectClass}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            {role === "outro" ? (
              <Field label="Nome do perfil" required>
                <input
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="Ex.: Nutricionista"
                  required
                  className={inputClass}
                />
              </Field>
            ) : (
              <Field label="CPF">
                <input
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
            )}
          </div>
          {role === "outro" && (
            <Field label="CPF">
              <input
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className={inputClass}
              />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carla@suaacademia.com.br"
                className={inputClass}
              />
            </Field>
            <Field label="Telefone">
              <input
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                placeholder="(11) 99999-0000"
                inputMode="tel"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <SectionLabel>Vínculo</SectionLabel>
        <div className="space-y-3">
          {units.length > 0 && (
            <Field
              label="Unidade"
              hint={units.length > 1 ? "Com mais de uma filial, cada funcionário fica vinculado à sua." : undefined}
            >
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} autoFocus={focusUnit} className={selectClass}>
                <option value="">Sem unidade</option>
                {units
                  .filter((u) => u.active || u.id === member?.unitId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePickerField label="Data de entrada" value={startedAt} onChange={setStartedAt} />
            <DatePickerField label="Data de saída" value={endedAt} onChange={setEndedAt} />
          </div>
          {editing && (
            <Toggle
              checked={active}
              onChange={setActive}
              label="Funcionário ativo"
              description="Inativos perdem o acesso ao sistema na hora e saem das listas. O histórico fica guardado."
            />
          )}
        </div>

        <SectionLabel>Permissões</SectionLabel>
        <div className="space-y-2">
          <Toggle
            checked={canRegister}
            onChange={setCanRegister}
            label="Pode cadastrar novos alunos"
            description="Criar e editar fichas de alunos."
          />
          <Toggle
            checked={canLinks}
            onChange={setCanLinks}
            label="Pode enviar cobranças e links de pagamento"
            description="Cobrar alunos e registrar pagamentos recebidos."
          />
          <Toggle
            checked={canWorkouts}
            onChange={setCanWorkouts}
            label="Pode criar treinos"
            description="Reservado para quando a prescrição de treino entrar no sistema."
          />
        </div>

        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Turno, especialidade, acordos…"
            className={textareaClass}
          />
        </Field>
      </form>
    </Modal>
  );
}
