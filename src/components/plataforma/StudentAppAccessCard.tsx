"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, History, Loader2, MessageCircle, Smartphone } from "lucide-react";
import { StudentAppDialog, daysLeft, studentAppMessage, studentAppState } from "./StudentAppDialog";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative, whatsappLink } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore, type StudentAppInvite } from "@/lib/plataforma/store";
import type { Student } from "@/lib/plataforma/types";

// Card do perfil do aluno (lado da equipe): o professor ou a recepção gera o
// link pessoal e envia para o aluno pelo WhatsApp. Enquanto o link vale, ele
// fica aqui para reenviar.
export function StudentAppAccessCard({ student }: { student: Student }) {
  const { profile } = useAccountSession();
  const { inviteStudentApp, loadStudentAppLinks } = usePlataformaStore();
  const [invite, setInvite] = useState<StudentAppInvite | null>(null);
  const [linkCount, setLinkCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const studentId = student.id;
  const refresh = useCallback(async () => {
    const result = await loadStudentAppLinks(studentId);
    setLoading(false);
    if (!result) return;
    setInvite(result.current);
    setLinkCount(result.history.length);
  }, [loadStudentAppLinks, studentId]);

  useEffect(() => {
    setLoading(true);
    setInvite(null);
    setFresh(false);
    void refresh();
  }, [refresh]);

  const state = studentAppState(student);
  const company = profile?.companyName ?? "academia";
  const readOnly = Boolean(profile?.permissions.readOnly);

  // Gera o link e já abre a conversa do aluno no WhatsApp. A aba abre no
  // clique (antes da resposta do servidor) para o navegador não bloquear.
  async function generateAndSend() {
    const tab = student.whatsapp ? window.open("about:blank", "_blank") : null;
    setBusy(true);
    const result = await inviteStudentApp(student.id);
    setBusy(false);
    if (!result) {
      tab?.close();
      return;
    }
    setInvite(result);
    setFresh(true);
    void refresh();
    if (tab && student.whatsapp) {
      tab.opener = null;
      tab.location.href = whatsappLink(student.whatsapp, studentAppMessage(result, student.fullName, company));
    }
  }

  async function copy() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.link).catch(() => null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const left = invite ? daysLeft(invite.expiresAt) : 0;
  const statusText =
    state === "conectado"
      ? `Conectado${student.appConnectedAt ? ` desde ${formatDateTime(student.appConnectedAt)}` : ""}${student.appLastSeenAt ? ` · último acesso ${formatRelative(student.appLastSeenAt)}` : ""}`
      : invite
        ? `Link gerado${invite.createdAt ? ` ${formatRelative(invite.createdAt)}` : ""}${invite.createdByName ? ` por ${invite.createdByName}` : ""} · ainda não entrou`
        : state === "convite_enviado"
          ? "O último link não vale mais. Gere outro para enviar."
          : "Ainda não recebeu o acesso.";

  return (
    <section className="relative overflow-hidden rounded-card border border-brand/25 bg-white">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />
      <div className="flex flex-col gap-4 p-4 pl-5 md:p-5 md:pl-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Smartphone className="h-4 w-4" strokeWidth={2.4} />
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white",
                state === "conectado" ? "bg-success-500" : invite ? "bg-warning-500" : "bg-ink-300",
              )}
            />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink-900">Enviar o app para o aluno</p>
            <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-600">{loading ? "Buscando o link do aluno..." : statusText}</p>
            {!loading && (
              <p className="mt-1 text-[11.5px] leading-[1.5] text-ink-500">
                {state === "conectado"
                  ? "Já usa o app. Um novo link só é preciso se trocar de celular; quem está conectado continua conectado."
                  : invite
                    ? "Reenviar manda o mesmo link. Gerar outro (em Histórico e opções) cancela este."
                    : "O link é pessoal, vale 7 dias e funciona uma vez. Gerar outro cancela o anterior."}
              </p>
            )}
            {invite && (
              <p className="mt-1.5 flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate rounded-[4px] bg-brand/[0.06] px-2 py-1 font-mono text-[11px] text-brand">{invite.link}</span>
                <span className="shrink-0 rounded-full bg-warning-50 px-1.5 py-0.5 text-[10px] font-bold text-warning-800 ring-1 ring-inset ring-warning-200">
                  {left <= 0 ? "Vence hoje" : `Vale ${left} dia${left === 1 ? "" : "s"}`}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-400" strokeWidth={2.4} />
          ) : invite ? (
            <>
              {student.whatsapp && (
                <a
                  href={whatsappLink(student.whatsapp, studentAppMessage(invite, student.fullName, company))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {fresh ? "Enviar pelo WhatsApp" : "Reenviar pelo WhatsApp"}
                </a>
              )}
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success-600" strokeWidth={2.6} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
                {copied ? "Copiado" : "Copiar link"}
              </button>
            </>
          ) : student.status === "ativo" && !readOnly ? (
            <button
              type="button"
              onClick={() => void generateAndSend()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {student.whatsapp ? <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} /> : <Smartphone className="h-3.5 w-3.5" strokeWidth={2.4} />}
              {busy
                ? "Gerando link..."
                : student.whatsapp
                  ? state === "conectado"
                    ? "Enviar novo link pelo WhatsApp"
                    : "Enviar link pelo WhatsApp"
                  : "Gerar link de acesso"}
            </button>
          ) : null}
          {!loading && (linkCount > 0 || state !== "sem_acesso") && (
            <button
              type="button"
              onClick={() => setOptionsOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-btn px-2.5 text-[12.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <History className="h-3.5 w-3.5" strokeWidth={2.2} />
              Histórico e opções
            </button>
          )}
        </div>
      </div>

      <StudentAppDialog
        open={optionsOpen}
        onClose={() => {
          setOptionsOpen(false);
          void refresh();
        }}
        student={student}
      />
    </section>
  );
}
