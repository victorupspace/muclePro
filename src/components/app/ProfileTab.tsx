"use client";

import { useState } from "react";
import { HeartPulse, Send, Wallet } from "lucide-react";
import { Card } from "./TodayTab";
import { useToast } from "@/components/plataforma/Toast";
import { cn } from "@/lib/cn";
import { reportHealth, type AppHome } from "@/lib/app/student-app";
import { HEALTH_CONDITION_LABEL, daysFromToday, formatCurrencyDetailed, formatDateValue } from "@/lib/plataforma/format";

export function ProfileTab({ home }: { home: AppHome }) {
  const { push } = useToast();
  const s = home.student;
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const hasHealth = s.healthConditions.length > 0 || s.healthRestrictions || s.medicalNotes;

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await reportHealth(message.trim());
      setMessage("");
      push({ tone: "success", title: "Aviso enviado", description: "Seu professor recebeu e vai revisar o seu treino." });
    } catch (err) {
      push({ tone: "warn", title: "Não foi possível enviar", description: err instanceof Error ? err.message : undefined });
    }
    setSending(false);
  }

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-[17px] font-bold text-ink-900">{s.fullName}</p>
        <p className="text-[13px] text-ink-500">
          {home.account.companyName}
          {s.planName ? ` · plano ${s.planName}` : ""}
        </p>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-warning-700" strokeWidth={2.4} />
          <p className="text-[15px] font-bold text-ink-900">Sua saúde</p>
        </div>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-500">
          É o que a academia registrou e o professor considera ao montar o seu treino.
        </p>
        {hasHealth ? (
          <div className="mt-3 space-y-2.5">
            {s.healthConditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.healthConditions.map((c) => (
                  <span key={c} className="rounded-full bg-warning-50 px-2.5 py-1 text-[12.5px] font-semibold text-warning-800 ring-1 ring-inset ring-warning-200">
                    {HEALTH_CONDITION_LABEL[c]}
                  </span>
                ))}
              </div>
            )}
            {s.healthRestrictions && (
              <p className="text-[14px] leading-[1.55] text-ink-800">
                <span className="font-semibold">Restrições: </span>
                {s.healthRestrictions}
              </p>
            )}
            {s.medicalNotes && <p className="text-[14px] leading-[1.55] text-ink-700">{s.medicalNotes}</p>}
          </div>
        ) : (
          <p className="mt-3 text-[14px] text-ink-600">Nenhuma condição registrada.</p>
        )}
        <div className="mt-4 border-t border-ink-100 pt-3">
          <p className="text-[14px] font-bold text-ink-900">Algo mudou? Avise seu professor</p>
          <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ink-500">Uma lesão, dor nova, cirurgia, gravidez ou remédio novo. O aviso chega na hora para ele.</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Ex.: torci o tornozelo no futebol no fim de semana"
            className="mt-2 w-full rounded-btn border border-ink-200 px-3 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !message.trim()}
            className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-card bg-brand text-[15px] font-bold text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" strokeWidth={2.4} />
            {sending ? "Enviando..." : "Enviar aviso"}
          </button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
          <Wallet className="h-4 w-4 text-ink-500" strokeWidth={2.4} />
          <p className="text-[15px] font-bold text-ink-900">Mensalidades</p>
        </div>
        {home.payments.length === 0 ? (
          <p className="px-4 py-4 text-[14px] text-ink-500">Nenhuma cobrança registrada.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {home.payments.map((p) => {
              const late = p.status === "pendente" && daysFromToday(p.dueAt) < 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink-900">{p.reference ?? `Vencimento ${formatDateValue(p.dueAt)}`}</span>
                    <span className="text-[12px] text-ink-500">
                      {p.status === "pago" && p.paidAt ? `Pago em ${formatDateValue(p.paidAt.slice(0, 10))}` : `Vence ${formatDateValue(p.dueAt)}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[14px] font-bold tabular-nums text-ink-900">{formatCurrencyDetailed(p.amount)}</span>
                    <span
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-[0.08em]",
                        p.status === "pago" ? "text-success-700" : late ? "text-danger-700" : "text-warning-800",
                      )}
                    >
                      {p.status === "pago" ? "Pago" : late ? "Em atraso" : "A pagar"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-ink-100 px-4 py-3 text-[12px] text-ink-500">Para pagar ou tirar dúvidas, fale com a recepção.</p>
      </Card>
    </div>
  );
}
