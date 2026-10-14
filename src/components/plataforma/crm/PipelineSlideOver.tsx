"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ClientLifecycleBadge } from "@/components/plataforma/ClientLifecycleBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  CLIENT_MIGRATION_LABEL,
  CLIENT_MIGRATION_STAGES,
  formatCurrency,
  formatDateTime,
  formatDocument,
  formatRelative,
} from "@/lib/plataforma/format";
import { usePlataformaStore } from "@/lib/plataforma/store";
import {
  DOC_PENDING_LABEL,
  MIGRATION_ALERT_LABEL,
  PRIORITY_LABEL,
  PROPOSAL_CARD_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  formatProposalCountdown,
  pickLatestProposal,
  pickLatestSimulation,
  priorityLevel,
  proposalCardStatus,
  type DocPendingEntry,
  type MigrationAlertEntry,
  type PriorityEntry,
} from "@/lib/plataforma/crm";
import {
  PRIORITY_LABEL_NBA,
  PRIORITY_TONE_NBA,
  type NextBestAction,
} from "@/lib/plataforma/next-best-action";
import type { Client } from "@/lib/plataforma/types";
import { useToast } from "./Toast";

type Props = {
  client: Client | null;
  onClose: () => void;
  followUpAt?: string;
  onSetFollowUp: (iso: string | null) => void;
  docPendings?: DocPendingEntry[];
  alerts?: MigrationAlertEntry[];
  priority?: PriorityEntry | null;
  nextAction?: NextBestAction | null;
  onExecuteNextAction?: (action: NextBestAction) => void;
};

