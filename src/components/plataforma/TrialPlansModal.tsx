"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Mail, Sparkles } from "lucide-react";
import { Modal } from "./Modal";
import { PlanPicker } from "./PlanPicker";
import { prefersReducedMotion } from "./motion";
import { cn } from "@/lib/cn";
import { daysFromToday, firstName, formatDateValue, toDateValue, todayValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";

const TRIAL_DAYS = 14;
const seenKey = (accountId: string) => `musclepro:trial-plans:${accountId}`;
const welcomedKey = (accountId: string) => `musclepro:welcomed:${accountId}`;

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: o modal pode voltar nesta mesma data */
  }
}

// Ao entrar (uma vez por dia), o dono vê quanto falta do teste grátis e os
// planos para escolher. Some quando a assinatura já está paga.
export function TrialPlansModal() {
  const { profile } = useAccountSession();
  const [open, setOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const billing = profile?.billing;
  const accountId = profile?.id;
  const hasPaid = Boolean(billing?.invoices.some((i) => i.status === "paga"));
  const trialEnd = billing?.trialEndsAt ? toDateValue(new Date(billing.trialEndsAt)) : undefined;
  const eligible = Boolean(profile?.isOwner && billing && !hasPaid && billing.status !== "cancelado" && trialEnd && (billing.status === "trial" || !billing.planName));

  useEffect(() => {
    if (!eligible || !accountId) return;
    const today = todayValue();
    if (readStorage(seenKey(accountId)) === today) return;
    setFirstVisit(!readStorage(welcomedKey(accountId)));
    setOpen(true);
    writeStorage(seenKey(accountId), today);
    writeStorage(welcomedKey(accountId), "1");
  }, [eligible, accountId]);

  const daysLeft = trialEnd ? daysFromToday(trialEnd) : 0;
  const used = Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - daysLeft));
  const ended = daysLeft < 0;

  useGSAP(
    () => {
      if (!open || !barRef.current || prefersReducedMotion()) return;
      gsap.from(barRef.current, { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power3.out", delay: 0.2 });
    },
    { dependencies: [open], revertOnUpdate: true },
  );

  if (!eligible || !profile) return null;

  const title = firstVisit
    ? `Bem-vindo ao musclePro, ${firstName(profile.fullName)}!`
    : ended
      ? "Seu teste grátis terminou"
      : daysLeft === 0
        ? "Seu teste grátis termina hoje"
        : `Faltam ${daysLeft} dia${daysLeft === 1 ? "" : "s"} de teste grátis`;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="xl"
      title={title}
      description={
        firstVisit
          ? `Sua conta foi aprovada e está em teste grátis por ${TRIAL_DAYS} dias, com tudo liberado. Escolha seu plano quando quiser para continuar sem interrupção.`
          : "Escolha seu plano para continuar usando o musclePro sem interrupção quando o teste acabar."
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/plataforma/fale-conosco"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-ink-500 hover:text-ink-800"
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
            Dúvidas? Fale com a gente
          </Link>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Link
              href="/plataforma/assinatura"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50 sm:h-10"
            >
              Ver assinatura
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover sm:h-10"
            >
              {billing?.planName ? "Continuar" : "Decidir depois"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className={cn("rounded-card p-4", ended ? "bg-danger-50 ring-1 ring-inset ring-danger-200" : "bg-brand/[0.05] ring-1 ring-inset ring-brand/15")}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-900">
              <Sparkles className={cn("h-4 w-4", ended ? "text-danger-600" : "text-brand")} strokeWidth={2.2} />
              {ended
                ? `Teste encerrado em ${formatDateValue(trialEnd)}`
                : `Teste grátis até ${formatDateValue(trialEnd)}`}
            </p>
            <p className={cn("text-[12.5px] font-semibold tabular-nums", ended ? "text-danger-700" : "text-ink-600")}>
              {ended ? "Escolha um plano para continuar" : `${daysLeft === 0 ? "último dia" : `${daysLeft} de ${TRIAL_DAYS} dias restantes`}`}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div ref={barRef} className={cn("h-full rounded-full", ended || daysLeft <= 3 ? "bg-danger-500" : "bg-brand")} style={{ width: `${(used / TRIAL_DAYS) * 100}%` }} />
          </div>
          {billing?.planName && (
            <p className="mt-3 text-[12.5px] leading-[1.5] text-ink-700">
              Plano escolhido: <span className="font-semibold">{billing.planName}</span>. A primeira fatura vence em {formatDateValue(trialEnd)}, no fim do
              teste. Por enquanto, a equipe musclePro combina o pagamento com você.
            </p>
          )}
        </div>
        <PlanPicker />
        <p className="text-[11.5px] leading-[1.5] text-ink-500">
          Ao escolher, nada é cobrado agora: a primeira fatura vence no fim do teste grátis. Sem pagamento após a carência, o sistema fica em modo
          leitura, sem perder nenhum dado.
        </p>
      </div>
    </Modal>
  );
}
