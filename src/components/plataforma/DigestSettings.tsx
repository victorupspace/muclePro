"use client";

import { useEffect, useState } from "react";
import { Eye, Mail, Send } from "lucide-react";
import { Field, Toggle, inputClass } from "./FormKit";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { formatDateValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import { supabase } from "@/lib/supabase/client";

async function authedFetch(input: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

function withTopTarget(html: string) {
  const base = '<base target="_top">';
  return /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${base}`) : `${base}${html}`;
}

// Resumo diário por e-mail: liga/desliga, destinatário, prévia e envio de teste.
export function DigestSettings() {
  const { profile } = useAccountSession();
  const { settings, updateSettings } = usePlataformaStore();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; recipient: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    setEmail(settings.digestEmail ?? "");
  }, [settings.digestEmail]);

  const fallbackEmail = profile?.email ?? "";
  const recipient = email.trim() || fallbackEmail;
  const dirty = (settings.digestEmail ?? "") !== email.trim();

  async function toggle(next: boolean) {
    setSaving(true);
    const ok = await updateSettings({ digestEnabled: next, digestEmail: email });
    setSaving(false);
    if (ok) {
      push(
        next
          ? { tone: "success", title: "Resumo diário ligado", description: `Chega todo dia às 7h em ${recipient}.` }
          : { tone: "info", title: "Resumo diário desligado" },
      );
    }
  }

  async function saveEmail() {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      push({ tone: "warn", title: "E-mail inválido", description: "Confira o endereço e tente de novo." });
      return;
    }
    setSaving(true);
    const ok = await updateSettings({ digestEmail: email });
    setSaving(false);
    if (ok) push({ tone: "success", title: "Destinatário salvo" });
  }

  async function openPreview() {
    setLoadingPreview(true);
    const res = await authedFetch("/api/plataforma/digest");
    const body = (await res.json().catch(() => ({}))) as { subject?: string; html?: string; recipient?: string; error?: string };
    setLoadingPreview(false);
    if (!res.ok || !body.html) {
      push({ tone: "warn", title: "Não foi possível gerar a prévia", description: body.error });
      return;
    }
    setPreview({ subject: body.subject ?? "", html: body.html, recipient: body.recipient ?? recipient });
    setPreviewOpen(true);
  }

  async function sendTest() {
    setSending(true);
    const res = await authedFetch("/api/plataforma/digest", { method: "POST", body: JSON.stringify({ email: recipient }) });
    const body = (await res.json().catch(() => ({}))) as { to?: string; error?: string };
    setSending(false);
    if (!res.ok) {
      push({
        tone: "warn",
        title: res.status === 503 ? "Envio de e-mail ainda não ativado" : "Não foi possível enviar",
        description: res.status === 503 ? "A prévia já funciona. O envio libera assim que o provedor de e-mail for conectado." : body.error,
      });
      return;
    }
    push({ tone: "success", title: "Resumo enviado", description: `Confira a caixa de entrada de ${body.to}.` });
  }

  return (
    <section className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Mail className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-[14px] font-bold tracking-[-0.005em] text-ink-900">Resumo diário por e-mail</h2>
          <p className="text-[11.5px] text-ink-500">Às 7h: o que entrou ontem, quem vence hoje, quem atrasou e quem pode sair.</p>
        </div>
      </header>

      <div className="space-y-3">
        <Toggle
          checked={settings.digestEnabled}
          onChange={(next) => void toggle(next)}
          disabled={saving || profile?.permissions.readOnly}
          label="Receber o resumo todo dia"
          description={
            settings.digestEnabled
              ? settings.digestLastSentOn
                ? `Último envio em ${formatDateValue(settings.digestLastSentOn)}.`
                : "O primeiro chega amanhã às 7h."
              : "Desligado. Nada é enviado."
          }
        />

        <Field label="Enviar para" hint={email.trim() ? undefined : `Vazio = e-mail de acesso (${fallbackEmail}).`}>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={fallbackEmail || "voce@suaacademia.com.br"}
              className={inputClass}
            />
            {dirty && (
              <button
                type="button"
                onClick={() => void saveEmail()}
                disabled={saving}
                className="inline-flex h-10 shrink-0 items-center rounded-btn bg-brand px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                Salvar
              </button>
            )}
          </div>
        </Field>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void openPreview()}
            disabled={loadingPreview}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 disabled:opacity-60"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
            {loadingPreview ? "Montando..." : "Ver prévia de hoje"}
          </button>
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={sending || !recipient}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
            {sending ? "Enviando..." : "Enviar teste agora"}
          </button>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Prévia do resumo de hoje"
        description={preview ? `${preview.subject} · para ${preview.recipient}` : undefined}
        size="lg"
      >
        {preview && (
          <iframe
            title="Prévia do e-mail"
            // Os links da prévia abrem a página do sistema nesta aba, e não dentro do quadro.
            srcDoc={withTopTarget(preview.html)}
            sandbox="allow-popups allow-top-navigation-by-user-activation"
            className="h-[62vh] w-full rounded-btn border border-ink-200 bg-surface"
          />
        )}
      </Modal>
    </section>
  );
}
