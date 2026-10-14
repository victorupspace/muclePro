"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, CircleDot, Clock, FileText, Info, Upload } from "lucide-react";
import { DatePickerField } from "./DatePickerField";
import { Modal } from "./Modal";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  CLIENT_MIGRATION_LABEL,
  CLIENT_MIGRATION_STAGES,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatKw,
  formatKwh,
} from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type {
  Client,
  ClientMigrationStage,
  ClientMigrationStatus,
  ClientMigrationStep,
  ClientProfile,
} from "@/lib/plataforma/types";

const STATUS_LABEL: Record<ClientMigrationStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const STEP_DESCRIPTIONS: Record<ClientMigrationStage, string> = {
  diagnostico: "Coleta e validação dos dados iniciais para entender elegibilidade, consumo e contexto contratual.",
  simulacao: "Registro da simulação econômico-financeira usada como base para a recomendação de migração.",
  proposta_enviada: "Controle do envio formal da proposta ao cliente e próximos retornos comerciais.",
  proposta_aceita: "Confirmação de aceite para iniciar as etapas operacionais de migração.",
  denuncia: "Formalização da denúncia à distribuidora dentro dos prazos aplicáveis.",
  contratos: "Acompanhamento da assinatura dos contratos CUSD/CCER e documentos correlatos.",
  smf: "Controle de adequação do Sistema de Medição para Faturamento.",
  ccee: "Modelagem e registros necessários para operação na CCEE.",
  ativo_ml: "Confirmação final de cliente ativo no mercado livre.",
};

const REQUIRED_DOCUMENT: Partial<Record<ClientMigrationStage, string>> = {
  denuncia: "Carta de denúncia",
  contratos: "PDF assinado",
  smf: "Documento técnico",
};

