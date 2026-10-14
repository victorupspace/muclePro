"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { ClientSegmentField } from "./ClientSegmentField";
import { DISTRIBUTOR_LOCATIONS, getDistributorsForState } from "@/lib/plataforma/distributors";
import { usePlataformaStore } from "@/lib/plataforma/store";

export function AddClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addClient } = usePlataformaStore();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [distributor, setDistributor] = useState("");
  const [segment, setSegment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const distributorOptions = getDistributorsForState(locationState);

  function reset() {
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setLocationState("");
    setLocationCity("");
    setDistributor("");
    setSegment("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !locationState || !distributor) return;
    setSubmitting(true);
    const client = await addClient({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      locationState,
      locationCity: locationCity.trim() || undefined,
      distributor,
      segment: segment.trim() || undefined,
      status: "novo",
    });
    setSubmitting(false);
    if (client) handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo cliente"
      description="Cadastro rápido — você pode complementar os dados depois na ficha do cliente."
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
            form="add-client-form"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {submitting ? "Adicionando..." : "Adicionar cliente"}
          </button>
        </div>
      }
    >
      <form id="add-client-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nome do contato" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Souza"
            required
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <Field label="Empresa">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Souza & Cia"
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
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
        <ClientSegmentField value={segment} onChange={setSegment} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Localização" required>
            <select
              value={locationState}
              onChange={(e) => {
                setLocationState(e.target.value);
                setDistributor("");
              }}
              required
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400"
            >
              <option value="">Selecione o estado</option>
              {DISTRIBUTOR_LOCATIONS.map((location) => (
                <option key={location.state} value={location.state}>
                  {location.label} ({location.state})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cidade">
            <input
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              placeholder="Campinas"
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
            />
          </Field>
        </div>
        <Field label="Distribuidora" required>
          <select
            value={distributor}
            onChange={(e) => setDistributor(e.target.value)}
            required
            disabled={!locationState}
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400"
          >
            <option value="">
              {locationState ? "Selecione a distribuidora" : "Selecione a localização primeiro"}
            </option>
            {distributorOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
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
