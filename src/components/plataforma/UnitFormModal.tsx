"use client";

import { useEffect, useState } from "react";
import { Field, inputClass, ModalFooter, Toggle } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { maskPhoneBR } from "@/lib/cadastro/masks";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Unit } from "@/lib/plataforma/types";

export function UnitFormModal({ open, onClose, unit }: { open: boolean; onClose: () => void; unit?: Unit }) {
  const { units, addUnit, updateUnit } = usePlataformaStore();
  const { push } = useToast();
  const editing = Boolean(unit);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(unit?.name ?? "");
    setAddress(unit?.address ?? "");
    setCity(unit?.city ?? "");
    setState(unit?.state ?? "");
    setPhone(unit?.phone ?? "");
    setIsMain(unit?.isMain ?? units.length === 0);
    setActive(unit?.active ?? true);
  }, [open, unit, units.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      phone: phone.trim(),
      isMain,
    };
    let result: Unit | null;
    if (unit) {
      result = await updateUnit(unit.id, { ...payload, active });
    } else {
      result = await addUnit(payload);
    }
    // Só uma unidade pode ser a principal.
    if (result && isMain) {
      for (const other of units) {
        if (other.id !== result.id && other.isMain) await updateUnit(other.id, { isMain: false });
      }
    }
    setSubmitting(false);
    if (result) {
      push({ tone: "success", title: unit ? "Unidade atualizada" : "Unidade adicionada", description: result.name });
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar unidade" : "Nova unidade"}
      description="Cada filial tem endereço próprio e funcionários vinculados a ela."
      footer={
        <ModalFooter
          onCancel={onClose}
          formId="unit-form"
          submitting={submitting}
          submitLabel={editing ? "Salvar alterações" : "Adicionar unidade"}
          submittingLabel={editing ? "Salvando..." : "Adicionando..."}
        />
      }
    >
      <form id="unit-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nome da unidade" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Centro, Zona Norte"
            required
            autoFocus
            className={inputClass}
          />
        </Field>
        <Field label="Endereço">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número e bairro"
            className={inputClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_88px]">
          <Field label="Cidade">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" className={inputClass} />
          </Field>
          <Field label="UF">
            <input
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="SP"
              maxLength={2}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Telefone">
          <input
            value={phone}
            onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
            placeholder="(11) 3333-4444"
            inputMode="tel"
            className={inputClass}
          />
        </Field>
        <Toggle
          checked={isMain}
          onChange={setIsMain}
          label="Unidade principal"
          description="É a unidade padrão ao cadastrar alunos e funcionários."
        />
        {editing && (
          <Toggle
            checked={active}
            onChange={setActive}
            label="Unidade ativa"
            description="Unidades inativas somem das listas de escolha."
          />
        )}
      </form>
    </Modal>
  );
}