export function ClientResumoTab({ client, profile }: { client: Client; profile: ClientProfile }) {
  const [selectedStage, setSelectedStage] = useState<ClientMigrationStage | null>(null);
  const selectedStep = profile.migrationSteps.find((step) => step.stepName === selectedStage) ?? null;
  const completed = profile.migrationSteps.filter((step) => step.status === "concluido").length;
  const progress = Math.round((completed / CLIENT_MIGRATION_STAGES.length) * 100);
  const currentStep =
    profile.migrationSteps.find((step) => step.status === "em_andamento") ??
    profile.migrationSteps.find((step) => step.status === "pendente") ??
    profile.migrationSteps[profile.migrationSteps.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-5"
    >
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Economia mensal"
          value={
            client.status === "ativo" && client.monthlySavings
              ? formatCurrency(client.monthlySavings)
              : "—"
          }
          hint={client.status === "ativo" ? "Baseado nas faturas processadas" : "Disponível após ativação"}
          highlight={client.status === "ativo"}
        />
        <Stat
          label="Progresso da migração"
          value={`${progress}%`}
          hint={currentStep ? CLIENT_MIGRATION_LABEL[currentStep.stepName] : "Sem etapa atual"}
          highlight={progress > 0}
        />
        <Stat
          label="Consumo médio"
          value={formatKwh(profile.averageConsumptionKwh)}
          hint="Soma das UCs ativas"
        />
        <Stat
          label="Última interação"
          value={profile.lastInteractionAt ? formatDateLong(profile.lastInteractionAt) : "—"}
          hint="Comunicações e atualizações"
        />
      </section>

      <section className="rounded-card border border-ink-200 bg-white">
        <header className="flex flex-col gap-3 border-b border-ink-200 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            <h2 className="text-[14px] font-bold text-ink-900">Timeline de migração</h2>
            <p className="text-[12px] text-ink-500">
              Acompanhe as etapas operacionais até o cliente entrar em plena operação no ML.
            </p>
          </div>
          <div className="min-w-[190px]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
              <span>Progresso</span>
              <span className="text-brand">{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.45, ease: EASE }}
                className="h-full rounded-full bg-brand"
              />
            </div>
          </div>
        </header>

        <ol className="flex gap-3 overflow-x-auto px-4 py-4 md:px-5">
          {profile.migrationSteps.map((step, i) => (
            <li key={step.stepName} className="min-w-[230px] flex-1">
              <TimelineStepCard
                step={step}
                index={i + 1}
                contractAlert={hasContractAlert(step.stepName, profile)}
                onClick={() => setSelectedStage(step.stepName)}
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-card border border-ink-200 bg-white">
        <header className="flex flex-col gap-1 border-b border-ink-200 px-4 py-3 md:px-5">
          <h2 className="text-[14px] font-bold text-ink-900">Dados técnicos</h2>
          <p className="text-[12px] text-ink-500">
            Visão consolidada por UC. Para detalhes operacionais, abra a unidade.
          </p>
        </header>
        {profile.units.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-ink-500 md:px-5">
            Nenhuma UC cadastrada ainda.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {profile.units.map((u) => (
              <li key={u.id} className="px-4 py-4 md:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink-900">{u.ucCode}</p>
                  <div className="flex items-center gap-1.5">
                    {!u.smfReady && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-warning-700 ring-1 ring-inset ring-warning-200">
                        <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
                        SMF pendente
                      </span>
                    )}
                    {u.contractEndAt && new Date(u.contractEndAt).getTime() - Date.now() < 90 * 86_400_000 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-danger-700 ring-1 ring-inset ring-danger-200">
                        <Clock className="h-3 w-3" strokeWidth={2.4} />
                        Vence em breve
                      </span>
                    )}
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-3 lg:grid-cols-7">
                  <Field label="Distribuidora" value={u.distribuidora} />
                  <Field
                    label="Localização"
                    value={
                      u.locationCity && u.locationState
                        ? `${u.locationCity}/${u.locationState}`
                        : u.locationState ?? "—"
                    }
                  />
                  <Field label="Submercado" value={u.submercado} />
                  <Field label="Tensão" value={u.tensao} />
                  <Field label="Demanda" value={formatKw(u.contractedDemandKw)} />
                  <Field label="Tarifa" value={u.tariff ?? "—"} />
                  <Field label="Consumo médio" value={formatKwh(u.averageConsumptionKwh)} />
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MigrationStepModal
        clientId={client.id}
        step={selectedStep}
        steps={profile.migrationSteps}
        onClose={() => setSelectedStage(null)}
      />
    </motion.div>
  );
}

function TimelineStepCard({
  step,
  index,
  contractAlert,
  onClick,
}: {
  step: ClientMigrationStep;
  index: number;
  contractAlert: boolean;
  onClick: () => void;
}) {
  const stale = isStale(step);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full w-full flex-col rounded-card border bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-[0_18px_45px_-28px_rgba(17,17,17,0.35)]",
        step.status === "concluido"
          ? "border-success-200"
          : step.status === "em_andamento"
            ? "border-brand/40 ring-1 ring-inset ring-brand/15"
            : "border-ink-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <StageBullet status={step.status} index={index} />
        <span className={cn("text-[10.5px] font-bold uppercase tracking-[0.1em]", statusTone(step.status))}>
          {STATUS_LABEL[step.status]}
        </span>
      </div>
      <p className="mt-3 min-h-[38px] text-[13px] font-semibold leading-[1.35] text-ink-900">
        {CLIENT_MIGRATION_LABEL[step.stepName]}
      </p>
      <div className="mt-auto pt-3">
        <p className="text-[11.5px] text-ink-500">
          {step.completedAt ? formatDateShort(step.completedAt) : "Sem data concluída"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REQUIRED_DOCUMENT[step.stepName] && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-600">
              <FileText className="h-3 w-3" strokeWidth={2.4} />
              {step.documents.length}
            </span>
          )}
          {stale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10.5px] font-bold text-warning-700 ring-1 ring-inset ring-warning-200">
              <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
              Parada
            </span>
          )}
          {contractAlert && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10.5px] font-bold text-danger-700 ring-1 ring-inset ring-danger-200">
              <Clock className="h-3 w-3" strokeWidth={2.4} />
              Prazo
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MigrationStepModal({
  clientId,
  step,
  steps,
  onClose,
}: {
  clientId: string;
  step: ClientMigrationStep | null;
  steps: ClientMigrationStep[];
  onClose: () => void;
}) {
  const { updateClientMigrationStep, addClientMigrationDocument } = usePlataformaStore();
  const [status, setStatus] = useState<ClientMigrationStatus>("pendente");
  const [notes, setNotes] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!step) return;
    setStatus(step.status);
    setNotes(step.notes ?? "");
    setCompletedAt(step.completedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  }, [step]);

  if (!step) return null;

  const index = steps.findIndex((item) => item.stepName === step.stepName);
  const canComplete = steps.slice(0, index).every((item) => item.status === "concluido");
  const requiredDocument = REQUIRED_DOCUMENT[step.stepName];

  async function save(nextStatus = status) {
    const currentStep = step;
    if (!currentStep) return;
    if (nextStatus === "concluido" && !canComplete) return;
    setSaving(true);
    await updateClientMigrationStep(clientId, currentStep.stepName, {
      status: nextStatus,
      notes: notes.trim() || undefined,
      completedAt:
        nextStatus === "concluido" && completedAt
          ? new Date(`${completedAt}T12:00:00`).toISOString()
          : undefined,
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={!!step}
      onClose={onClose}
      title={CLIENT_MIGRATION_LABEL[step.stepName]}
      description={STEP_DESCRIPTIONS[step.stepName]}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save(status)}
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Salvar alterações
          </button>
          <button
            type="button"
            onClick={() => void save("em_andamento")}
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:h-10 sm:w-auto"
          >
            Marcar em andamento
          </button>
          <button
            type="button"
            onClick={() => void save("concluido")}
            disabled={saving || !canComplete}
            className="inline-flex h-11 w-full items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {saving ? "Salvando..." : "Concluir etapa"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {!canComplete && (
          <div className="rounded-card border border-warning-200 bg-warning-50 px-3 py-2 text-[12px] font-medium text-warning-700">
            Conclua as etapas anteriores antes de avançar esta etapa.
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientMigrationStatus)}
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none transition-colors focus:border-ink-400"
          >
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </label>

        <DatePickerField label="Data de conclusão" value={completedAt} onChange={setCompletedAt} />

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Observações
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-btn border border-ink-200 bg-white px-3 py-2 text-[13px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-ink-400"
            placeholder="Inclua prazos, pendências, responsáveis ou próximos passos."
          />
        </label>

        <div className="rounded-card border border-ink-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12.5px] font-bold text-ink-900">Documentos da etapa</p>
              <p className="text-[11.5px] text-ink-500">
                {requiredDocument ? `Documento esperado: ${requiredDocument}` : "Anexos operacionais opcionais"}
              </p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover">
              <Upload className="h-3.5 w-3.5" strokeWidth={2.4} />
              Upload
              <input
                type="file"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void addClientMigrationDocument(clientId, step.stepName, {
                    name: file.name,
                    sizeKb: Math.max(1, Math.round(file.size / 1024)),
                  });
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {step.documents.length === 0 ? (
            <p className="mt-3 text-[12px] text-ink-500">Nenhum arquivo anexado nesta etapa.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {step.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-[12.5px] font-medium text-ink-900">
                    {document.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-500">
                    {document.sizeKb} KB · {formatDateShort(document.uploadedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border bg-white p-4 md:p-5",
        highlight ? "border-brand/40 ring-1 ring-inset ring-brand/15" : "border-ink-200",
      )}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className={cn(
          "mt-3 text-[22px] font-bold leading-[1] tracking-[-0.025em] md:text-[26px]",
          highlight ? "text-brand" : "text-ink-900",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[11.5px] text-ink-500">{hint}</p>
    </div>
  );
}

function StageBullet({ status, index }: { status: ClientMigrationStatus; index: number }) {
  const tone =
    status === "concluido"
      ? "bg-success-600 text-white"
      : status === "em_andamento"
        ? "bg-brand text-white"
        : "bg-ink-100 text-ink-500";
  const Icon = status === "concluido" ? Check : status === "em_andamento" ? CircleDot : Info;
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-transform group-hover:scale-105",
        status === "em_andamento" && "animate-pulse",
        tone,
      )}
    >
      {status === "pendente" ? index : <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />}
    </span>
  );
}

function statusTone(status: ClientMigrationStatus) {
  if (status === "concluido") return "text-success-600";
  if (status === "em_andamento") return "text-brand";
  return "text-ink-400";
}

function isStale(step: ClientMigrationStep) {
  return step.status === "em_andamento" && Date.now() - new Date(step.updatedAt).getTime() > 14 * 86_400_000;
}

function hasContractAlert(stage: ClientMigrationStage, profile: ClientProfile) {
  return (
    stage === "contratos" &&
    profile.units.some(
      (unit) => unit.contractEndAt && new Date(unit.contractEndAt).getTime() - Date.now() < 90 * 86_400_000,
    )
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}
