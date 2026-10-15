"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "./DatePickerField";
import { CurrencyInput, Field, inputClass, ModalFooter, selectClass, textareaClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import {
  PAYMENT_METHOD_LABEL,
  PLAN_FREQUENCY_LABEL,
  formatCurrency,
  formatCurrencyDetailed,
  formatDateValue,
  todayValue,
} from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Payment, PaymentMethod, Student } from "@/lib/plataforma/types";

const METHODS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABEL[value],
}));

// Marca uma cobrança como paga e abre o próximo ciclo do plano.
export function RegisterPaymentModal({
  open,
  onClose,
  payment,
  student,
}: {
  open: boolean;
  onClose: () => void;
  payment?: Payment;
  student?: Student;
}) {
  const { registerPayment } = usePlataformaStore();
  const { push } = useToast();
  const [paidAt, setPaidAt] = useState(todayValue());
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [amount, setAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaidAt(todayValue());
    setMethod("pix");
    setAmount(payment?.amount ?? "");
    setNotes("");
  }, [open, payment]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payment || amount === "") return;
    setSubmitting(true);
    const ok = await registerPayment(payment.id, { paidAt, method, amount, notes: notes.trim() });
    setSubmitting(false);
    if (ok) {
      push({
        tone: "success",
        title: "Pagamento registrado",
        description: `${formatCurrencyDetailed(amount)} de ${student?.fullName ?? "aluno"}. Próximo ciclo já criado.`,
      });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pagamento"
      description={
        payment
          ? `${student?.fullName ?? "Aluno"} · ${payment.referenceLabel ?? "cobrança"} · vencimento ${formatDateValue(payment.dueAt)}`
          : undefined
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="register-payment-form"
          submitting={submitting}
          submitLabel="Confirmar pagamento"
          submittingLabel="Registrando..."
        />
      }
    >
      <form id="register-payment-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor recebido" required>
            <CurrencyInput value={amount} onChange={setAmount} required />
          </Field>
          <Field label="Forma de pagamento">
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={selectClass}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <DatePickerField label="Data do pagamento" value={paidAt} onChange={setPaidAt} required />
        <Field label="Observação">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: pagou em duas vezes, desconto combinado…"
            className={textareaClass}
          />
        </Field>
      </form>
    </Modal>
  );
}

// Vincula (ou troca) o plano do aluno e abre o primeiro ciclo.
export function AssignPlanModal({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student?: Student;
}) {
  const { plans, assignPlan } = usePlataformaStore();
  const { push } = useToast();
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayValue());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlanId(student?.planId ?? "");
    setStartDate(todayValue());
  }, [open, student]);

  const activePlans = plans.filter((p) => p.active);
  const selected = plans.find((p) => p.id === planId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student || !planId) return;
    setSubmitting(true);
    const ok = await assignPlan(student.id, planId, startDate);
    setSubmitting(false);
    if (ok) {
      push({
        tone: "success",
        title: "Plano vinculado",
        description: `${student.fullName} agora está no plano ${selected?.name ?? ""}.`,
      });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student?.planId ? "Trocar plano" : "Vincular plano"}
      description={student ? `${student.fullName} · a primeira cobrança vence na data de início.` : undefined}
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="assign-plan-form"
          submitting={submitting}
          submitLabel="Vincular plano"
          submittingLabel="Vinculando..."
        />
      }
    >
      <form id="assign-plan-form" onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Plano"
          required
          hint={selected ? `${formatCurrency(selected.amount)} · ${PLAN_FREQUENCY_LABEL[selected.frequency]}` : undefined}
        >
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} required autoFocus className={selectClass}>
            <option value="">Selecione um plano</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatCurrency(p.amount)}
              </option>
            ))}
          </select>
        </Field>
        <DatePickerField label="Início do plano" value={startDate} onChange={setStartDate} required />
        {student?.planId && student.planId !== planId && planId && (
          <p className="rounded-btn bg-warning-50 px-3 py-2 text-[12px] leading-[1.5] text-warning-800 ring-1 ring-inset ring-warning-200">
            As cobranças pendentes do plano atual serão canceladas.
          </p>
        )}
      </form>
    </Modal>
  );
}

// Cobrança fora do ciclo do plano (taxa, produto, avaliação…).
export function AddChargeModal({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student?: Student;
}) {
  const { addPayment } = usePlataformaStore();
  const { push } = useToast();
  const [amount, setAmount] = useState<number | "">("");
  const [dueAt, setDueAt] = useState(todayValue());
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setDueAt(todayValue());
    setLabel("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student || amount === "") return;
    setSubmitting(true);
    const created = await addPayment({
      studentId: student.id,
      amount,
      dueAt,
      referenceLabel: label.trim() || "Cobrança avulsa",
    });
    setSubmitting(false);
    if (created) {
      push({ tone: "success", title: "Cobrança criada", description: `${formatCurrencyDetailed(amount)} · vence ${formatDateValue(dueAt)}.` });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova cobrança avulsa"
      description="Para itens fora do plano: taxa de matrícula, avaliação, produtos."
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="add-charge-form"
          submitting={submitting}
          submitLabel="Criar cobrança"
          submittingLabel="Criando..."
        />
      }
    >
      <form id="add-charge-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Descrição" required>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Taxa de matrícula"
            required
            autoFocus
            className={inputClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor" required>
            <CurrencyInput value={amount} onChange={setAmount} required />
          </Field>
          <DatePickerField label="Vencimento" value={dueAt} onChange={setDueAt} required />
        </div>
      </form>
    </Modal>
  );
}
