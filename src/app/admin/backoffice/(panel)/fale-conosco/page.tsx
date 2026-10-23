"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Mail, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput } from "@/components/admin/Filters";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatRelative } from "@/lib/admin/format";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase/client";

type Status = "aberta" | "respondida" | "arquivada";

type SupportMessage = {
  id: string;
  name: string;
  subject: string;
  email: string;
  message: string;
  status: Status;
  created_at: string;
  handled_at: string | null;
  accounts: { company_name: string | null } | null;
};

const STATUS_LABEL: Record<Status, string> = { aberta: "Aberta", respondida: "Respondida", arquivada: "Arquivada" };
const STATUS_TONE: Record<Status, string> = {
  aberta: "bg-warning-50 text-warning-800 ring-warning-200",
  respondida: "bg-success-50 text-success-700 ring-success-200",
  arquivada: "bg-ink-100 text-ink-600 ring-ink-200",
};

// Mensagens do Fale conosco das academias: ler, responder por e-mail e
// marcar como respondida ou arquivada.
export default function FaleConoscoBackofficePage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Status>("aberta");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("support_messages")
      .select("id, name, subject, email, message, status, created_at, handled_at, accounts(company_name)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (loadError) return setError(loadError.message);
    setMessages((data ?? []) as unknown as SupportMessage[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: Status) {
    const handledAt = status === "aberta" ? null : new Date().toISOString();
    const { error: updateError } = await supabase.from("support_messages").update({ status, handled_at: handledAt }).eq("id", id);
    if (updateError) return setError(updateError.message);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status, handled_at: handledAt } : m)));
  }

  const counts = useMemo(
    () => ({
      aberta: messages.filter((m) => m.status === "aberta").length,
      respondida: messages.filter((m) => m.status === "respondida").length,
      arquivada: messages.filter((m) => m.status === "arquivada").length,
    }),
    [messages],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages
      .filter((m) => m.status === tab)
      .filter(
        (m) =>
          !q ||
          [m.name, m.email, m.subject, m.message, m.accounts?.company_name ?? ""].some((v) => v.toLowerCase().includes(q)),
      );
  }, [messages, tab, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fale conosco"
        description="Mensagens que as academias enviam pelo painel. Responda pelo e-mail indicado e marque como respondida."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex shrink-0 rounded-btn border border-ink-200 bg-white p-0.5">
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cn(
                "h-9 rounded-[5px] px-3 text-[12.5px] font-semibold transition-colors",
                tab === s ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100",
              )}
            >
              {s === "aberta" ? "Abertas" : s === "respondida" ? "Respondidas" : "Arquivadas"} ({counts[s]})
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} className="w-full lg:max-w-[360px]" placeholder="Buscar por academia, nome, e-mail ou assunto" />
      </div>

      {error && (
        <p role="alert" className="rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[13px] font-medium text-danger-700">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title={loading ? "Carregando mensagens…" : tab === "aberta" ? "Nenhuma mensagem aberta" : "Nada por aqui"}
          description={tab === "aberta" ? "Quando uma academia escrever pelo Fale conosco, a mensagem aparece aqui." : "Ajuste a busca ou troque de aba."}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <li key={m.id} className="rounded-card border border-ink-200 bg-white p-4 md:p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink-900">{m.subject}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-600">
                    <span className="font-semibold text-ink-800">{m.name}</span>
                    {m.accounts?.company_name ? ` · ${m.accounts.company_name}` : ""} · {m.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11.5px] text-ink-500">{formatRelative(m.created_at)}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset", STATUS_TONE[m.status])}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-btn bg-ink-50 px-3 py-2.5 text-[13.5px] leading-[1.6] text-ink-800">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(`Olá, ${m.name.split(" ")[0]}!\n\n\n\n---\nSua mensagem:\n${m.message}`)}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Responder por e-mail
                </a>
                {m.status !== "respondida" && (
                  <ActionButton onClick={() => void setStatus(m.id, "respondida")} icon={<CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />}>
                    Marcar como respondida
                  </ActionButton>
                )}
                {m.status !== "arquivada" && (
                  <ActionButton onClick={() => void setStatus(m.id, "arquivada")} icon={<Archive className="h-3.5 w-3.5" strokeWidth={2.2} />}>
                    Arquivar
                  </ActionButton>
                )}
                {m.status !== "aberta" && (
                  <ActionButton onClick={() => void setStatus(m.id, "aberta")} icon={<RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />}>
                    Reabrir
                  </ActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
    >
      {icon}
      {children}
    </button>
  );
}
