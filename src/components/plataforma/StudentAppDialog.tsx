"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, ShieldOff, Smartphone } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";
import { firstName, formatDateTime, formatRelative, whatsappLink } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore, type StudentAppInvite } from "@/lib/plataforma/store";
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

// Link pessoal da área do aluno: enviar pelo WhatsApp, gerar outro, remover.
export function StudentAppDialog({ open, onClose, student }: { open: boolean; onClose: () => void; student: Student }) {
  const { profile } = useAccountSession();
  const { inviteStudentApp, revokeStudentApp } = usePlataformaStore();
  const { push } = useToast();
  const [invite, setInvite] = useState<StudentAppInvite | null>(null);
  const [busy, setBusy] = useState<"invite" | "revoke" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  const studentId = student.id;
  useEffect(() => {
    if (!open) return;
    setInvite(null);
    setConfirmRevoke(false);
    setCopied(false);
  }, [open, studentId]);

  const state = studentAppState(student);
  const company = profile?.companyName ?? "academia";
  const name = firstName(student.fullName);
  const verifyText = invite?.verify === "whatsapp" ? "os 4 últimos números do seu WhatsApp" : "a sua data de nascimento";
  const message = invite
    ? `Oi ${name}! A ${company} agora tem a área do aluno no celular: seu treino do dia, a ficha completa, a sua evolução e as suas mensalidades. Entre por este link (vale por 7 dias) e confirme ${verifyText}:\n${invite.link}\n\nDepois é só tocar em "Adicionar à tela inicial" para abrir como um app.`
    : "";

  async function generate() {
    setBusy("invite");
    const result = await inviteStudentApp(student.id);
    setBusy(null);
    if (result) setInvite(result);
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

        {invite ? (
          <div className="space-y-2.5">
            <div className="rounded-btn border border-success-200 bg-success-50/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-success-700">Link pessoal</p>
              <p className="mt-1 break-all font-mono text-[11.5px] leading-[1.5] text-ink-700">{invite.link}</p>
              <p className="mt-1.5 text-[11px] text-ink-500">
                Vale até {formatDateTime(invite.expiresAt)} e só funciona uma vez. No primeiro acesso, {name} confirma{" "}
                {invite.verify === "whatsapp" ? "os 4 últimos números do WhatsApp" : "a data de nascimento"}.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success-600" strokeWidth={2.6} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
                {copied ? "Copiado" : "Copiar link"}
              </button>
              {student.whatsapp ? (
                <a
                  href={whatsappLink(student.whatsapp, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Enviar pelo WhatsApp
                </a>
              ) : (
                <p className="self-center text-[11.5px] text-ink-500">Sem WhatsApp no cadastro: copie e envie por onde preferir.</p>
              )}
            </div>
          </div>
        ) : student.status !== "ativo" ? (
          <p className="rounded-btn bg-warning-50 px-3 py-2 text-[12px] leading-[1.5] text-warning-800 ring-1 ring-inset ring-warning-200">
            Aluno inativo. Reative o cadastro para liberar a área do aluno.
          </p>
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
