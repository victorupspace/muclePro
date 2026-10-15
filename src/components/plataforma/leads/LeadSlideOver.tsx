"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  GraduationCap,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { useToast } from "../Toast";
import { textareaClass } from "../FormKit";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  LEAD_LOST_REASON_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STAGE_LABEL,
  formatDateTime,
  formatRelative,
  whatsappLink,
} from "@/lib/plataforma/format";
import { LEAD_STAGE_DOT, OPEN_STAGES, trialLabel } from "@/lib/plataforma/leads";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Lead, LeadEvent, LeadStage } from "@/lib/plataforma/types";

type Props = {
  lead: Lead | null;
  canEdit: boolean;
  canDelete: boolean;
  companyName: string;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onMove: (lead: Lead, stage: LeadStage) => void;
  onDelete: (lead: Lead) => void;
};

// Ficha do interessado: contato, etapa, próximos passos e histórico.
export function LeadSlideOver({ lead, canEdit, canDelete, companyName, onClose, onEdit, onMove, onDelete }: Props) {
  const { loadLeadEvents, addLeadEvent, staffById, unitById, studentById } = usePlataformaStore();
  const { push } = useToast();
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState<"nota" | "contato">("contato");
  const [saving, setSaving] = useState(false);

  const leadId = lead?.id;
  const stageKey = lead ? `${lead.stage}-${lead.stageChangedAt}` : "";

  const reload = useCallback(async () => {
    if (!leadId) return;
    setLoadingEvents(true);
    setEvents(await loadLeadEvents(leadId));
    setLoadingEvents(false);
  }, [leadId, loadLeadEvents]);

  // Recarrega o histórico ao abrir e quando a etapa muda (o banco registra a mudança).
  useEffect(() => {
    void reload();
  }, [reload, stageKey]);

  useEffect(() => {
    setNote("");
  }, [leadId]);

  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !note.trim()) return;
    setSaving(true);
    const event = await addLeadEvent(lead.id, noteKind, note.trim());
    setSaving(false);
    if (event) {
      setEvents((prev) => [event, ...prev]);
      setNote("");
      push({ tone: "success", title: noteKind === "contato" ? "Contato registrado" : "Nota salva" });
    }
  }

  const owner = staffById(lead?.ownerStaffId);
  const unit = unitById(lead?.unitId);
  const student = lead?.studentId ? studentById(lead.studentId) : undefined;
  const trial = trialLabel(lead?.trialAt);
  const isOpen = lead ? OPEN_STAGES.includes(lead.stage) : false;

  return (
    <AnimatePresence>
      {lead && (
        <>
          <motion.div
            key="lead-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink-900/35 backdrop-blur-[2px]"
          />
          <motion.aside
            key="lead-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Interessado ${lead.fullName}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: EASE }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-white shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.35)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
                  <span className={cn("h-1.5 w-1.5 rounded-full", LEAD_STAGE_DOT[lead.stage])} />
                  {LEAD_STAGE_LABEL[lead.stage]}
                  <span className="text-ink-300">·</span>
                  <span className="normal-case tracking-normal">desde {formatRelative(lead.stageChangedAt).replace("há ", "")}</span>
                </div>
                <h2 className="mt-1 truncate text-[19px] font-bold tracking-[-0.015em] text-ink-900">{lead.fullName}</h2>
                <p className="mt-0.5 text-[12px] text-ink-500">
                  {LEAD_SOURCE_LABEL[lead.source]}
                  {unit ? ` · ${unit.name}` : ""}
                  {` · ${owner ? `com ${owner.fullName}` : "sem responsável"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Etapas */}
              <div>
                <ol className="grid grid-cols-4 gap-1">
                  {OPEN_STAGES.map((stage) => {
                    const reached =
                      lead.stage === "matriculado" || OPEN_STAGES.indexOf(stage) <= OPEN_STAGES.indexOf(lead.stage);
                    return (
                      <li key={stage}>
                        <button
                          type="button"
                          disabled={!canEdit || stage === lead.stage}
                          onClick={() => onMove(lead, stage)}
                          className="group w-full text-left disabled:cursor-default"
                        >
                          <span className={cn("block h-1.5 rounded-full transition-colors", reached && lead.stage !== "perdido" ? "bg-brand" : "bg-ink-200", canEdit && stage !== lead.stage && "group-hover:bg-brand-light")} />
                          <span className={cn("mt-1 block text-[10.5px] font-semibold leading-tight", stage === lead.stage ? "text-ink-900" : "text-ink-500")}>
                            {LEAD_STAGE_LABEL[stage]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {lead.stage === "perdido" && (
                <div className="rounded-btn border border-ink-200 bg-ink-50 px-3 py-2.5 text-[12.5px]">
                  <p className="font-semibold text-ink-900">
                    Perdido: {lead.lostReason ? LEAD_LOST_REASON_LABEL[lead.lostReason] : "sem motivo"}
                  </p>
                  {lead.lostNotes && <p className="mt-0.5 text-ink-600">{lead.lostNotes}</p>}
                </div>
              )}

              {lead.stage === "matriculado" && (
                <div className="rounded-btn border border-success-200 bg-success-50/60 px-3 py-2.5 text-[12.5px]">
                  <p className="font-semibold text-success-700">Matriculado{lead.convertedAt ? ` em ${formatDateTime(lead.convertedAt)}` : ""}</p>
                  {student && (
                    <Link href={`/plataforma/alunos/${student.id}`} className="mt-1 inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                      Abrir ficha de {student.fullName}
                      <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
                    </Link>
                  )}
                </div>
              )}

              {/* Ações */}
              {canEdit && (
                <div className="grid grid-cols-2 gap-2">
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => onMove(lead, "matriculado")}
                      className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
                    >
                      <GraduationCap className="h-4 w-4" strokeWidth={2.2} />
                      Matricular como aluno
                    </button>
                  )}
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => onMove(lead, "agendada")}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-ink-200 px-3 text-[12px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                    >
                      <CalendarClock className="h-3.5 w-3.5" strokeWidth={2.2} />
                      {lead.trialAt ? "Remarcar aula" : "Marcar aula"}
                    </button>
                  )}
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => onMove(lead, "perdido")}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-ink-200 px-3 text-[12px] font-semibold text-ink-700 transition-colors hover:border-danger-300 hover:bg-danger-50 hover:text-danger-700"
                    >
                      <UserX className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Não fechou
                    </button>
                  )}
                  {lead.stage === "perdido" && (
                    <button
                      type="button"
                      onClick={() => onMove(lead, "contato")}
                      className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-btn border border-ink-200 px-3 text-[12px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Voltar ao funil
                    </button>
                  )}
                </div>
              )}

              {/* Contato */}
              <dl className="divide-y divide-ink-100 rounded-btn border border-ink-200 text-[12.5px]">
                <InfoLine icon={<Phone className="h-3.5 w-3.5" />} label="WhatsApp">
                  {lead.whatsapp ? (
                    <a
                      href={whatsappLink(lead.whatsapp, `Oi ${lead.fullName.split(" ")[0]}! Aqui é da ${companyName}. Tudo bem?`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-success-700 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
                      {lead.whatsapp}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoLine>
                <InfoLine icon={<Mail className="h-3.5 w-3.5" />} label="E-mail">
                  {lead.email ?? "—"}
                </InfoLine>
                <InfoLine icon={<CalendarClock className="h-3.5 w-3.5" />} label="Aula experimental">
                  {trial ? trial.text : "Não marcada"}
                </InfoLine>
                {lead.interest && <InfoLine label="Interesse">{lead.interest}</InfoLine>}
                {lead.notes && <InfoLine label="Observações">{lead.notes}</InfoLine>}
              </dl>

              {/* Histórico */}
              <section>
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Histórico</h3>
                {canEdit && (
                  <form onSubmit={saveNote} className="mt-2 space-y-2">
                    <div className="inline-flex rounded-btn border border-ink-200 p-0.5 text-[11.5px] font-semibold">
                      {(["contato", "nota"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setNoteKind(k)}
                          className={cn(
                            "rounded-[4px] px-2.5 py-1 transition-colors",
                            noteKind === k ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100",
                          )}
                        >
                          {k === "contato" ? "Contato feito" : "Nota"}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder={noteKind === "contato" ? "Ex.: liguei, pediu para retornar na segunda" : "Ex.: prefere treinar às 6h"}
                      className={textareaClass}
                    />
                    <button
                      type="submit"
                      disabled={saving || !note.trim()}
                      className="inline-flex h-8 items-center rounded-btn bg-ink-900 px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
                    >
                      {saving ? "Salvando..." : "Registrar"}
                    </button>
                  </form>
                )}
                <ol className="mt-3 space-y-3">
                  {loadingEvents && events.length === 0 ? (
                    <li className="h-10 animate-pulse rounded-btn bg-ink-50" />
                  ) : (
                    events.map((ev) => (
                      <li key={ev.id} className="flex gap-2.5">
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            ev.kind === "etapa" ? "bg-brand" : ev.kind === "contato" ? "bg-success-500" : "bg-ink-300",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-[12.5px] leading-[1.5] text-ink-800">
                            {ev.kind === "contato" && <span className="font-semibold">Contato: </span>}
                            {ev.body}
                          </p>
                          <p className="text-[10.5px] text-ink-500">
                            {ev.authorName ?? "Sistema"} · {formatDateTime(ev.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))
                  )}
                </ol>
              </section>
            </div>

            {(canEdit || canDelete) && (
              <footer className="flex items-center justify-between gap-2 border-t border-ink-200 px-5 py-3">
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(lead)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-btn px-2.5 text-[12px] font-semibold text-danger-600 transition-colors hover:bg-danger-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Excluir
                  </button>
                ) : (
                  <span />
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(lead)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ink-200 px-3 text-[12px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Editar dados
                  </button>
                )}
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoLine({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <dt className="flex w-[118px] shrink-0 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-500">
        {icon && <span className="text-ink-400">{icon}</span>}
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-ink-900">{children}</dd>
    </div>
  );
}
