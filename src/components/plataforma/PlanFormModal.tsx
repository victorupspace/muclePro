"use client";

import { useEffect, useState } from "react";
import { CurrencyInput, Field, inputClass, ModalFooter, selectClass, textareaClass, Toggle } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { PLAN_FREQUENCY_LABEL, PLAN_FREQUENCY_MONTHS, formatCurrencyDetailed } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Plan, PlanFrequency } from "@/lib/plataforma/types";

const FREQUENCIES = (Object.keys(PLAN_FREQUENCY_LABEL) as PlanFrequency[]).map((value) => ({
  value,
  label: PLAN_FREQUENCY_LABEL[value],
}));

export function PlanFormModal({ open, onClose, plan }: { open: boolean; onClose: () => void; plan?: Plan }) {
  const { addPlan, updatePlan } = usePlataformaStore();
  const { push } = useToast();
  const editing = Boolean(plan);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [frequency, setFrequency] = useState<PlanFrequency>("mensal");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? "");
    setAmount(plan?.amount ?? "");
    setFrequency(plan?.frequency ?? "mensal");
    setDescription(plan?.description ?? "");
    setActive(plan?.active ?? true);
  }, [open, plan]);

  const perMonth = amount === "" ? null : amount / PLAN_FREQUENCY_MONTHS[frequency];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || amount === "") return;
    setSubmitting(true);
    const payload = { name: name.trim(), amount, frequency, description: description.trim() };
    const result = plan ? await updatePlan(plan.id, { ...payload, active }) : await addPlan(payload);
    setSubmitting(false);
    if (result) {
      push({ tone: "success", title: plan ? "Plano atualizado" : "Plano criado", description: result.name });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar plano" : "Novo plano"}
      description="Valor e frequência definem o ciclo de cobrança de quem assina o plano."
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="plan-form"
          submitting={submitting}
          submitLabel={editing ? "Salvar alterações" : "Criar plano"}
          submittingLabel={editing ? "Salvando..." : "Criando..."}
        />
      }
    >
      <form id="plan-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nome do plano" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Mensal, Trimestral, Natação kids"
            required
            autoFocus
            className={inputClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor" required>
            <CurrencyInput value={amount} onChange={setAmount} required />
          </Field>
          <Field label="Frequência" required>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as PlanFrequency)}
              className={selectClass}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {perMonth !== null && frequency !== "mensal" && (
          <p className="rounded-btn bg-ink-50 px-3 py-2 text-[12px] text-ink-600">
            Equivale a <span className="font-semibold text-ink-900">{formatCurrencyDetailed(perMonth)}</span> por mês.
          </p>
        )}
        <Field label="Descrição" hint="Opcional. O que está incluído, regras de fidelidade.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Acesso livre, avaliação física inclusa…"
            className={textareaClass}
          />
        </Field>
        {editing && (
          <Toggle
            checked={active}
            onChange={setActive}
            label="Plano disponível para novos alunos"
            description="Desativar não afeta quem já assina. O plano some só da lista de escolha."
          />
        )}
      </form>
    </Modal>
  );
}
