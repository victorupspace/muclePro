"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, FileSpreadsheet, FileText, LayoutDashboard, ShieldAlert } from "lucide-react";
import { ClientAtividadesTab } from "@/components/plataforma/ClientAtividadesTab";
import { ClientDocumentosTab } from "@/components/plataforma/ClientDocumentosTab";
import { ClientHeader } from "@/components/plataforma/ClientHeader";
import { ClientPropostasTab } from "@/components/plataforma/ClientPropostasTab";
import { ClientResumoTab } from "@/components/plataforma/ClientResumoTab";
import { EditClientModal } from "@/components/plataforma/EditClientModal";
import { AddTaskModal } from "@/components/plataforma/AddTaskModal";
import { Tabs } from "@/components/plataforma/Tabs";
import { useConsultorSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";

type TabValue = "resumo" | "propostas" | "documentos" | "atividades";

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile: session } = useConsultorSession();
  const { clients, simulations, getClientProfile, loading, removeClientActivity } = usePlataformaStore();

  const clientId = params?.id ?? "";
  const client = clients.find((c) => c.id === clientId) ?? null;
  const profile = getClientProfile(clientId);

  const [tab, setTab] = useState<TabValue>("resumo");
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  if (loading && !client) {
    return (
      <div className="flex items-center justify-center py-16 text-[13px] text-ink-500">
        Carregando ficha do cliente…
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-ink-400" strokeWidth={2.2} />
        <h1 className="mt-3 text-[18px] font-bold text-ink-900">Cliente não encontrado</h1>
        <p className="mt-1.5 text-[13px] text-ink-500">
          O cliente que você tentou acessar não está na sua carteira.
        </p>
        <Link
          href="/plataforma/clientes"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-btn bg-ink-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800"
        >
          Voltar para clientes
        </Link>
      </div>
    );
  }

  if (session && client.ownerId !== session.id) {
    return (
      <div className="rounded-card border border-danger-200 bg-danger-50 p-8 text-center text-danger-700">
        <h1 className="text-[16px] font-bold">Acesso não autorizado</h1>
        <p className="mt-1.5 text-[13px]">Este cliente não pertence à sua conta.</p>
      </div>
    );
  }

  const simulationsCount = simulations.filter((s) => s.clientId === clientId).length;

  const tabs: { value: TabValue; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      value: "resumo",
      label: "Resumo",
      icon: <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      value: "propostas",
      label: "Simulações",
      count: simulationsCount,
      icon: <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      value: "documentos",
      label: "Documentos",
      count: profile.documents.length,
      icon: <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
    {
      value: "atividades",
      label: "Atividades",
      count: profile.activities.length,
      icon: <Activity className="h-3.5 w-3.5" strokeWidth={2.2} />,
    },
  ];

  return (
    <div className="space-y-5">
      <ClientHeader
        client={client}
        profile={profile}
        onEdit={() => setEditOpen(true)}
        onAddTask={() => setTaskOpen(true)}
        onAddNote={() => setTaskOpen(true)}
        onSimulate={() => router.push(`/plataforma/simulador?clientId=${client.id}`)}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div>
        {tab === "resumo" && <ClientResumoTab client={client} profile={profile} />}
        {tab === "propostas" && (
          <ClientPropostasTab
            clientId={client.id}
            onSimulate={() => router.push(`/plataforma/simulador?clientId=${client.id}`)}
          />
        )}
        {tab === "documentos" && <ClientDocumentosTab documents={profile.documents} />}
        {tab === "atividades" && (
          <ClientAtividadesTab
            activities={profile.activities}
            onDelete={(activityId) => removeClientActivity(client.id, activityId)}
          />
        )}
      </div>

      <EditClientModal client={client} open={editOpen} onClose={() => setEditOpen(false)} />
      <AddTaskModal open={taskOpen} onClose={() => setTaskOpen(false)} />
    </div>
  );
}
