"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, History, Link2, Loader2, MessageCircle, RefreshCw, ShieldOff, Smartphone } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";
import { firstName, formatDateTime, formatRelative, whatsappLink } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import {
  usePlataformaStore,
  type StudentAppInvite,
  type StudentAppLinkEntry,
  type StudentAppLinkStatus,
} from "@/lib/plataforma/store";
import type { Student } from "@/lib/plataforma/types";

export type StudentAppState = "sem_acesso" | "convite_enviado" | "conectado";

export function studentAppState(s: Student): StudentAppState {
  if (s.hasAppLogin) return "conectado";
  if (s.appInvitedAt) return "convite_enviado";
  return "sem_acesso";
}

export const STUDENT_APP_LABEL: Record<StudentAppState, string> = {
  sem_acesso: "Sem acesso",
  convite_enviado: "Link enviado",
  conectado: "Conectado",
};

const LINK_STATUS: Record<StudentAppLinkStatus, { label: string; tone: string }> = {
  ativo: { label: "Ativo", tone: "bg-success-50 text-success-700 ring-success-200" },
  usado: { label: "Usado", tone: "bg-info-50 text-info-700 ring-info-200" },
  substituido: { label: "Substituído", tone: "bg-ink-50 text-ink-600 ring-ink-200" },
  expirado: { label: "Expirado", tone: "bg-warning-50 text-warning-800 ring-warning-200" },
  bloqueado: { label: "Bloqueado", tone: "bg-danger-50 text-danger-700 ring-danger-200" },
};

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Link pessoal da área do aluno: enviar pelo WhatsApp, reenviar o link
// vigente, gerar outro e ver o histórico.
export function StudentAppDialog({ open, onClose, student }: { open: boolean; onClose: () => void; student: Student }) {
  const { profile } = useAccountSession();
  const { inviteStudentApp, loadStudentAppLinks, revokeStudentApp } = usePlataformaStore();
  const { push } = useToast();
  const [invite, setInvite] = useState<StudentAppInvite | null>(null);
  const [history, setHistory] = useState<StudentAppLinkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"invite" | "revoke" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fresh, setFresh] = useState(false);

  const studentId = student.id;
  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await loadStudentAppLinks(studentId);
    setLoading(false);
    if (!result) return;
    setInvite(result.current);
    setHistory(result.history);
  }, [loadStudentAppLinks, studentId]);

  useEffect(() => {
    if (!open) return;
    setInvite(null);
    setHistory([]);
    setConfirmRevoke(false);
    setConfirmNew(false);
    setCopied(false);
    setFresh(false);
    void refresh();
  }, [open, refresh]);

  const state = studentAppState(student);
  const company = profile?.companyName ?? "academia";
  const name = firstName(student.fullName);
  const verifyText = invite?.verify === "whatsapp" ? "os 4 últimos números do seu WhatsApp" : "a sua data de nascimento";
  const message = invite
    ? [
        `Oi ${name}! A ${company} agora tem a área do aluno no celular: seu treino do dia, a ficha completa, a sua evolução e as suas mensalidades.`,
        "",
        `Seu link pessoal (vale até ${shortDate(invite.expiresAt)} e funciona uma vez):`,
        invite.link,
        "",
        `No primeiro acesso, confirme ${verifyText}. Depois toque em "Adicionar à tela inicial" para abrir como um app.`,
      ].join("\n")
    : "";

  async function generate() {
    setBusy("invite");
    const result = await inviteStudentApp(student.id);
    setBusy(null);
    setConfirmNew(false);
    if (!result) return;
    setInvite(result);
    setFresh(true);
    void refresh();
  }

  async function revoke() {
    setBusy("revoke");
    const ok = await revokeStudentApp(student.id);
    setBusy(null);
    if (ok) {
      push({ tone: "info", title: "Acesso removido", description: `${name} saiu da área do aluno em todos os aparelhos.` });
      onClose();
    }
  }

  async function copy() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.link).catch(() => null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const left = invite ? daysLeft(invite.expiresAt) : 0;
  const pastLinks = history.filter((h) => h.status !== "ativo" || !invite);

  return (
    <Modal open={open} onClose={onClose} title="Área do aluno" description={`${student.fullName} · treino, evolução e mensalidades no celular`}>
      <div className="space-y-4">
        <p
          className={cn(
            "rounded-btn px-3 py-2 text-[12px] font-semibold ring-1 ring-inset",
            state === "conectado"
              ? "bg-success-50 text-success-700 ring-success-200"
              : state === "convite_enviado"
                ? "bg-warning-50 text-warning-800 ring-warning-200"
                : "bg-ink-50 text-ink-600 ring-ink-200",
          )}
        >
          {state === "conectado"
            ? `Conectado${student.appConnectedAt ? ` desde ${formatDateTime(student.appConnectedAt)}` : ""}${student.appLastSeenAt ? ` · último acesso ${formatRelative(student.appLastSeenAt)}` : ""}`
            : state === "convite_enviado"
              ? `Link gerado ${student.appInvitedAt ? formatRelative(student.appInvitedAt) : ""}; o aluno ainda não entrou.`
              : "O aluno ainda não tem acesso à área do aluno."}
        </p>

        {loading && !invite ? (
          <div className="flex h-28 items-center justify-center gap-2 rounded-panel border border-dashed border-ink-200 text-[12px] font-semibold text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
            Buscando o link do aluno
          </div>
        ) : invite ? (
          <div className="relative overflow-hidden rounded-panel bg-brand p-4 text-white shadow-[0_24px_50px_-28px_rgba(1,33,92,0.9)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: "radial-gradient(circle at 100% 0%, rgb(var(--color-brand-light)/0.28), transparent 55%)" }}
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-light">
                  <Link2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Link pessoal ativo
                </p>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-bold text-white ring-1 ring-inset ring-white/20">
                  {left <= 0 ? "Vence hoje" : `Faltam ${left} dia${left === 1 ? "" : "s"}`}
                </span>
              </div>

              <p className="mt-2.5 break-all rounded-btn bg-white/10 px-3 py-2.5 font-mono text-[11.5px] leading-[1.5] text-white ring-1 ring-inset ring-white/15">
                {invite.link}
              </p>
              <p className="mt-2 text-[11.5px] leading-[1.5] text-white/70">
                Vale até {formatDateTime(invite.expiresAt)} e funciona uma vez.
                {invite.createdAt && ` Gerado ${formatRelative(invite.createdAt)}${invite.createdByName ? ` por ${invite.createdByName}` : ""}.`}{" "}
                No primeiro acesso, {name} confirma {invite.verify === "whatsapp" ? "os 4 últimos números do WhatsApp" : "a data de nascimento"}.
              </p>

              <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                {student.whatsapp ? (
                  <a
                    href={whatsappLink(student.whatsapp, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-white px-3 text-[12.5px] font-bold text-brand transition-colors hover:bg-white/90"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {fresh ? "Enviar pelo WhatsApp" : "Reenviar pelo WhatsApp"}
                  </a>
                ) : (
                  <p className="self-center text-[11.5px] text-white/70">Sem WhatsApp no cadastro: copie e envie por onde preferir.</p>
                )}
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-white/10 px-3 text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
                >
                  {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
                  {copied ? "Copiado" : "Copiar link"}
                </button>
              </div>
            </div>
          </div>
        ) : student.status !== "ativo" ? (
          <p className="rounded-btn bg-warning-50 px-3 py-2 text-[12px] leading-[1.5] text-warning-800 ring-1 ring-inset ring-warning-200">
            Aluno inativo. Reative o cadastro para liberar a área do aluno.
          </p>
        ) : null}

        {!loading && student.status === "ativo" && (
          <div>
            {invite ? (
              confirmNew ? (
                <div className="flex flex-col gap-2 rounded-btn bg-warning-50 p-3 ring-1 ring-inset ring-warning-200 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[12px] leading-[1.5] text-warning-800">O link atual para de funcionar. Use só se {name} perdeu o link ou trocou de celular.</p>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => setConfirmNew(false)} className="inline-flex h-8 items-center rounded-btn px-2.5 text-[12px] font-semibold text-ink-600 hover:bg-white">
                      Manter
                    </button>
                    <button
                      type="button"
                      onClick={() => void generate()}
                      disabled={busy !== null}
                      className="inline-flex h-8 items-center rounded-btn bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      {busy === "invite" ? "Gerando..." : "Gerar novo link"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmNew(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:text-ink-900"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Gerar novo link
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => void generate()}
                disabled={busy !== null}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                <Smartphone className="h-3.5 w-3.5" strokeWidth={2.4} />
                {busy === "invite" ? "Gerando link..." : state === "sem_acesso" ? "Gerar link de acesso" : "Gerar novo link (outro celular)"}
              </button>
            )}
          </div>
        )}

        {pastLinks.length > 0 && (
          <div className="border-t border-ink-100 pt-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
              <History className="h-3.5 w-3.5" strokeWidth={2.2} />
              Histórico de links
            </p>
            <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-btn ring-1 ring-inset ring-ink-200">
              {pastLinks.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink-900">
                      Gerado em {formatDateTime(h.createdAt)}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {h.createdByName ? `Por ${h.createdByName}` : "Pela equipe"}
                      {h.status === "usado" && h.closedAt ? ` · usado ${formatRelative(h.closedAt)}` : ""}
                      {h.status === "substituido" && h.closedAt ? ` · substituído ${formatRelative(h.closedAt)}` : ""}
                      {h.status === "expirado" ? ` · venceu em ${shortDate(h.expiresAt)}` : ""}
                      {h.status === "bloqueado" ? " · muitas tentativas erradas" : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ring-inset", LINK_STATUS[h.status].tone)}>
                    {LINK_STATUS[h.status].label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state !== "sem_acesso" && (
          <div className="border-t border-ink-100 pt-3">
            {confirmRevoke ? (
              <div className="flex flex-col gap-2 rounded-btn bg-danger-50 p-3 ring-1 ring-inset ring-danger-200 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-[1.5] text-danger-700">{name} sai da área do aluno em todos os aparelhos. O cadastro continua.</p>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => setConfirmRevoke(false)} className="inline-flex h-8 items-center rounded-btn px-2.5 text-[12px] font-semibold text-ink-600 hover:bg-white">
                    Manter
                  </button>
                  <button
                    type="button"
                    onClick={() => void revoke()}
                    disabled={busy !== null}
                    className="inline-flex h-8 items-center rounded-btn bg-danger-600 px-3 text-[12px] font-semibold text-white hover:bg-danger-700 disabled:opacity-60"
                  >
                    {busy === "revoke" ? "Removendo..." : "Remover acesso"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRevoke(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-danger-600 transition-colors hover:text-danger-700"
              >
                <ShieldOff className="h-3.5 w-3.5" strokeWidth={2.2} />
                Remover acesso à área do aluno
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
