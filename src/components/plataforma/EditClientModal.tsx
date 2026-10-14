"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { ClientSegmentField } from "./ClientSegmentField";
import { DISTRIBUTOR_LOCATIONS, getDistributorsForState } from "@/lib/plataforma/distributors";
import { CLIENT_STATUS_LABEL } from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Client, ClientStatus } from "@/lib/plataforma/types";

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "qualificando", label: "Qualificando" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "assinado", label: "Assinado" },
  { value: "migrando", label: "Migrando" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

export function EditClientModal({
  client,
  open,
  onClose,
}: {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateClient } = usePlataformaStore();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [distributor, setDistributor] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<ClientStatus>("novo");
  const [submitting, setSubmitting] = useState(false);
  const distributorOptions = getDistributorsForState(locationState);

  useEffect(() => {
    if (!client) return;
    setName(client.name);
    setCompanyName(client.companyName ?? "");
    setEmail(client.email);
    setPhone(client.phone);
    setLocationState(client.locationState ?? "");
    setLocationCity(client.locationCity ?? "");
    setDistributor(client.distributor ?? "");
    setSegment(client.segment ?? "");
    setStatus(client.status);
  }, [client]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !name.trim() || !email.trim() || !phone.trim() || !locationState || !distributor)
      return;
    setSubmitting(true);
    const updated = await updateClient(client.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      locationState,
      locationCity: locationCity.trim() || undefined,
      distributor,
      segment: segment.trim() || undefined,
      status,
    });
    setSubmitting(false);
    if (updated) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar cliente"
      description="Atualize as informações de contato e status comercial."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-client-form"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {submitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nome do contato" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <Field label="Empresa">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
            />
          </Field>
          <Field label="Telefone" required>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ClientSegmentField value={segment} onChange={setSegment} />
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {CLIENT_STATUS_LABEL[o.value] ?? o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
