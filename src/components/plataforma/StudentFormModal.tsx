"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { ChurnReasonPicker } from "./ChurnReasonModal";
import { DatePickerField } from "./DatePickerField";
import { HealthFields, MeasureFields, emptyMeasureDraft, measuresFrom, type HealthDraft, type MeasureDraft } from "./health/HealthKit";
import { CurrencyInput, Field, inputClass, ModalFooter, SectionLabel, selectClass, textareaClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { fetchCEP } from "@/lib/cadastro/cep";
import { isValidCPF, maskCEP, maskCPF, maskPhoneBR, onlyDigits } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase/client";
import { hasAnyMeasure } from "@/lib/plataforma/assessments";
import { PLAN_FREQUENCY_LABEL, formatCurrency, todayValue } from "@/lib/plataforma/format";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

type CPFStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; source: "receita" | "algoritmo"; warning?: string; nameMatches?: boolean; birthMatches?: boolean }
  | { state: "invalid"; message: string };

// Data aaaa-mm-dd deslocada em meses/anos a partir de hoje.
function shiftedToday(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
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
  const [cpfStatus, setCpfStatus] = useState<CPFStatus>({ state: "idle" });
  const [cep, setCep] = useState("");
  const [cepState, setCepState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const numberRef = useRef<HTMLInputElement | null>(null);
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
    setCpfStatus({ state: "idle" });
    setCep(student?.addressZip ? maskCEP(student.addressZip) : "");
    setCepState({ loading: false, error: null });
    setStreet(student?.addressStreet ?? "");
    setNumber(student?.addressNumber ?? "");
    setComplement(student?.addressComplement ?? "");
    setDistrict(student?.addressDistrict ?? "");
    setCity(student?.addressCity ?? "");
    setUf(student?.addressState ?? "");
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
  // Sem plano ativo não há cadastro: o aluno precisa de um plano para existir.
  const blockedNoPlans = !editing && plans.filter((p) => p.active).length === 0;
  const birthMax = shiftedToday(-1);
  const birthMin = shiftedToday(-120 * 12);
  const birthError =
    birthDate && birthDate > birthMax
      ? "O aluno precisa ter pelo menos 1 mês de idade."
      : birthDate && birthDate < birthMin
        ? "Confira o ano: a data indica mais de 120 anos."
        : null;

  // Confere o CPF: dígitos aqui mesmo e, no servidor, a Receita Federal
  // (quando a integração com o Serpro estiver ativa).
  async function verifyCpf(value = cpf) {
    const digits = onlyDigits(value);
    if (!digits || digits === (student?.cpf ?? "")) {
      setCpfStatus({ state: "idle" });
      return true;
    }
    if (digits.length < 11) {
      setCpfStatus({ state: "invalid", message: "O CPF tem 11 números." });
      return false;
    }
    if (!isValidCPF(digits)) {
      setCpfStatus({ state: "invalid", message: "CPF inválido. Confira os números digitados." });
      return false;
    }
    setCpfStatus({ state: "checking" });
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/plataforma/cpf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ cpf: digits, fullName, birthDate }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as
      | { valid?: boolean; source?: "receita" | "algoritmo"; message?: string; warning?: string; nameMatches?: boolean; birthMatches?: boolean }
      | null;
    if (!response?.ok || !result) {
      // Sem resposta do servidor: vale a conferência dos dígitos.
      setCpfStatus({ state: "ok", source: "algoritmo" });
      return true;
    }
    if (!result.valid) {
      setCpfStatus({ state: "invalid", message: result.message ?? "CPF inválido." });
      return false;
    }
    setCpfStatus({
      state: "ok",
      source: result.source ?? "algoritmo",
      warning: result.warning,
      nameMatches: result.nameMatches,
      birthMatches: result.birthMatches,
    });
    return true;
  }

  async function lookupCep(value: string) {
    const digits = onlyDigits(value);
    if (digits.length !== 8) return;
    setCepState({ loading: true, error: null });
    try {
      const address = await fetchCEP(digits);
      setStreet(address.street);
      setDistrict(address.district);
      setCity(address.city);
      setUf(address.state);
      setCepState({ loading: false, error: null });
      numberRef.current?.focus();
    } catch (error) {
      setCepState({ loading: false, error: (error as Error).message });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || blockedNoPlans) return;
    if (birthError) return;
    if (cpfStatus.state === "checking") return;
    if (!(await verifyCpf())) return;
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
      addressZip: onlyDigits(cep),
      addressStreet: street.trim(),
      addressNumber: number.trim(),
      addressComplement: complement.trim(),
      addressDistrict: district.trim(),
      addressCity: city.trim(),
      addressState: uf,
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
        blockedNoPlans ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-btn border border-ink-200 bg-white px-4 text-[13px] font-semibold text-ink-700 hover:border-ink-400"
            >
              Fechar
            </button>
          </div>
        ) : (
        <ModalFooter
          onCancel={onClose}
          formId="student-form"
          submitting={submitting}
          submitLabel={editing ? "Salvar alterações" : "Cadastrar aluno"}
          submittingLabel={editing ? "Salvando..." : "Cadastrando..."}
        />
        )
      }
    >
      {blockedNoPlans ? (
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Wallet className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <p className="mt-4 text-[16px] font-bold text-ink-900">Cadastre um plano primeiro</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-[1.6] text-ink-600">
            Todo aluno entra com um plano, que define a mensalidade e o vencimento. Crie pelo menos um plano (ex.: Mensal) e
            volte para cadastrar o aluno.
          </p>
          {profile?.isOwner || profile?.permissions.isManager ? (
            <Link
              href="/plataforma/planos"
              onClick={onClose}
              className="mt-5 inline-flex h-10 items-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Criar meu primeiro plano
            </Link>
          ) : (
            <p className="mt-4 text-[12.5px] font-semibold text-ink-700">Peça ao gestor da academia para cadastrar os planos.</p>
          )}
        </div>
      ) : (
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
            <div>
              <Field label="CPF">
                <input
                  value={cpf}
                  onChange={(e) => {
                    const masked = maskCPF(e.target.value);
                    setCpf(masked);
                    if (onlyDigits(masked).length === 11) void verifyCpf(masked);
                    else setCpfStatus({ state: "idle" });
                  }}
                  onBlur={() => void verifyCpf()}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={cpfStatus.state === "invalid"}
                  className={cn(inputClass, cpfStatus.state === "invalid" && "border-danger-300")}
                />
              </Field>
              <CpfStatusLine status={cpfStatus} />
            </div>
            <DatePickerField
              label="Data de nascimento"
              value={birthDate}
              onChange={setBirthDate}
              min={birthMin}
              max={birthMax}
              hideShortcuts
              error={birthError}
              maxMessage="O aluno precisa ter pelo menos 1 mês de idade."
              minMessage="Confira o ano: a data indica mais de 120 anos."
            />
          </div>
        </div>

        <SectionLabel>Endereço</SectionLabel>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <Field label="CEP">
                <div className="relative">
                  <input
                    value={cep}
                    onChange={(e) => {
                      const masked = maskCEP(e.target.value);
                      setCep(masked);
                      setCepState({ loading: false, error: null });
                      if (onlyDigits(masked).length === 8) void lookupCep(masked);
                    }}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className={cn(inputClass, cepState.error && "border-danger-300")}
                  />
                  {cepState.loading && (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-ink-400" strokeWidth={2.4} />
                  )}
                </div>
              </Field>
              {cepState.error ? (
                <p role="alert" className="mt-1 text-[11.5px] font-semibold text-danger-600">{cepState.error}</p>
              ) : (
                <p className="mt-1 text-[11.5px] text-ink-500">Preenche o endereço.</p>
              )}
            </div>
            <Field label="Rua">
              <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Avenida Paulista" className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr_1fr]">
            <Field label="Número">
              <input ref={numberRef} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1000" className={inputClass} />
            </Field>
            <Field label="Complemento">
              <input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto 12" className={inputClass} />
            </Field>
            <Field label="Bairro">
              <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bela Vista" className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Cidade">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" className={inputClass} />
            </Field>
            <Field label="UF">
              <select value={uf} onChange={(e) => setUf(e.target.value)} className={selectClass}>
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
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
      )}
    </Modal>
  );
}

// Reexportado para quem precisa só do campo de valor.
export { CurrencyInput };

function CpfStatusLine({ status }: { status: CPFStatus }) {
  if (status.state === "checking") {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-ink-500">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
        Conferindo o CPF...
      </p>
    );
  }
  if (status.state === "invalid") {
    return (
      <p role="alert" className="mt-1 text-[11.5px] font-semibold text-danger-600">
        {status.message}
      </p>
    );
  }
  if (status.state === "ok") {
    const mismatch = status.nameMatches === false || status.birthMatches === false;
    if (status.warning || mismatch) {
      return (
        <p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-semibold leading-[1.45] text-warning-800">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" strokeWidth={2.4} />
          {status.warning ??
            (status.nameMatches === false ? "O nome não bate com o da Receita Federal. Confira o CPF." : "A data de nascimento não bate com a da Receita Federal.")}
        </p>
      );
    }
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success-700">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
        {status.source === "receita" ? "CPF confere na Receita Federal" : "CPF válido"}
      </p>
    );
  }
  return null;
}