export function PipelineSlideOver({
  client,
  onClose,
  followUpAt,
  onSetFollowUp,
  docPendings = [],
  alerts = [],
  priority = null,
  nextAction = null,
  onExecuteNextAction,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const {
    proposals,
    simulations,
    tasks,
    addClientActivity,
    removeClientActivity,
    addTask,
    toggleTask,
    getClientProfile,
    removeClient,
  } = usePlataformaStore();

  const [tab, setTab] = useState<"resumo" | "atividades">("resumo");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lastClientId = useRef<string | null>(null);

  useEffect(() => {
    if (client && client.id !== lastClientId.current) {
      lastClientId.current = client.id;
      setTab("resumo");
      setNote("");
      setTaskTitle("");
      setTaskDate("");
    }
  }, [client]);

  useEffect(() => {
    if (!client) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [client, onClose]);

  if (!client) return null;
  const profile = getClientProfile(client.id);
  if (!profile) return null;

  const proposal = pickLatestProposal(client, proposals);
  const proposalState = proposalCardStatus(proposal);
  const simulation = pickLatestSimulation(client, simulations);
  const clientTasks = tasks.filter((t) => t.clientId === client.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const openTasks = clientTasks.filter((t) => !t.done);

  function addNote() {
    if (!note.trim()) return;
    addClientActivity(client!.id, { kind: "nota", title: "Nota adicionada", body: note.trim() });
    setNote("");
    toast.push({ tone: "success", title: "Nota adicionada" });
  }

  async function createFollowUp() {
    if (!taskTitle.trim()) return;
    const dueIso = taskDate ? new Date(`${taskDate}T12:00:00`).toISOString() : undefined;
    const task = await addTask({
      title: taskTitle.trim(),
      clientId: client!.id,
      priority: "media",
      dueAt: dueIso,
    });
    if (task) {
      if (dueIso) onSetFollowUp(dueIso);
      addClientActivity(client!.id, {
        kind: "tarefa",
        title: "Follow-up criado",
        body: task.title,
      });
      toast.push({ tone: "success", title: "Follow-up criado" });
      setTaskTitle("");
      setTaskDate("");
    }
  }

  return (
    <AnimatePresence>
      {client && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-ink-900/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-ink-200 bg-white shadow-[0_24px_80px_-30px_rgba(17,17,17,0.45)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                  Oportunidade
                </p>
                <h2 className="mt-1 truncate text-[16px] font-bold tracking-[-0.01em] text-ink-900">
                  {client.companyName ?? client.name}
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <ClientLifecycleBadge status={client.status} />
                  {profile.document && (
                    <span className="text-[11px] text-ink-500">{formatDocument(profile.document)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </header>

            <div className="flex shrink-0 items-center gap-1 border-b border-ink-200 px-3 pt-3">
              {(["resumo", "atividades"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-t-btn px-3 py-2 text-[12px] font-semibold capitalize transition-colors",
                    tab === t ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === "resumo" ? (
                <div className="space-y-5">
                  <section className="grid grid-cols-2 gap-2">
                    <Stat
                      label="Economia/mês"
                      value={
                        simulation
                          ? formatCurrency(simulation.resultsData.monthlySavings)
                          : client.monthlySavings
                            ? formatCurrency(client.monthlySavings)
                            : "—"
                      }
                      hint="Baseado na última simulação"
                    />
                    <Stat
                      label="Última interação"
                      value={profile.lastInteractionAt ? formatRelative(profile.lastInteractionAt) : "—"}
                      hint="Atividade registrada"
                    />
                  </section>

                  {nextAction && (
                    <Section title="Próxima melhor ação">
                      <div className="rounded-card border border-brand/40 bg-brand/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 text-brand" strokeWidth={2.4} />
                              <p className="text-[12.5px] font-bold tracking-[-0.005em] text-ink-900">
                                {nextAction.title}
                              </p>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-[1.45] text-ink-700">
                              {nextAction.reason}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                              PRIORITY_TONE_NBA[nextAction.priority],
                            )}
                          >
                            {PRIORITY_LABEL_NBA[nextAction.priority]}
                          </span>
                        </div>
                        {onExecuteNextAction && (
                          <button
                            type="button"
                            onClick={() => onExecuteNextAction(nextAction)}
                            className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover"
                          >
                            {nextAction.ctaLabel}
                          </button>
                        )}
                      </div>
                    </Section>
                  )}

                  {priority && priorityLevel(priority.score) === "alta" && !nextAction && (
                    <Section title="Sinal de prioridade">
                      <div className="rounded-card border border-danger-200 bg-danger-50/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12.5px] font-semibold text-danger-700">
                            {PRIORITY_LABEL[priorityLevel(priority.score)]} · Score {priority.score}
                          </p>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-[1.45] text-ink-700">
                          {priority.reason}
                        </p>
                      </div>
                    </Section>
                  )}

                  {docPendings.length > 0 && (
                    <Section title="Documentos pendentes">
                      <ul className="space-y-1.5">
                        {docPendings.slice(0, 4).map((entry) => (
                          <li
                            key={`${entry.client.id}-${entry.type}`}
                            className="flex items-start justify-between gap-2 rounded-btn border border-ink-100 bg-white px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-ink-900">
                                {DOC_PENDING_LABEL[entry.type]}
                              </p>
                              <p className="truncate text-[10.5px] text-ink-500">{entry.reason}</p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                                SEVERITY_TONE[entry.severity],
                              )}
                            >
                              {SEVERITY_LABEL[entry.severity]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {alerts.length > 0 && (
                    <Section title="Alertas de migração">
                      <ul className="space-y-1.5">
                        {alerts.slice(0, 4).map((entry, i) => (
                          <li
                            key={`${entry.type}-${i}`}
                            className="flex items-start justify-between gap-2 rounded-btn border border-ink-100 bg-white px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-ink-900">
                                {MIGRATION_ALERT_LABEL[entry.type]}
                              </p>
                              <p className="truncate text-[10.5px] text-ink-500">{entry.description}</p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
                                SEVERITY_TONE[entry.severity],
                              )}
                            >
                              {SEVERITY_LABEL[entry.severity]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  <Section title="Última simulação">
                    {simulation ? (
                      <div className="rounded-card border border-ink-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[12.5px] font-semibold text-ink-900">
                            {formatCurrency(simulation.resultsData.monthlySavings)}/mês
                          </p>
                          <span className="text-[10.5px] text-ink-500">
                            {formatRelative(simulation.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-500">
                          Economia anual: {formatCurrency(simulation.resultsData.annualSavings)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {simulation.pdfUrl && (
                            <a
                              href={simulation.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-ink-200 px-2.5 text-[11.5px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
                            >
                              <FileText className="h-3 w-3" strokeWidth={2.2} />
                              Ver PDF
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/plataforma/simulador?clientId=${client.id}`)
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-ink-200 px-2.5 text-[11.5px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
                          >
                            <Calculator className="h-3 w-3" strokeWidth={2.2} />
                            Nova simulação
                          </button>
                        </div>
                      </div>
                    ) : (
                      <EmptyHint>
                        Sem simulações vinculadas. Crie uma para destravar a etapa de proposta.
                      </EmptyHint>
                    )}
                  </Section>

                  <Section title="Última proposta">
                    {proposal ? (
                      <div className="rounded-card border border-ink-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[12.5px] font-semibold text-ink-900">{proposal.title}</p>
                          <span className="text-[10.5px] text-ink-500">
                            {formatRelative(proposal.sentAt ?? proposal.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-500">
                          {PROPOSAL_CARD_LABEL[proposalState]} · {formatCurrency(proposal.amount)}
                        </p>
                        {proposalState === "enviada" && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-warning-700">
                            <Clock className="h-3 w-3" strokeWidth={2.4} />
                            {formatProposalCountdown(proposal)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <EmptyHint>Sem propostas registradas.</EmptyHint>
                    )}
                  </Section>

                  {client.status === "migrando" && (
                    <Section title="Timeline de migração">
                      <ul className="space-y-1.5">
                        {profile.migrationSteps
                          .filter((step) =>
                            ["denuncia", "contratos", "smf", "ccee", "ativo_ml"].includes(step.stepName),
                          )
                          .map((step) => {
                            const isDone = step.status === "concluido";
                            const isProgress = step.status === "em_andamento";
                            return (
                              <li
                                key={step.id}
                                className="flex items-center gap-2 rounded-btn border border-ink-100 bg-white px-2.5 py-1.5"
                              >
                                <span
                                  className={cn(
                                    "inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-inset",
                                    isDone && "bg-success-50 text-success-700 ring-success-200",
                                    isProgress && "bg-warning-50 text-warning-700 ring-warning-200",
                                    !isDone && !isProgress && "bg-ink-50 text-ink-400 ring-ink-200",
                                  )}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
                                  ) : (
                                    <Clock className="h-3 w-3" strokeWidth={2.4} />
                                  )}
                                </span>
                                <span className="flex-1 text-[12px] font-medium text-ink-700">
                                  {CLIENT_MIGRATION_LABEL[step.stepName]}
                                </span>
                                <span className="text-[10.5px] text-ink-500">
                                  {isDone ? "Concluído" : isProgress ? "Em andamento" : "Pendente"}
                                </span>
                              </li>
                            );
                          })}
                      </ul>
                    </Section>
                  )}

                  <Section title="Tarefas em aberto">
                    {openTasks.length === 0 ? (
                      <EmptyHint>Sem tarefas em aberto.</EmptyHint>
                    ) : (
                      <ul className="space-y-1.5">
                        {openTasks.slice(0, 5).map((t) => (
                          <li
                            key={t.id}
                            className="flex items-start gap-2 rounded-btn border border-ink-100 bg-white px-2.5 py-2"
                          >
                            <button
                              type="button"
                              onClick={() => toggleTask(t.id)}
                              className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border border-ink-300 text-white hover:border-ink-500"
                              aria-label="Concluir tarefa"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-semibold text-ink-900">{t.title}</p>
                              {t.dueAt && (
                                <p className="text-[10.5px] text-ink-500">
                                  Vence {formatDateTime(t.dueAt)}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 space-y-2 rounded-card border border-dashed border-ink-200 bg-ink-50/50 p-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
                        Criar follow-up
                      </p>
                      <input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Ligar para entender objeções"
                        className="h-9 w-full rounded-btn border border-ink-200 bg-white px-2.5 text-[12px] text-ink-900 placeholder-ink-400 outline-none focus:border-ink-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={taskDate}
                          onChange={(e) => setTaskDate(e.target.value)}
                          className="h-9 flex-1 rounded-btn border border-ink-200 bg-white px-2.5 text-[12px] text-ink-900 outline-none focus:border-ink-400"
                        />
                        <button
                          type="button"
                          onClick={createFollowUp}
                          className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-ink-900 px-3 text-[12px] font-semibold text-white hover:bg-ink-800"
                        >
                          <Plus className="h-3 w-3" strokeWidth={2.4} />
                          Criar
                        </button>
                      </div>
                    </div>
                  </Section>

                  <Section title="Adicionar nota">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Resumo do contato, próximos passos…"
                      className="w-full rounded-btn border border-ink-200 bg-white px-3 py-2 text-[12.5px] text-ink-900 placeholder-ink-400 outline-none focus:border-ink-400"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={addNote}
                        disabled={!note.trim()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <NotebookPen className="h-3 w-3" strokeWidth={2.4} />
                        Salvar nota
                      </button>
                    </div>
                  </Section>
                </div>
              ) : (
                <ul className="space-y-2">
                  {profile.activities.length === 0 && (
                    <EmptyHint>Nenhuma atividade registrada ainda.</EmptyHint>
                  )}
                  {profile.activities.map((act) => (
                    <li
                      key={act.id}
                      className="rounded-card border border-ink-100 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-ink-900">{act.title}</p>
                        <button
                          type="button"
                          onClick={() => removeClientActivity(client.id, act.id)}
                          className="text-ink-400 hover:text-danger-600"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                        </button>
                      </div>
                      {act.body && (
                        <p className="mt-0.5 text-[11.5px] leading-[1.4] text-ink-600">{act.body}</p>
                      )}
                      <p className="mt-1 text-[10.5px] text-ink-400">
                        {act.by} · {formatDateTime(act.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-ink-200 px-5 py-3">
              <Link
                href={`/plataforma/clientes/${client.id}`}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                Ver ficha completa
              </Link>
              <button
                type="button"
                onClick={() => router.push(`/plataforma/simulador?clientId=${client.id}`)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover"
              >
                <Calculator className="h-3 w-3" strokeWidth={2.4} />
                Nova simulação
              </button>
              {simulation?.pdfUrl && (
                <a
                  href={simulation.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-ink-200 px-3 text-[12px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
                >
                  <FileText className="h-3 w-3" strokeWidth={2.4} />
                  Abrir PDF da simulação
                </a>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-danger-200 px-3 text-[11.5px] font-semibold text-danger-700 hover:bg-danger-50"
              >
                <Trash2 className="h-3 w-3" strokeWidth={2.4} />
                Excluir oportunidade
              </button>
            </footer>
          </motion.aside>

          <ConfirmDialog
            open={confirmDelete}
            title="Excluir oportunidade?"
            description={`${client.companyName ?? client.name} será removido do pipeline e da carteira.`}
            confirmLabel="Excluir"
            tone="danger"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              const ok = await removeClient(client.id);
              setConfirmDelete(false);
              if (ok) {
                toast.push({ tone: "success", title: "Oportunidade removida" });
                onClose();
              }
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{title}</p>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <p className="mt-1 text-[16px] font-bold tracking-[-0.01em] text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-[10.5px] text-ink-500">{hint}</p>}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-ink-200 bg-ink-50/50 px-3 py-3 text-[12px] text-ink-500">
      {children}
    </div>
  );
}
