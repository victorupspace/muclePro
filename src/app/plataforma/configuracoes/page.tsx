"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Pencil, Plus, Star, Trash2, UserRound } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ActiveBadge } from "@/components/plataforma/Badges";
import { Field, inputClass, selectClass } from "@/components/plataforma/FormKit";
import { SubscriptionBadge } from "@/components/plataforma/SubscriptionBadge";
import { useToast } from "@/components/plataforma/Toast";
import { UnitFormModal } from "@/components/plataforma/UnitFormModal";
import { PageIntro, useRevealList } from "@/components/plataforma/motion";
import { cn } from "@/lib/cn";
import { isValidCNPJ, isValidCPF, maskCNPJ, maskCPF, maskPhoneBR } from "@/lib/cadastro/masks";
import { BUSINESS_TYPE_LABEL, formatDocument } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { BusinessType, DocumentType, Unit } from "@/lib/plataforma/types";

const BUSINESS_TYPES = (Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((value) => ({
  value,
  label: BUSINESS_TYPE_LABEL[value],
}));

export default function ConfiguracoesPage() {
  const { profile } = useAccountSession();
  const { units, staff, students, subscription, updateCompanyProfile, removeUnit } = usePlataformaStore();
  const { push } = useToast();

  const canManage = profile?.permissions.canManageCompany ?? false;

  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("academia");
  const [documentType, setDocumentType] = useState<DocumentType>("cnpj");
  const [document, setDocument] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [unitForm, setUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [confirmUnit, setConfirmUnit] = useState<Unit | null>(null);

  useEffect(() => {
    if (!profile) return;
    setCompanyName(profile.companyName ?? "");
    setBusinessType(profile.businessType ?? "academia");
    setDocumentType(profile.documentType ?? "cnpj");
    setDocument(
      profile.document ? (profile.documentType === "cpf" ? maskCPF(profile.document) : maskCNPJ(profile.document)) : "",
    );
    setAddress(profile.address ?? "");
    setContactPhone(profile.contactPhone ?? "");
    setContactEmail(profile.contactEmail ?? "");
  }, [profile]);

  const unitsRef = useRevealList<HTMLUListElement>([units.length]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    const currentDoc = document.replace(/\D/g, "");
    return (
      companyName !== (profile.companyName ?? "") ||
      businessType !== (profile.businessType ?? "academia") ||
      documentType !== (profile.documentType ?? "cnpj") ||
      currentDoc !== (profile.document ?? "") ||
      address !== (profile.address ?? "") ||
      contactPhone !== (profile.contactPhone ?? "") ||
      contactEmail !== (profile.contactEmail ?? "")
    );
  }, [profile, companyName, businessType, documentType, document, address, contactPhone, contactEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = document.replace(/\D/g, "");
    const valid = documentType === "cnpj" ? isValidCNPJ(digits) : isValidCPF(digits);
    if (!valid) {
      setDocError(documentType === "cnpj" ? "CNPJ inválido. Confira os 14 dígitos." : "CPF inválido. Confira os 11 dígitos.");
      return;
    }
    setDocError(null);
    setSaving(true);
    const ok = await updateCompanyProfile({
      companyName: companyName.trim(),
      businessType,
      documentType,
      document: digits,
      address: address.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
    });
    setSaving(false);
    if (ok) push({ tone: "success", title: "Dados da empresa salvos" });
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Configurações"
        title="Dados da empresa e unidades"
        description="O que identifica o estabelecimento no sistema: razão social, CNPJ, endereço, contato e filiais."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
          <header className="mb-4 flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-700">
              <Building2 className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-[14px] font-bold tracking-[-0.005em] text-ink-900">Empresa</h2>
              <p className="text-[11.5px] text-ink-500">
                {canManage ? "Só o responsável pela conta altera estes dados." : "Somente leitura. Peça ao responsável pela conta para alterar."}
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3">
            <fieldset disabled={!canManage} className="space-y-3 disabled:opacity-80">
              <Field label="Nome do estabelecimento" required>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Academia Alfa"
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo de estabelecimento" required>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)} className={selectClass}>
                    {BUSINESS_TYPES.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={documentType === "cnpj" ? "CNPJ" : "CPF"} required hint={docError ?? undefined}>
                  <div className="flex gap-2">
                    <select
                      value={documentType}
                      onChange={(e) => {
                        setDocumentType(e.target.value as DocumentType);
                        setDocument("");
                      }}
                      className={cn(selectClass, "w-[88px] shrink-0")}
                    >
                      <option value="cnpj">CNPJ</option>
                      <option value="cpf">CPF</option>
                    </select>
                    <input
                      value={document}
                      onChange={(e) => setDocument(documentType === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                      required
                      inputMode="numeric"
                      placeholder={documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                      className={cn(inputClass, docError && "border-danger-400")}
                    />
                  </div>
                </Field>
              </div>
              <Field label="Endereço">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade/UF"
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Telefone de contato">
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(maskPhoneBR(e.target.value))}
                    placeholder="(11) 3333-4444"
                    inputMode="tel"
                    className={inputClass}
                  />
                </Field>
                <Field label="E-mail de contato">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contato@suaacademia.com.br"
                    className={inputClass}
                  />
                </Field>
              </div>
            </fieldset>

            {canManage && (
              <div className="flex items-center justify-end gap-2 border-t border-ink-100 pt-4">
                <button
                  type="submit"
                  disabled={saving || !dirty}
                  className="inline-flex h-10 items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            )}
          </form>
        </section>

        <div className="space-y-4">
          <section className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-700">
                  <MapPin className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div>
                  <h2 className="text-[14px] font-bold tracking-[-0.005em] text-ink-900">Unidades</h2>
                  <p className="text-[11.5px] text-ink-500">
                    {units.length === 0 ? "Cadastre a unidade principal e as filiais." : `${units.length} unidade${units.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUnit(null);
                    setUnitForm(true);
                  }}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-btn border border-ink-200 bg-white px-3 text-[12px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Adicionar
                </button>
              )}
            </header>

            {units.length === 0 ? (
              <p className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12px] text-ink-500">
                Nenhuma unidade ainda. Mesmo com um só endereço, vale cadastrar: alunos e funcionários ficam vinculados a ela.
              </p>
            ) : (
              <ul ref={unitsRef} className="space-y-2">
                {units.map((unit) => {
                  const members = staff.filter((s) => s.unitId === unit.id && s.active).length;
                  const pupils = students.filter((s) => s.unitId === unit.id && s.status === "ativo").length;
                  return (
                    <li
                      key={unit.id}
                      className={cn(
                        "flex items-start gap-3 rounded-btn border p-3",
                        unit.active ? "border-ink-200" : "border-dashed border-ink-200 opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          unit.isMain ? "bg-brand/10 text-brand" : "bg-ink-100 text-ink-500",
                        )}
                      >
                        {unit.isMain ? <Star className="h-3.5 w-3.5" strokeWidth={2.4} /> : <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-ink-900">{unit.name}</p>
                          {unit.isMain && (
                            <span className="rounded-full bg-brand/8 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-brand ring-1 ring-inset ring-brand/25">
                              Principal
                            </span>
                          )}
                          {!unit.active && <ActiveBadge active={false} labels={["Ativa", "Inativa"]} />}
                        </div>
                        <p className="mt-0.5 truncate text-[11.5px] text-ink-500">
                          {[unit.address, [unit.city, unit.state].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "Sem endereço"}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-500">
                          {pupils} aluno{pupils === 1 ? "" : "s"} · {members} funcionário{members === 1 ? "" : "s"}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnit(unit);
                              setUnitForm(true);
                            }}
                            aria-label="Editar unidade"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUnit(unit)}
                            aria-label="Excluir unidade"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
            <header className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-700">
                <UserRound className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-[14px] font-bold tracking-[-0.005em] text-ink-900">Responsável e assinatura</h2>
                <p className="text-[11.5px] text-ink-500">Alterações de responsável e plano são feitas com o suporte.</p>
              </div>
            </header>
            <dl className="divide-y divide-ink-100 text-[13px]">
              <InfoRow label="Responsável" value={profile?.fullName ?? "—"} />
              <InfoRow label="E-mail de acesso" value={profile?.email ?? "—"} />
              <InfoRow label="Telefone" value={profile?.phone ?? "—"} />
              <InfoRow label="Documento" value={formatDocument(profile?.document)} />
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-500">Assinatura musclePro</dt>
                <dd>
                  <SubscriptionBadge subscription={subscription} />
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <UnitFormModal
        open={unitForm}
        onClose={() => {
          setUnitForm(false);
          setEditingUnit(null);
        }}
        unit={editingUnit ?? undefined}
      />

      <ConfirmDialog
        open={!!confirmUnit}
        title={confirmUnit ? `Excluir a unidade ${confirmUnit.name}?` : "Excluir unidade?"}
        description="Alunos e funcionários vinculados ficam sem unidade. Se a filial só fechou temporariamente, prefira marcar como inativa."
        confirmLabel="Excluir unidade"
        cancelLabel="Manter"
        tone="danger"
        onCancel={() => setConfirmUnit(null)}
        onConfirm={async () => {
          if (confirmUnit) {
            const ok = await removeUnit(confirmUnit.id);
            if (ok) push({ tone: "info", title: "Unidade excluída" });
          }
          setConfirmUnit(null);
        }}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-500">{label}</dt>
      <dd className="truncate font-medium text-ink-900">{value}</dd>
    </div>
  );
}
