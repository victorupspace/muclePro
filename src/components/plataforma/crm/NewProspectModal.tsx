"use client";

import { useState } from "react";
import { Modal } from "@/components/plataforma/Modal";
import { ClientSegmentField } from "@/components/plataforma/ClientSegmentField";
import { DISTRIBUTOR_LOCATIONS, getDistributorsForState } from "@/lib/plataforma/distributors";
import { usePlataformaStore } from "@/lib/plataforma/store";
import { useToast } from "./Toast";
import type { Client } from "@/lib/plataforma/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (client: Client) => void;
};

export function NewProspectModal({ open, onClose, onCreated }: Props) {
  const { addClient, addClientActivity } = usePlataformaStore();
  const toast = useToast();

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locationState, setLocationState] = useState("");
  const [distributor, setDistributor] = useState("");
  const [segment, setSegment] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const distributorOptions = getDistributorsForState(locationState);

  function reset() {
    setName("");
    setCompanyName("");
    setDocument("");
    setEmail("");
    setPhone("");
    setLocationState("");
    setDistributor("");
    setSegment("");
    setNote("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setSubmitting(true);
    const client = await addClient({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      locationState: locationState || undefined,
      distributor: distributor || undefined,
      segment: segment.trim() || undefined,
      status: "novo",
    });
    setSubmitting(false);
    if (client) {
      if (note.trim()) {
        addClientActivity(client.id, {
          kind: "nota",
          title: "Observação inicial",
          body: note.trim(),
        });
      }
      addClientActivity(client.id, {
        kind: "criacao",
        title: "Prospect criado no Pipeline",
      });
      toast.push({ tone: "success", title: "Prospect criado", description: client.companyName ?? client.name });
      onCreated?.(client);
      handleClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo prospect"
      description="Cadastro rápido para entrar no funil. Você pode complementar os dados na ficha do cliente depois."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-prospect-form"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {submitting ? "Criando..." : "Criar prospect"}
          </button>
        </div>
      }
    >
      <form id="new-prospect-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nome do contato" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Souza"
            required
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <Field label="Razão social / Empresa">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Souza & Cia"
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CNPJ">
            <input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
            />
          </Field>
          <Field label="Telefone" required>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              required
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
            />
          </Field>
        </div>
        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresa.com"
            required
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <ClientSegmentField value={segment} onChange={setSegment} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Estado">
            <select
              value={locationState}
              onChange={(e) => {
                setLocationState(e.target.value);
                setDistributor("");
              }}
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400"
            >
              <option value="">Selecione</option>
              {DISTRIBUTOR_LOCATIONS.map((location) => (
                <option key={location.state} value={location.state}>
                  {location.label} ({location.state})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Distribuidora">
            <select
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              disabled={!locationState}
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
            >
              <option value="">{locationState ? "Selecione" : "Selecione o estado"}</option>
              {distributorOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Observação inicial">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Como esse contato chegou? Qual o próximo passo?"
            className="w-full rounded-btn border border-ink-200 bg-white px-3 py-2.5 text-[13px] leading-[1.5] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </span>
      {children}
    </label>
  );
}
