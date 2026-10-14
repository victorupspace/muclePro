"use client";

import { useState } from "react";
import { Mail, MessageCircle, PhoneCall, Users, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/plataforma/Modal";
import { cn } from "@/lib/cn";

export type ContactChannel = "ligacao" | "whatsapp" | "email" | "reuniao";

const CHANNELS: { value: ContactChannel; label: string; icon: LucideIcon }[] = [
  { value: "ligacao", label: "Ligação", icon: PhoneCall },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "reuniao", label: "Reunião", icon: Users },
];

type Props = {
  open: boolean;
  clientName?: string;
  onClose: () => void;
  onSubmit: (data: { channel: ContactChannel; note: string; followUpDate?: string }) => void;
};

export function RegisterContactModal({ open, clientName, onClose, onSubmit }: Props) {
  const [channel, setChannel] = useState<ContactChannel>("ligacao");
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  function reset() {
    setChannel("ligacao");
    setNote("");
    setFollowUpDate("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    onSubmit({
      channel,
      note: note.trim(),
      followUpDate: followUpDate || undefined,
    });
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar contato"
      description={clientName ? `Contato com ${clientName}` : "Anote o que foi conversado e o próximo passo."}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-10 items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="register-contact-form"
            disabled={!note.trim()}
            className="inline-flex h-10 items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Salvar contato
          </button>
        </div>
      }
    >
      <form id="register-contact-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Canal
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setChannel(value)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-btn border px-3 text-[12.5px] font-semibold transition-colors",
                  channel === value
                    ? "border-brand/60 bg-brand/5 text-brand"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Nota do contato <span className="text-brand">*</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="O que foi conversado, objeções, próximos passos…"
            className="w-full rounded-btn border border-ink-200 bg-white px-3 py-2 text-[13px] leading-[1.5] text-ink-900 placeholder-ink-400 outline-none focus:border-ink-400"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
            Próximo follow-up (opcional)
          </span>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="h-10 w-full rounded-btn border border-ink-200 bg-white px-3 text-[13px] text-ink-900 outline-none focus:border-ink-400"
          />
        </label>
      </form>
    </Modal>
  );
}
