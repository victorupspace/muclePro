"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, KeyRound, Link2, MessageCircle, ShieldOff } from "lucide-react";
import { Field, inputClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { STAFF_ROLE_LABEL, firstName, formatDateTime, whatsappLink } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { staffAccessState, usePlataformaStore, type StaffInvite } from "@/lib/plataforma/store";
import type { Staff } from "@/lib/plataforma/types";

// Convite, novo link e remoção do acesso de um funcionário.
export function StaffAccessDialog({ open, onClose, member }: { open: boolean; onClose: () => void; member?: Staff }) {
  const { profile } = useAccountSession();
  const { unitById, inviteStaffAccess, revokeStaffAccess } = usePlataformaStore();
  const { push } = useToast();

  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState<StaffInvite | null>(null);
  const [busy, setBusy] = useState<"invite" | "revoke" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reinicia só ao abrir ou trocar de funcionário: o cadastro é recarregado
  // depois do convite e isso não pode apagar o link recém-gerado.
  const memberId = member?.id;
  useEffect(() => {
    if (!open) return;
    setEmail(member?.email ?? "");
    setInvite(null);
    setConfirmRevoke(false);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, memberId]);

  if (!member) return null;

  const state = staffAccessState(member);
  const unit = unitById(member.unitId);
  const company = profile?.companyName ?? "a academia";

  async function generate() {
    if (!member) return;
    setBusy("invite");
    const result = await inviteStaffAccess(member.id, email.trim());
    setBusy(null);
    if (result) {
      setInvite(result);
      push({ tone: "success", title: "Link de acesso gerado", description: "Envie para o funcionário. Ele vale por 12 horas." });
    }
  }

  async function revoke() {
    if (!member) return;
    setBusy("revoke");
    const ok = await revokeStaffAccess(member.id);
    setBusy(null);
    if (ok) {
      push({ tone: "info", title: "Acesso removido", description: `${member.fullName} não entra mais no sistema.` });
      onClose();
    }
  }

  async function copy() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.setupLink).catch(() => null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const message = invite
    ? `Oi ${firstName(member.fullName)}! Seu acesso ao sistema da ${company} está pronto. Crie sua senha por este link (vale por 12 horas): ${invite.setupLink}\n\nDepois é só entrar com o e-mail ${invite.email}.`
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={state === "sem_acesso" ? "Dar acesso ao sistema" : "Acesso ao sistema"}
      description={`${member.fullName} · ${member.role === "outro" && member.roleLabel ? member.roleLabel : STAFF_ROLE_LABEL[member.role]}${unit ? ` · ${unit.name}` : ""}`}
    >
      <div className="space-y-4">
        <StatusLine state={state} member={member} />

        {member.role === "gestao" ? (
          <p className="rounded-btn bg-brand/[0.05] px-3 py-2 text-[12px] leading-[1.5] text-ink-700 ring-1 ring-inset ring-brand/20">
            Perfil <span className="font-semibold">Gestão</span>: terá acesso completo, inclusive equipe, planos e unidades.
          </p>
        ) : (
          <div className="rounded-btn border border-ink-200 px-3 py-2.5 text-[12px] leading-[1.6] text-ink-600">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">O que poderá fazer</p>
            <ul className="mt-1.5 space-y-0.5">
              <Perm on>Ver alunos, planos, equipe e tarefas{unit ? ` (alunos da unidade ${unit.name})` : ""}</Perm>
              <Perm on={member.canRegisterStudents}>Cadastrar e editar alunos</Perm>
              <Perm on={member.canSendPaymentLinks}>Cobrar, registrar pagamentos e trocar planos</Perm>
              <Perm on={false}>Editar equipe, planos, unidades e dados da empresa</Perm>
            </ul>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {invite ? (
            <motion.div
              key="link"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="space-y-2.5"
            >
              <div className="rounded-btn border border-success-200 bg-success-50/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-success-700">Link de acesso</p>
                <p className="mt-1 break-all font-mono text-[11.5px] leading-[1.5] text-ink-700">{invite.setupLink}</p>
                <p className="mt-1.5 text-[11px] text-ink-500">
                  Válido até {formatDateTime(invite.expiresAt)}. Gerar outro link invalida este.
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
                {member.phone ? (
                  <a
                    href={whatsappLink(member.phone, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Enviar por WhatsApp
                  </a>
                ) : (
                  <a
                    href={`mailto:${invite.email}?subject=${encodeURIComponent(`Seu acesso ao sistema da ${company}`)}&body=${encodeURIComponent(message)}`}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Enviar por e-mail
                  </a>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="space-y-3"
            >
              {!member.active ? (
                <p className="rounded-btn bg-warning-50 px-3 py-2 text-[12px] leading-[1.5] text-warning-800 ring-1 ring-inset ring-warning-200">
                  Este funcionário está inativo. Reative o cadastro para liberar o acesso.
                </p>
              ) : (
                <>
                  <Field
                    label="E-mail de login"
                    required
                    hint={
                      state === "sem_acesso"
                        ? "O funcionário entra com este e-mail e uma senha que ele mesmo cria pelo link."
                        : "Se mudar o e-mail, o login antigo deixa de funcionar."
                    }
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@suaacademia.com.br"
                      className={inputClass}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => void generate()}
                    disabled={busy !== null || !email.trim()}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {busy === "invite"
                      ? "Gerando link..."
                      : state === "sem_acesso"
                        ? "Gerar link de acesso"
                        : "Gerar novo link de senha"}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {state !== "sem_acesso" && (
          <div className="border-t border-ink-100 pt-3">
            {confirmRevoke ? (
              <div className="flex flex-col gap-2 rounded-btn bg-danger-50 p-3 ring-1 ring-inset ring-danger-200 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-[1.5] text-danger-700">
                  {firstName(member.fullName)} perde o acesso na hora. O cadastro na equipe continua.
                </p>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(false)}
                    className="inline-flex h-8 items-center rounded-btn px-2.5 text-[12px] font-semibold text-ink-600 hover:bg-white"
                  >
                    Manter acesso
                  </button>
                  <button
                    type="button"
                    onClick={() => void revoke()}
                    disabled={busy !== null}
                    className="inline-flex h-8 items-center gap-1 rounded-btn bg-danger-600 px-3 text-[12px] font-semibold text-white hover:bg-danger-700 disabled:opacity-60"
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
                Remover acesso ao sistema
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatusLine({ state, member }: { state: ReturnType<typeof staffAccessState>; member: Staff }) {
  const tone =
    state === "com_acesso"
      ? "bg-success-50 text-success-700 ring-success-200"
      : state === "convite_pendente"
        ? "bg-warning-50 text-warning-800 ring-warning-200"
        : "bg-ink-50 text-ink-600 ring-ink-200";
  const text =
    state === "com_acesso"
      ? `Acesso ativo${member.email ? ` · entra com ${member.email}` : ""}`
      : state === "convite_pendente"
        ? `Convite enviado${member.accessInvitedAt ? ` em ${formatDateTime(member.accessInvitedAt)}` : ""}, senha ainda não criada`
        : "Ainda não tem acesso ao sistema";
  return <p className={cn("rounded-btn px-3 py-2 text-[12px] font-semibold ring-1 ring-inset", tone)}>{text}</p>;
}

function Perm({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-start gap-1.5", on ? "text-ink-800" : "text-ink-400 line-through")}>
      <span className={cn("mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full", on ? "bg-brand text-white" : "bg-ink-100")}>
        {on && <Check className="h-2.5 w-2.5" strokeWidth={3.2} />}
      </span>
      {children}
    </li>
  );
}
