"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Briefcase,
  Calculator,
  CalendarClock,
  ExternalLink,
  FileText,
  FileWarning,
  Flame,
  ListChecks,
  Plus,
  Send,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { SearchInput } from "@/components/admin/Filters";
import { Modal } from "@/components/plataforma/Modal";
import { AlertRow } from "@/components/plataforma/crm/AlertsModule";
import { DocPendingRow } from "@/components/plataforma/crm/DocumentsModule";
import { FollowUpRow } from "@/components/plataforma/crm/FollowUpsModule";
import { NewProspectModal } from "@/components/plataforma/crm/NewProspectModal";
import { NextBestActionModule } from "@/components/plataforma/crm/NextBestActionModule";
import { NextBestActionRow } from "@/components/plataforma/crm/NextBestActionRow";
import { PipelineCard } from "@/components/plataforma/crm/PipelineCard";
import { PipelineColumn } from "@/components/plataforma/crm/PipelineColumn";
import { PipelineFilter } from "@/components/plataforma/crm/PipelineFilter";
import { PipelineSlideOver } from "@/components/plataforma/crm/PipelineSlideOver";
import { PriorityRow } from "@/components/plataforma/crm/PriorityModule";
import { RegisterContactModal, type ContactChannel } from "@/components/plataforma/crm/RegisterContactModal";
import { SeeAllPanel } from "@/components/plataforma/crm/SeeAllPanel";
import { ToastProvider, useToast } from "@/components/plataforma/crm/Toast";
import { onlyDigits } from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { CLIENT_MIGRATION_LABEL, formatCurrency, formatDateTime, formatNumber, formatRelative } from "@/lib/plataforma/format";
import {
  DOC_PENDING_LABEL,
  FOLLOW_UP_BUCKET_LABEL,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
  PROPOSAL_CARD_LABEL,
  SEVERITY_TONE,
  buildDocPendings,
  buildFollowUps,
  buildMigrationAlerts,
  computePriority,
  pickLatestProposal,
  pickLatestSimulation,
  priorityLevel,
  proposalCardStatus,
  proposalExpiresAt,
  proposalUrgencyBucket,
  type DocPendingEntry,
  type FollowUpEntry,
  type FollowUpStatus,
  type MigrationAlertEntry,
  type PipelineStage,
  type PriorityEntry,
  type QuickFilter,
} from "@/lib/plataforma/crm";
import { buildNextBestActions, type NextBestAction } from "@/lib/plataforma/next-best-action";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Client, ClientProfile, ClientStatus, Proposal, Simulation } from "@/lib/plataforma/types";

export type CrmView =
  | "visao-geral"
  | "pipeline"
  | "acoes"
  | "follow-ups"
  | "propostas"
  | "documentos"
  | "migracao";

const CRM_NAV: Array<{ value: CrmView; label: string; href: string }> = [
  { value: "visao-geral", label: "Visão geral", href: "/plataforma/crm/visao-geral" },
  { value: "pipeline", label: "Pipeline", href: "/plataforma/crm/pipeline" },
  { value: "acoes", label: "Ações recomendadas", href: "/plataforma/crm/acoes" },
  { value: "follow-ups", label: "Follow-ups", href: "/plataforma/crm/follow-ups" },
  { value: "propostas", label: "Propostas", href: "/plataforma/crm/propostas" },
  { value: "documentos", label: "Documentos", href: "/plataforma/crm/documentos" },
  { value: "migracao", label: "Migração", href: "/plataforma/crm/migracao" },
];

const CRM_HEADER: Record<CrmView, { title: string; subtitle: string }> = {
  "visao-geral": {
    title: "CRM",
    subtitle: "Gerencie sua operação comercial, propostas e etapas de migração em um só lugar.",
  },
  pipeline: {
    title: "Pipeline de vendas",
    subtitle: "Acompanhe clientes e oportunidades por etapa comercial.",
  },
  acoes: {
    title: "Ações recomendadas",
    subtitle: "Veja onde agir primeiro para aumentar suas chances de fechamento.",
  },
  "follow-ups": {
    title: "Follow-ups",
    subtitle: "Centralize sua agenda comercial e tarefas de contato.",
  },
  propostas: {
    title: "Propostas",
    subtitle: "Controle propostas comerciais, validade e próximos passos de conversão.",
  },
  documentos: {
    title: "Documentos",
    subtitle: "Acompanhe pendências documentais para destravar clientes e migrações.",
  },
  migracao: {
    title: "Migração",
    subtitle: "Monitore clientes nas etapas operacionais e regulatórias.",
  },
};

type FollowUpMap = Record<string, string | null>;
type StageTimeMap = Record<string, string>;

const SUBMERCADO_OPTIONS = [
  { value: "all", label: "Todos os submercados" },
  { value: "SE/CO", label: "SE/CO" },
  { value: "S", label: "S" },
  { value: "NE", label: "NE" },
  { value: "N", label: "N" },
];

const FOLLOW_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "em_dia", label: "Em dia" },
  { value: "hoje", label: "Hoje" },
  { value: "atrasado", label: "Atrasado" },
];

const STAGE_OPTIONS = [
  { value: "all", label: "Todas as etapas" },
  ...PIPELINE_STAGES.map((s) => ({ value: s, label: PIPELINE_STAGE_LABEL[s] })),
];

const PROPOSAL_FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "sem_proposta", label: "Sem proposta" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "expirada", label: "Expirada" },
  { value: "aceita", label: "Aceita" },
];

const DOC_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "with_pending", label: "Com pendência" },
  { value: "without_pending", label: "Sem pendência" },
];

export function CrmWorkspace({ view }: { view: CrmView }) {
  return (
    <ToastProvider>
      <PipelineContent view={view} />
    </ToastProvider>
  );
}

type SeeAllMode = "followups" | "proposals" | "priority" | "docs" | "alerts" | "nba" | null;

function PipelineContent({ view }: { view: CrmView }) {
  const router = useRouter();
  const toast = useToast();
  const {
    clients,
    proposals,
    simulations,
    tasks,
    clientSegments,
    loading,
    error,
    getClientProfile,
    updateClient,
    addClientActivity,
    addTask,
    toggleTask,
    pipelineCards,
    setPipelineFollowUp,
    touchPipelineStage,
    recordNbaExecution,
    recordClientDocumentAction,
  } = usePlataformaStore();

  const [search, setSearch] = useState("");
  const [submercado, setSubmercado] = useState("all");
  const [distribuidora, setDistribuidora] = useState("all");
  const [segment, setSegment] = useState("all");
  const [followFilter, setFollowFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [proposalFilter, setProposalFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  const [showProspectModal, setShowProspectModal] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<PipelineStage | null>(null);
  const [blocker, setBlocker] = useState<{ message: string; ctaLabel?: string; ctaHref?: string } | null>(null);
  const [seeAll, setSeeAll] = useState<SeeAllMode>(null);
  const [contactModal, setContactModal] = useState<{ clientId: string; sourceAction?: NextBestAction } | null>(null);

  // followUps + stageTimes vêm do pipeline_cards (DB) com fallback p/ tarefas
  const followUpsFromCards = useMemo<FollowUpMap>(() => {
    const out: FollowUpMap = {};
    Object.values(pipelineCards).forEach((card) => {
      if (card.followUpAt) out[card.clientId] = card.followUpAt;
    });
    return out;
  }, [pipelineCards]);

  const followUps = useMemo<FollowUpMap>(() => {
    const out: FollowUpMap = { ...followUpsFromCards };
    clients.forEach((c) => {
      if (out[c.id]) return;
      const next = tasks
        .filter((t) => t.clientId === c.id && !t.done && t.dueAt)
        .sort((a, b) => +new Date(a.dueAt!) - +new Date(b.dueAt!))[0];
      if (next?.dueAt) out[c.id] = next.dueAt;
    });
    return out;
  }, [clients, tasks, followUpsFromCards]);

  const stageTimes = useMemo<StageTimeMap>(() => {
    const out: StageTimeMap = {};
    Object.values(pipelineCards).forEach((card) => {
      out[card.clientId] = card.stageUpdatedAt;
    });
    return out;
  }, [pipelineCards]);

  const enriched = useMemo(
    () =>
      clients.flatMap((client) => {
        const profile = getClientProfile(client.id);
        if (!profile) return [];
        return [{ client, profile }];
      }),
    [clients, getClientProfile],
  );

  const distribuidoraOptions = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach(({ profile, client }) => {
      profile.units.forEach((u) => set.add(u.distribuidora));
      if (client.distributor) set.add(client.distributor);
    });
    return [
      { value: "all", label: "Todas" },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((d) => ({ value: d, label: d })),
    ];
  }, [enriched]);

  const segmentOptions = useMemo(
    () => [
      { value: "all", label: "Todos" },
      ...clientSegments.map((s) => ({ value: s, label: s })),
    ],
    [clientSegments],
  );

  // Derive operational data
  const followUpEntries = useMemo<FollowUpEntry[]>(
    () => buildFollowUps(clients, tasks, followUpsFromCards),
    [clients, tasks, followUpsFromCards],
  );

  const docPendings = useMemo<DocPendingEntry[]>(
    () => buildDocPendings(clients, getClientProfile),
    [clients, getClientProfile],
  );

  const alerts = useMemo<MigrationAlertEntry[]>(
    () => buildMigrationAlerts(clients, getClientProfile),
    [clients, getClientProfile],
  );

  const priorityEntries = useMemo<PriorityEntry[]>(
    () =>
      enriched
        .filter(({ client }) => client.status !== "inativo" && client.status !== "ativo")
        .map(({ client, profile }) =>
          computePriority(
            client,
            profile,
            proposals,
            simulations,
            followUps[client.id] ?? undefined,
            stageTimes[client.id] ?? client.createdAt,
          ),
        )
        .sort((a, b) => b.score - a.score),
    [enriched, proposals, simulations, followUps, stageTimes],
  );

  const docPendingByClient = useMemo(() => {
    const map = new Map<string, number>();
    docPendings.forEach((entry) => {
      map.set(entry.client.id, (map.get(entry.client.id) ?? 0) + 1);
    });
    return map;
  }, [docPendings]);

  const nextBestActions = useMemo<NextBestAction[]>(
    () =>
      buildNextBestActions(
        clients,
        getClientProfile,
        proposals,
        simulations,
        tasks,
        followUps,
        stageTimes,
        docPendingByClient,
      ),
    [clients, getClientProfile, proposals, simulations, tasks, followUps, stageTimes, docPendingByClient],
  );

  const nbaByClient = useMemo(() => {
    const map = new Map<string, NextBestAction>();
    nextBestActions.forEach((action) => {
      if (!map.has(action.clientId)) map.set(action.clientId, action);
    });
    return map;
  }, [nextBestActions]);

  const alertsByClient = useMemo(() => {
    const map = new Map<string, number>();
    alerts.forEach((entry) => {
      map.set(entry.client.id, (map.get(entry.client.id) ?? 0) + 1);
    });
    return map;
  }, [alerts]);

  // Apply search + filters (with quick filter support)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    return enriched.filter(({ client, profile }) => {
      if (segment !== "all" && client.segment !== segment) return false;
      if (submercado !== "all" && !profile.units.some((u) => u.submercado === submercado))
        return false;
      if (
        distribuidora !== "all" &&
        client.distributor !== distribuidora &&
        !profile.units.some((u) => u.distribuidora === distribuidora)
      )
        return false;
      if (stageFilter !== "all" && client.status !== stageFilter) return false;

      if (proposalFilter !== "all") {
        const status = proposalCardStatus(pickLatestProposal(client, proposals));
        if (status !== proposalFilter) return false;
      }

      const docCount = docPendingByClient.get(client.id) ?? 0;
      if (docFilter === "with_pending" && docCount === 0) return false;
      if (docFilter === "without_pending" && docCount > 0) return false;

      if (followFilter !== "all") {
        const due = followUps[client.id];
        const status: FollowUpStatus = (() => {
          if (!due) return "sem" as FollowUpStatus;
          const time = new Date(due).getTime();
          const now = Date.now();
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          if (time < startOfToday.getTime() && time < now) return "atrasado";
          if (time >= startOfToday.getTime() && time <= endOfToday.getTime()) return "hoje";
          return "em_dia";
        })();
        if (status !== followFilter) return false;
      }

      // Quick filters
      if (quickFilter === "follow_pendente") {
        const due = followUps[client.id];
        if (!due) return false;
        if (+new Date(due) > Date.now() + 86_400_000) return false;
      }
      if (quickFilter === "proposta_vencendo") {
        const p = pickLatestProposal(client, proposals);
        if (!p || p.status !== "enviada") return false;
        const bucket = proposalUrgencyBucket(p);
        if (bucket === "ativa") return false;
      }
      if (quickFilter === "doc_pendente") {
        if (docCount === 0) return false;
      }
      if (quickFilter === "migrando") {
        if (client.status !== "assinado" && client.status !== "migrando") return false;
      }
      if (quickFilter === "alta_prioridade") {
        const entry = priorityEntries.find((e) => e.client.id === client.id);
        if (!entry || priorityLevel(entry.score) !== "alta") return false;
      }

      if (!q) return true;
      return (
        client.name.toLowerCase().includes(q) ||
        (client.companyName?.toLowerCase().includes(q) ?? false) ||
        (client.segment?.toLowerCase().includes(q) ?? false) ||
        client.email.toLowerCase().includes(q) ||
        (client.distributor?.toLowerCase().includes(q) ?? false) ||
        (profile.document ? onlyDigits(profile.document).includes(qDigits) : false)
      );
    });
  }, [
    enriched,
    search,
    segment,
    submercado,
    distribuidora,
    stageFilter,
    proposalFilter,
    docFilter,
    followFilter,
    quickFilter,
    followUps,
    proposals,
    docPendingByClient,
    priorityEntries,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<PipelineStage, typeof filtered>();
    PIPELINE_STAGES.forEach((s) => map.set(s, []));
    filtered.forEach((row) => {
      const stage = row.client.status;
      const list = map.get(stage);
      if (list) list.push(row);
    });
    return map;
  }, [filtered]);

  // Summary cards (counts always derived from full set, not filter result)
  const summary = useMemo(() => {
    const totalOpps = enriched.filter(({ client }) => client.status !== "inativo").length;
    const followPending = followUpEntries.filter(
      (e) => e.bucket === "atrasado" || e.bucket === "hoje",
    ).length;
    const proposalsExpiring = proposals.filter(
      (p) => p.status === "enviada" && proposalUrgencyBucket(p) !== "ativa",
    ).length;
    const docsPending = docPendings.length;
    const migrating = enriched.filter(({ client }) => client.status === "assinado" || client.status === "migrando").length;
    const projected = enriched.reduce((acc, { client }) => {
      const sim = pickLatestSimulation(client, simulations);
      return acc + (sim?.resultsData.monthlySavings ?? client.monthlySavings ?? 0);
    }, 0);
    return { totalOpps, followPending, proposalsExpiring, docsPending, migrating, projected };
  }, [enriched, followUpEntries, proposals, docPendings, simulations]);

  function setFollowUp(clientId: string, iso: string | null) {
    void setPipelineFollowUp(clientId, iso);
  }

  async function tryMoveToStage(client: Client, target: PipelineStage) {
    if (client.status === target) return;

    if (target === "proposta_enviada" || target === "em_negociacao") {
      const hasSim = simulations.some((s) => s.clientId === client.id);
      if (!hasSim) {
        setBlocker({
          message:
            "Este cliente ainda não possui uma simulação vinculada. Crie uma simulação antes de enviar uma proposta.",
          ctaLabel: "Criar simulação",
          ctaHref: `/plataforma/simulador?clientId=${client.id}`,
        });
        return;
      }
    }

    if (target === "assinado" || target === "migrando" || target === "ativo") {
      const accepted = proposals.find((p) => p.clientId === client.id && p.status === "aceita");
      if (!accepted) {
        setBlocker({
          message:
            "Para mover para Ativo é preciso ter uma proposta aceita. Confirme a aceitação ou anexe o contrato assinado na ficha do cliente.",
          ctaLabel: "Abrir ficha do cliente",
          ctaHref: `/plataforma/clientes/${client.id}`,
        });
        return;
      }
    }

    const updated = await updateClient(client.id, { status: target });
    if (!updated) return;

    void touchPipelineStage(client.id);
    void addClientActivity(client.id, {
      kind: "status",
      title: `Movido para "${PIPELINE_STAGE_LABEL[target]}"`,
      body: `Status anterior: ${PIPELINE_STAGE_LABEL[client.status]}`,
    });

    toast.push({
      tone: "success",
      title: "Cliente movido",
      description: `${client.companyName ?? client.name} → ${PIPELINE_STAGE_LABEL[target]}`,
    });
  }

  function onCardDragStart(e: React.DragEvent, clientId: string) {
    setDraggingId(clientId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", clientId);
  }

  function onCardDragEnd() {
    setDraggingId(null);
    setHoverStage(null);
  }

  async function onColumnDrop(e: React.DragEvent, stage: PipelineStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setHoverStage(null);
    setDraggingId(null);
    if (!id) return;
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    await tryMoveToStage(client, stage);
  }

  function applyQuickFilter(next: QuickFilter) {
    setQuickFilter((prev) => (prev === next ? null : next));
  }

  async function completeFollowUp(entry: FollowUpEntry) {
    if (entry.task) {
      await toggleTask(entry.task.id);
      void addClientActivity(entry.client.id, {
        kind: "tarefa",
        title: "Follow-up concluído",
        body: entry.title,
      });
      void setPipelineFollowUp(entry.client.id, null);
      toast.push({ tone: "success", title: "Follow-up concluído" });
    }
  }

  async function createTaskForAlert(entry: MigrationAlertEntry) {
    const t = await addTask({
      title: `Resolver: ${entry.description}`,
      clientId: entry.client.id,
      priority: entry.severity === "critica" || entry.severity === "alta" ? "alta" : "media",
    });
    if (t) {
      void addClientActivity(entry.client.id, {
        kind: "tarefa",
        title: "Tarefa criada a partir de alerta",
        body: entry.description,
      });
      toast.push({ tone: "success", title: "Tarefa criada" });
    }
  }

  function executeNextBestAction(action: NextBestAction) {
    const client = clients.find((c) => c.id === action.clientId);
    if (!client) return;

    // Registra a execução da NBA (exceto register_contact, que registra após salvar a nota)
    const persist = (outcome: string) => {
      void recordNbaExecution({
        clientId: client.id,
        actionType: action.type,
        ctaAction: action.ctaAction,
        priority: action.priority,
        title: action.title,
        reason: action.reason,
        outcome,
      });
    };

    switch (action.ctaAction) {
      case "register_contact":
        setContactModal({ clientId: client.id, sourceAction: action });
        break;
      case "generate_pdf":
        void addClientActivity(client.id, {
          kind: "nba",
          title: "Próxima melhor ação executada: PDF gerado a partir da simulação.",
        });
        persist("pdf_generated");
        toast.push({ tone: "success", title: "Abrindo geração de PDF" });
        router.push(`/plataforma/simulador?clientId=${client.id}&action=pdf`);
        break;
      case "create_followup":
        void addClientActivity(client.id, {
          kind: "nba",
          title: "Próxima melhor ação executada: follow-up criado.",
        });
        persist("followup_created");
        setActiveClientId(client.id);
        toast.push({
          tone: "success",
          title: "Crie o follow-up",
          description: "Defina título e data dentro do painel do cliente.",
        });
        break;
      case "request_document":
        void addClientActivity(client.id, {
          kind: "nba",
          title: "Próxima melhor ação executada: documento solicitado ao cliente.",
        });
        void recordClientDocumentAction({
          clientId: client.id,
          docType: "outros",
          status: "solicitado",
          notes: action.reason,
        });
        persist("document_requested");
        toast.push({ tone: "success", title: "Solicitação registrada" });
        router.push(`/plataforma/clientes/${client.id}?tab=documentos`);
        break;
      case "open_timeline":
        void addClientActivity(client.id, {
          kind: "nba",
          title: "Próxima melhor ação: timeline aberta para revisão.",
        });
        persist("timeline_opened");
        router.push(`/plataforma/clientes/${client.id}?tab=resumo`);
        break;
      case "new_simulation":
        persist("simulation_opened");
        router.push(`/plataforma/simulador?clientId=${client.id}`);
        break;
      case "open_client":
      default:
        persist("client_opened");
        setActiveClientId(client.id);
    }
  }

  function handleContactSaved(payload: { channel: ContactChannel; note: string; followUpDate?: string }) {
    if (!contactModal) return;
    const clientId = contactModal.clientId;
    const labels: Record<ContactChannel, string> = {
      ligacao: "Ligação",
      whatsapp: "WhatsApp",
      email: "Email",
      reuniao: "Reunião",
    };
    void addClientActivity(clientId, {
      kind: "contato",
      title: `Contato registrado · ${labels[payload.channel]}`,
      body: payload.note,
      metadata: { channel: payload.channel },
    });
    if (payload.followUpDate) {
      const iso = new Date(`${payload.followUpDate}T12:00:00`).toISOString();
      void addTask({
        title: "Follow-up agendado",
        clientId,
        priority: "media",
        dueAt: iso,
      });
      void setPipelineFollowUp(clientId, iso);
    }
    if (contactModal.sourceAction) {
      void addClientActivity(clientId, {
        kind: "nba",
        title: "Próxima melhor ação executada: contato registrado.",
        body: contactModal.sourceAction.title,
      });
      void recordNbaExecution({
        clientId,
        actionType: contactModal.sourceAction.type,
        ctaAction: contactModal.sourceAction.ctaAction,
        priority: contactModal.sourceAction.priority,
        title: contactModal.sourceAction.title,
        reason: contactModal.sourceAction.reason,
        outcome: "contato_registrado",
      });
    }
    toast.push({ tone: "success", title: "Ação registrada com sucesso." });
    setContactModal(null);
  }

  function handleDocAction(entry: DocPendingEntry, kind: "request" | "upload") {
    void addClientActivity(entry.client.id, {
      kind: "documento",
      title:
        kind === "request"
          ? `Documento solicitado: ${entry.type}`
          : `Upload registrado: ${entry.type}`,
      body: entry.reason,
    });
    void recordClientDocumentAction({
      clientId: entry.client.id,
      docType: entry.type,
      status: kind === "request" ? "solicitado" : "recebido",
      notes: entry.reason,
    });
    toast.push({
      tone: "success",
      title: kind === "request" ? "Solicitação registrada" : "Upload registrado",
      description: "Concluir o envio na ficha do cliente.",
    });
    router.push(`/plataforma/clientes/${entry.client.id}?tab=documentos`);
  }

  const activeClient = activeClientId ? clients.find((c) => c.id === activeClientId) ?? null : null;
  const header = CRM_HEADER[view];

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="flex flex-col gap-3 border-b border-ink-200 pb-4 md:flex-row md:items-end md:justify-between md:pb-5"
      >
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
            CRM
          </p>
          <h1 className="mt-1 text-[19px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[22px]">
            {header.title}
          </h1>
          <p className="mt-1.5 max-w-[640px] text-[12.5px] leading-[1.55] text-ink-500 md:text-[13px]">
            {header.subtitle}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => router.push("/plataforma/simulador")}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50 sm:w-auto"
          >
            <Calculator className="h-3.5 w-3.5" strokeWidth={2.4} />
            Nova simulação
          </button>
          <button
            type="button"
            onClick={() => setShowProspectModal(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-hover sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Novo prospect
          </button>
        </div>
      </motion.header>

      <CrmInnerNav active={view} onNavigate={(href) => router.push(href)} />

      {error && (
        <div className="rounded-card border border-danger-200 bg-danger-50 px-4 py-3 text-[12.5px] font-medium text-danger-700">
          Não foi possível carregar esta seção. Tente novamente. {error}
        </div>
      )}

      {view === "visao-geral" && (
      <section className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <SummaryShortcut
          label="Total de oportunidades"
          value={formatNumber(summary.totalOpps)}
          icon={<Briefcase className="h-3.5 w-3.5" strokeWidth={2.4} />}
          active={!quickFilter && !stageFilter && !proposalFilter && !docFilter && !followFilter && !segment && !submercado && !distribuidora}
          onClick={() => {
            setQuickFilter(null);
            setStageFilter("all");
            setProposalFilter("all");
            setDocFilter("all");
            setFollowFilter("all");
          }}
        />
        <SummaryShortcut
          label="Follow-ups pendentes"
          value={formatNumber(summary.followPending)}
          icon={<CalendarClock className="h-3.5 w-3.5" strokeWidth={2.4} />}
          tone={summary.followPending > 0 ? "warn" : "default"}
          active={quickFilter === "follow_pendente"}
          onClick={() => applyQuickFilter("follow_pendente")}
        />
        <SummaryShortcut
          label="Propostas vencendo"
          value={formatNumber(summary.proposalsExpiring)}
          icon={<FileText className="h-3.5 w-3.5" strokeWidth={2.4} />}
          tone={summary.proposalsExpiring > 0 ? "danger" : "default"}
          active={quickFilter === "proposta_vencendo"}
          onClick={() => applyQuickFilter("proposta_vencendo")}
        />
        <SummaryShortcut
          label="Documentos pendentes"
          value={formatNumber(summary.docsPending)}
          icon={<FileWarning className="h-3.5 w-3.5" strokeWidth={2.4} />}
          tone={summary.docsPending > 0 ? "warn" : "default"}
          active={quickFilter === "doc_pendente"}
          onClick={() => applyQuickFilter("doc_pendente")}
        />
        <SummaryShortcut
          label="Em migração"
          value={formatNumber(summary.migrating)}
          icon={<Workflow className="h-3.5 w-3.5" strokeWidth={2.4} />}
          active={quickFilter === "migrando"}
          onClick={() => applyQuickFilter("migrando")}
        />
        <SummaryShortcut
          label="Economia projetada"
          value={formatCurrency(summary.projected)}
          icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />}
          tone="highlight"
        />
      </section>
      )}

      {view === "pipeline" && (
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          className="w-full"
          placeholder="Buscar por nome, razão social, CNPJ, email ou distribuidora"
        />
        <div className="flex flex-wrap gap-2.5">
          <div className="grid w-full grid-cols-2 gap-2.5 md:w-[300px] xl:w-[320px]">
            <PipelineFilter
              label="Etapa"
              value={stageFilter}
              onChange={setStageFilter}
              options={STAGE_OPTIONS}
              className="w-full"
            />
            <PipelineFilter
              label="Proposta"
              value={proposalFilter}
              onChange={setProposalFilter}
              options={PROPOSAL_FILTER_OPTIONS}
              className="w-full"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5 md:w-[300px] xl:w-[320px]">
            <PipelineFilter
              label="Follow-up"
              value={followFilter}
              onChange={setFollowFilter}
              options={FOLLOW_OPTIONS}
              className="w-full"
            />
            <PipelineFilter
              label="Documentos"
              value={docFilter}
              onChange={setDocFilter}
              options={DOC_FILTER_OPTIONS}
              className="w-full"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5 md:w-[300px] xl:w-[320px]">
            <PipelineFilter
              label="Segmento"
              value={segment}
              onChange={setSegment}
              options={segmentOptions}
              className="w-full"
            />
            <PipelineFilter
              label="Submercado"
              value={submercado}
              onChange={setSubmercado}
              options={SUBMERCADO_OPTIONS}
              className="w-full"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5 md:w-[300px] xl:w-[320px]">
            <PipelineFilter
              label="Distribuidora"
              value={distribuidora}
              onChange={setDistribuidora}
              options={distribuidoraOptions}
              className="w-full"
            />
            <div aria-hidden="true" />
          </div>
        </div>
        {quickFilter && (
          <div className="flex items-center gap-2 rounded-btn border border-brand/40 bg-brand/5 px-3 py-2 text-[12px] font-semibold text-brand">
            <Flame className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span>Filtro rápido aplicado · {filtered.length} resultado(s)</span>
            <button
              type="button"
              onClick={() => setQuickFilter(null)}
              className="ml-auto rounded-btn px-2 py-0.5 text-[11px] font-semibold text-brand/80 hover:bg-brand/10"
            >
              Limpar
            </button>
          </div>
        )}
      </div>
      )}

      {view === "visao-geral" && (
      <section className="space-y-3">
        <NextBestActionModule
          actions={nextBestActions.slice(0, 5)}
          clients={clients}
          loading={loading}
          error={error}
          onSeeAll={() => setSeeAll("nba")}
          onExecute={executeNextBestAction}
          onOpenClient={(id) => setActiveClientId(id)}
        />

        <FunnelSummary
          grouped={grouped}
          simulations={simulations}
          onOpenPipeline={() => router.push("/plataforma/crm/pipeline")}
        />
      </section>
      )}

      {view === "pipeline" && (
      <section className="grid grid-cols-1 gap-2.5 overflow-x-auto pb-2 md:auto-cols-[300px] md:grid-flow-col md:grid-cols-none xl:auto-cols-[320px]">
        {PIPELINE_STAGES.map((stage) => {
          const items = grouped.get(stage) ?? [];
          const totalSavings = items.reduce((acc, { client }) => {
            const sim = pickLatestSimulation(client, simulations);
            return acc + (sim?.resultsData.monthlySavings ?? client.monthlySavings ?? 0);
          }, 0);
          const totalConsumptionMwh = items.reduce(
            (acc, { profile }) => acc + (profile.averageConsumptionKwh ?? 0),
            0,
          ) / 1000;

          return (
            <PipelineColumn
              key={stage}
              stage={stage}
              count={items.length}
              totalSavings={totalSavings}
              totalConsumptionMwh={totalConsumptionMwh}
              isOver={hoverStage === stage}
              onDragOver={() => setHoverStage(stage)}
              onDragLeave={() => setHoverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => onColumnDrop(e, stage)}
              emptyHint={
                loading ? (
                  <ColumnSkeleton />
                ) : (
                  <EmptyStageHint stage={stage} onCreate={() => setShowProspectModal(true)} />
                )
              }
            >
              {items.map(({ client, profile }) => {
                const priority = priorityEntries.find((e) => e.client.id === client.id);
                const docCount = docPendingByClient.get(client.id) ?? 0;
                const alertCount = alertsByClient.get(client.id) ?? 0;
                const nba = nbaByClient.get(client.id) ?? null;
                return (
                  <PipelineCard
                    key={client.id}
                    client={client}
                    profile={profile}
                    proposals={proposals}
                    simulations={simulations}
                    followUpAt={followUps[client.id] ?? undefined}
                    stageUpdatedAt={stageTimes[client.id] ?? client.createdAt}
                    isDragging={draggingId === client.id}
                    priorityScore={priority?.score}
                    priorityReason={priority?.reason}
                    docPendingCount={docCount}
                    alertCount={alertCount}
                    nextAction={nba}
                    onClick={() => setActiveClientId(client.id)}
                    onDragStart={(e) => onCardDragStart(e, client.id)}
                    onDragEnd={onCardDragEnd}
                  />
                );
              })}
            </PipelineColumn>
          );
        })}
      </section>
      )}

      {view === "acoes" && (
        <ActionsView
          actions={nextBestActions}
          clients={clients}
          loading={loading}
          error={error}
          onExecute={executeNextBestAction}
          onOpenClient={(id) => setActiveClientId(id)}
        />
      )}

      {view === "follow-ups" && (
        <FollowUpsView
          entries={followUpEntries}
          onComplete={completeFollowUp}
          onOpenClient={(id) => setActiveClientId(id)}
          onCreate={() => setShowProspectModal(true)}
        />
      )}

      {view === "propostas" && (
        <ProposalsView
          proposals={proposals}
          clients={clients}
          simulations={simulations}
          onOpenClient={(id) => setActiveClientId(id)}
          onSimulate={(id) => router.push(`/plataforma/simulador?clientId=${id}`)}
        />
      )}

      {view === "documentos" && (
        <DocumentsView
          entries={docPendings}
          onOpenClient={(id) => setActiveClientId(id)}
          onUpload={(entry) => handleDocAction(entry, "upload")}
          onRequest={(entry) => handleDocAction(entry, "request")}
        />
      )}

      {view === "migracao" && (
        <MigrationView
          clients={clients}
          getClientProfile={getClientProfile}
          alerts={alerts}
          docPendings={docPendings}
          onOpenClient={(id) => setActiveClientId(id)}
          onCreateTask={createTaskForAlert}
          onRequestDoc={(entry) => handleDocAction(entry, "request")}
        />
      )}

      <NewProspectModal
        open={showProspectModal}
        onClose={() => setShowProspectModal(false)}
        onCreated={(client) => {
          void touchPipelineStage(client.id);
          setActiveClientId(client.id);
        }}
      />

      <PipelineSlideOver
        client={activeClient}
        onClose={() => setActiveClientId(null)}
        followUpAt={activeClient ? followUps[activeClient.id] ?? undefined : undefined}
        onSetFollowUp={(iso) => activeClient && setFollowUp(activeClient.id, iso)}
        docPendings={
          activeClient ? docPendings.filter((d) => d.client.id === activeClient.id) : []
        }
        alerts={
          activeClient ? alerts.filter((a) => a.client.id === activeClient.id) : []
        }
        priority={
          activeClient ? priorityEntries.find((p) => p.client.id === activeClient.id) ?? null : null
        }
        nextAction={activeClient ? nbaByClient.get(activeClient.id) ?? null : null}
        onExecuteNextAction={executeNextBestAction}
      />

      {/* Painéis "Ver todos" */}
      <SeeAllPanel
        open={seeAll === "nba"}
        title="Ações recomendadas"
        description="Próximas melhores ações priorizadas para sua carteira."
        onClose={() => setSeeAll(null)}
      >
        {nextBestActions.length === 0 ? (
          <p className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12.5px] text-ink-500">
            Nenhuma ação urgente no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {nextBestActions.map((action) => {
              const c = clients.find((cli) => cli.id === action.clientId);
              if (!c) return null;
              return (
                <NextBestActionRow
                  key={action.id}
                  action={action}
                  client={c}
                  onExecute={() => {
                    executeNextBestAction(action);
                    setSeeAll(null);
                  }}
                  onOpenClient={() => {
                    setActiveClientId(c.id);
                    setSeeAll(null);
                  }}
                />
              );
            })}
          </ul>
        )}
      </SeeAllPanel>

      <SeeAllPanel
        open={seeAll === "followups"}
        title="Follow-ups"
        description="Todos os follow-ups previstos, ordenados por urgência."
        onClose={() => setSeeAll(null)}
      >
        {followUpEntries.filter((e) => e.bucket !== "sem").length === 0 ? (
          <p className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12.5px] text-ink-500">
            Sem follow-ups previstos.
          </p>
        ) : (
          <ul className="space-y-2">
            {followUpEntries
              .filter((e) => e.bucket !== "sem")
              .map((entry) => (
                <FollowUpRow
                  key={`${entry.client.id}-${entry.task?.id ?? "manual"}`}
                  entry={entry}
                  onComplete={() => completeFollowUp(entry)}
                  onOpenClient={() => {
                    setActiveClientId(entry.client.id);
                    setSeeAll(null);
                  }}
                />
              ))}
          </ul>
        )}
      </SeeAllPanel>

      <SeeAllPanel
        open={seeAll === "priority"}
        title="Oportunidades prioritárias"
        description="Score combina economia projetada, urgência de proposta, follow-up e tempo na etapa."
        onClose={() => setSeeAll(null)}
      >
        <ul className="space-y-2">
          {priorityEntries.map((entry) => (
            <PriorityRow
              key={entry.client.id}
              entry={entry}
              simulations={simulations}
              onOpenClient={() => {
                setActiveClientId(entry.client.id);
                setSeeAll(null);
              }}
            />
          ))}
        </ul>
      </SeeAllPanel>

      <SeeAllPanel
        open={seeAll === "docs"}
        title="Documentos pendentes"
        description="Pendências derivadas das etapas de migração de cada cliente."
        onClose={() => setSeeAll(null)}
      >
        {docPendings.length === 0 ? (
          <p className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12.5px] text-ink-500">
            Nenhum documento pendente.
          </p>
        ) : (
          <ul className="space-y-2">
            {docPendings.map((entry) => (
              <DocPendingRow
                key={`${entry.client.id}-${entry.type}`}
                entry={entry}
                onOpenClient={() => {
                  setActiveClientId(entry.client.id);
                  setSeeAll(null);
                }}
                onUpload={() => {
                  handleDocAction(entry, "upload");
                  setSeeAll(null);
                }}
                onRequest={() => {
                  handleDocAction(entry, "request");
                  setSeeAll(null);
                }}
              />
            ))}
          </ul>
        )}
      </SeeAllPanel>

      <SeeAllPanel
        open={seeAll === "alerts"}
        title="Alertas de migração"
        description="Etapas regulatórias e contratos que exigem atenção."
        onClose={() => setSeeAll(null)}
      >
        {alerts.length === 0 ? (
          <p className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12.5px] text-ink-500">
            Sem alertas no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((entry, i) => (
              <AlertRow
                key={`${entry.client.id}-${entry.type}-${i}`}
                entry={entry}
                onOpenClient={() => {
                  setActiveClientId(entry.client.id);
                  setSeeAll(null);
                }}
                onCreateTask={() => createTaskForAlert(entry)}
              />
            ))}
          </ul>
        )}
      </SeeAllPanel>

      <SeeAllPanel
        open={seeAll === "proposals"}
        title="Propostas"
        description="Propostas enviadas, com prazos e status."
        onClose={() => setSeeAll(null)}
      >
        {proposals.filter((p) => p.status === "enviada").length === 0 ? (
          <p className="rounded-btn border border-dashed border-ink-200 bg-ink-50/40 px-3 py-4 text-center text-[12.5px] text-ink-500">
            Sem propostas enviadas.
          </p>
        ) : (
          <ul className="space-y-2">
            {proposals
              .filter((p) => p.status === "enviada")
              .sort((a, b) => +new Date(a.sentAt ?? a.createdAt) - +new Date(b.sentAt ?? b.createdAt))
              .map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                if (!client) return null;
                return (
                  <li
                    key={p.id}
                    className="rounded-btn border border-ink-100 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveClientId(client.id);
                          setSeeAll(null);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[12.5px] font-semibold text-ink-900">
                          {client.companyName ?? client.name}
                        </p>
                        <p className="text-[11px] text-ink-500">{p.title}</p>
                      </button>
                      <span className="shrink-0 text-[11px] font-semibold text-ink-700">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </SeeAllPanel>

      <RegisterContactModal
        open={!!contactModal}
        clientName={(() => {
          if (!contactModal) return undefined;
          const c = clients.find((cli) => cli.id === contactModal.clientId);
          return c?.companyName ?? c?.name;
        })()}
        onClose={() => setContactModal(null)}
        onSubmit={handleContactSaved}
      />

      <Modal
        open={!!blocker}
        onClose={() => setBlocker(null)}
        title="Etapa requer ação"
        description={blocker?.message}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setBlocker(null)}
              className="inline-flex h-10 items-center justify-center rounded-btn border border-ink-200 px-4 text-[13px] font-semibold text-ink-700 hover:border-ink-400 hover:bg-ink-50"
            >
              Entendi
            </button>
            {blocker?.ctaLabel && blocker?.ctaHref && (
              <button
                type="button"
                onClick={() => {
                  router.push(blocker.ctaHref!);
                  setBlocker(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover"
              >
                {blocker.ctaLabel}
              </button>
            )}
          </div>
        }
      >
        <p className="text-[13px] leading-[1.55] text-ink-700">{blocker?.message}</p>
      </Modal>
    </div>
  );
}

function CrmInnerNav({ active, onNavigate }: { active: CrmView; onNavigate: (href: string) => void }) {
  return (
    <nav className="-mx-3.5 overflow-x-auto border-b border-ink-200 px-3.5 md:mx-0 md:px-0">
      <div className="flex min-w-max items-center gap-1">
        {CRM_NAV.map((item) => {
          const isActive = active === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onNavigate(item.href)}
              className={cn(
                "relative inline-flex h-11 items-center px-3 text-[13px] font-semibold transition-colors",
                isActive ? "text-ink-900" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {item.label}
              {isActive && (
                <motion.span
                  layoutId="crm-inner-nav"
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-brand"
                  transition={{ duration: 0.28, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function FunnelSummary({
  grouped,
  simulations,
  onOpenPipeline,
}: {
  grouped: Map<PipelineStage, Array<{ client: Client; profile: ClientProfile }>>;
  simulations: Simulation[];
  onOpenPipeline: () => void;
}) {
  const total = PIPELINE_STAGES.reduce((acc, stage) => acc + (grouped.get(stage)?.length ?? 0), 0);

  return (
    <section className="rounded-card border border-ink-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-ink-900">Resumo do funil</h2>
          <p className="mt-0.5 text-[12px] text-ink-500">
            Leitura compacta por etapa, sem o Kanban completo.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPipeline}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Workflow className="h-3.5 w-3.5" strokeWidth={2.4} />
          Abrir Pipeline
        </button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {PIPELINE_STAGES.map((stage, index) => {
          const items = grouped.get(stage) ?? [];
          const savings = items.reduce((acc, { client }) => {
            const sim = pickLatestSimulation(client, simulations);
            return acc + (sim?.resultsData.monthlySavings ?? client.monthlySavings ?? 0);
          }, 0);
          const conversion = total > 0 ? Math.round((items.length / total) * 100) : 0;
          return (
            <div key={stage} className="rounded-btn border border-ink-100 bg-ink-50/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-bold text-ink-900">
                  {PIPELINE_STAGE_LABEL[stage]}
                </p>
                <span className="text-[10px] font-bold text-ink-400">#{index + 1}</span>
              </div>
              <p className="mt-2 text-[20px] font-bold leading-none text-ink-900">{items.length}</p>
              <p className="mt-1 text-[11px] text-ink-500">{formatCurrency(savings)}/mês</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(4, conversion)}%` }}
                />
              </div>
              <p className="mt-1 text-[10.5px] text-ink-500">{conversion}% da carteira</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionsView({
  actions,
  clients,
  loading,
  error,
  onExecute,
  onOpenClient,
}: {
  actions: NextBestAction[];
  clients: Client[];
  loading?: boolean;
  error?: string | null;
  onExecute: (action: NextBestAction) => void;
  onOpenClient: (clientId: string) => void;
}) {
  if (loading) return <SectionSkeleton rows={5} />;
  if (error) return <SectionError />;

  return (
    <section className="space-y-3">
      <FilterStrip
        labels={["Prioridade", "Tipo de ação", "Status do cliente", "Responsável", "Data limite"]}
      />
      {actions.length === 0 ? (
        <SectionEmpty icon={<ListChecks className="h-4 w-4" />} title="Nenhuma ação urgente no momento." />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {actions.map((action) => {
            const client = clients.find((c) => c.id === action.clientId);
            if (!client) return null;
            return (
              <NextBestActionRow
                key={action.id}
                action={action}
                client={client}
                onExecute={() => onExecute(action)}
                onOpenClient={() => onOpenClient(client.id)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FollowUpsView({
  entries,
  onComplete,
  onOpenClient,
  onCreate,
}: {
  entries: FollowUpEntry[];
  onComplete: (entry: FollowUpEntry) => void;
  onOpenClient: (clientId: string) => void;
  onCreate: () => void;
}) {
  const buckets: Array<FollowUpEntry["bucket"]> = ["hoje", "atrasado", "proximos", "sem"];
  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          Criar novo follow-up
        </button>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {buckets.map((bucket) => {
          const rows = entries.filter((entry) => entry.bucket === bucket);
          return (
            <section key={bucket} className="rounded-card border border-ink-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-bold text-ink-900">{FOLLOW_UP_BUCKET_LABEL[bucket]}</h2>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-600">
                  {rows.length}
                </span>
              </div>
              {rows.length === 0 ? (
                <SectionEmpty compact title={bucket === "hoje" ? "Nenhum follow-up para hoje." : "Nada nesta categoria."} />
              ) : (
                <ul className="space-y-1.5">
                  {rows.map((entry) => (
                    <FollowUpRow
                      key={`${entry.client.id}-${entry.task?.id ?? entry.bucket}`}
                      entry={entry}
                      onComplete={() => onComplete(entry)}
                      onOpenClient={() => onOpenClient(entry.client.id)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ProposalsView({
  proposals,
  clients,
  simulations,
  onOpenClient,
  onSimulate,
}: {
  proposals: Proposal[];
  clients: Client[];
  simulations: Simulation[];
  onOpenClient: (clientId: string) => void;
  onSimulate: (clientId: string) => void;
}) {
  type ProposalListEntry = {
    proposal: Proposal;
    client: Client;
    simulation: Simulation | undefined;
    status: ReturnType<typeof proposalCardStatus>;
  };

  const enriched = proposals
    .map<ProposalListEntry | null>((proposal) => {
      const client = clients.find((c) => c.id === proposal.clientId);
      if (!client) return null;
      const simulation = pickLatestSimulation(client, simulations);
      return { proposal, client, simulation, status: proposalCardStatus(proposal) };
    })
    .filter((entry): entry is ProposalListEntry => !!entry)
    .sort((a, b) => +new Date(b.proposal.sentAt ?? b.proposal.createdAt) - +new Date(a.proposal.sentAt ?? a.proposal.createdAt));

  return (
    <section className="space-y-3">
      <FilterStrip labels={["Geradas", "Enviadas", "Abertas", "Vencendo", "Vencidas", "Aceitas", "Recusadas"]} />
      {enriched.length === 0 ? (
        <SectionEmpty icon={<FileText className="h-4 w-4" />} title="Nenhuma proposta comercial gerada ainda." />
      ) : (
        <ul className="space-y-2">
          {enriched.map(({ proposal, client, simulation, status }) => {
            const expiresAt = proposal.status === "enviada" ? proposalExpiresAt(proposal).toISOString() : undefined;
            const monthly = simulation?.resultsData.monthlySavings ?? proposal.amount;
            return (
              <li key={proposal.id} className="rounded-card border border-ink-200 bg-white p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <button type="button" onClick={() => onOpenClient(client.id)} className="min-w-0 text-left">
                    <p className="truncate text-[13px] font-bold text-ink-900">{client.companyName ?? client.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {proposal.title} · gerada {formatRelative(proposal.createdAt)}
                    </p>
                  </button>
                  <div className="grid gap-2 text-[11px] text-ink-500 sm:grid-cols-4 lg:min-w-[520px]">
                    <MetricMini label="Economia mensal" value={formatCurrency(monthly)} />
                    <MetricMini label="Economia anual" value={formatCurrency(monthly * 12)} />
                    <MetricMini label="Envio" value={proposal.sentAt ? formatDateTime(proposal.sentAt) : "Não enviada"} />
                    <MetricMini label="Validade" value={expiresAt ? formatDateTime(expiresAt) : "Sem validade"} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-700">
                      {PROPOSAL_CARD_LABEL[status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSimulate(client.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-btn border border-ink-200 px-2 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
                    >
                      <Calculator className="h-3 w-3" strokeWidth={2.4} />
                      Nova simulação
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function DocumentsView({
  entries,
  onOpenClient,
  onUpload,
  onRequest,
}: {
  entries: DocPendingEntry[];
  onOpenClient: (clientId: string) => void;
  onUpload: (entry: DocPendingEntry) => void;
  onRequest: (entry: DocPendingEntry) => void;
}) {
  return (
    <section className="space-y-3">
      <FilterStrip labels={["Pendentes", "Enviados", "Vencidos", "Críticos", "Fatura", "Procuração", "SMF", "Outros"]} />
      {entries.length === 0 ? (
        <SectionEmpty icon={<FileWarning className="h-4 w-4" />} title="Nenhum documento pendente no momento." />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {entries.map((entry) => (
            <DocPendingRow
              key={`${entry.client.id}-${entry.type}`}
              entry={entry}
              onOpenClient={() => onOpenClient(entry.client.id)}
              onUpload={() => onUpload(entry)}
              onRequest={() => onRequest(entry)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MigrationView({
  clients,
  getClientProfile,
  alerts,
  docPendings,
  onOpenClient,
  onCreateTask,
  onRequestDoc,
}: {
  clients: Client[];
  getClientProfile: (clientId: string) => ClientProfile | null;
  alerts: MigrationAlertEntry[];
  docPendings: DocPendingEntry[];
  onOpenClient: (clientId: string) => void;
  onCreateTask: (entry: MigrationAlertEntry) => void;
  onRequestDoc: (entry: DocPendingEntry) => void;
}) {
  const migrationClients = clients
    .filter((client) => client.status === "assinado" || client.status === "migrando" || client.status === "ativo")
    .map((client) => ({ client, profile: getClientProfile(client.id) }))
    .filter((entry): entry is { client: Client; profile: ClientProfile } => !!entry.profile);

  return (
    <section className="space-y-3">
      {alerts.length > 0 && (
        <div className="rounded-card border border-ink-200 bg-white p-3">
          <h2 className="mb-2 text-[13px] font-bold text-ink-900">Alertas de migração</h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {alerts.slice(0, 6).map((entry, index) => (
              <AlertRow
                key={`${entry.client.id}-${entry.type}-${index}`}
                entry={entry}
                onOpenClient={() => onOpenClient(entry.client.id)}
                onCreateTask={() => onCreateTask(entry)}
              />
            ))}
          </ul>
        </div>
      )}
      {migrationClients.length === 0 ? (
        <SectionEmpty icon={<Workflow className="h-4 w-4" />} title="Nenhum cliente em migração ou ativo ainda." />
      ) : (
        <ul className="space-y-2">
          {migrationClients.map(({ client, profile }) => {
            const pendingStep = profile.migrationSteps.find((step) => step.status !== "concluido");
            const completed = profile.migrationSteps.filter((step) => step.status === "concluido").length;
            const progress = Math.round((completed / Math.max(1, profile.migrationSteps.length)) * 100);
            const pendingDoc = docPendings.find((entry) => entry.client.id === client.id);
            return (
              <li key={client.id} className="rounded-card border border-ink-200 bg-white p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <button type="button" onClick={() => onOpenClient(client.id)} className="min-w-0 text-left">
                    <p className="truncate text-[13px] font-bold text-ink-900">{client.companyName ?? client.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      Etapa atual: {pendingStep ? CLIENT_MIGRATION_LABEL[pendingStep.stepName] : "Ativo no Mercado Livre"}
                    </p>
                  </button>
                  <div className="min-w-0 flex-1 lg:max-w-[360px]">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-ink-500">
                      <span>Timeline</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {pendingDoc && (
                      <button
                        type="button"
                        onClick={() => onRequestDoc(pendingDoc)}
                        className={cn(
                          "inline-flex h-8 items-center gap-1 rounded-btn px-2 text-[11px] font-semibold ring-1 ring-inset",
                          SEVERITY_TONE[pendingDoc.severity],
                        )}
                      >
                        <Send className="h-3 w-3" strokeWidth={2.4} />
                        {DOC_PENDING_LABEL[pendingDoc.type]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenClient(client.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-btn border border-ink-200 px-2 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
                    >
                      <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                      Abrir timeline
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FilterStrip({ labels }: { labels: string[] }) {
  return (
    <div className="-mx-3.5 overflow-x-auto px-3.5 md:mx-0 md:px-0">
      <div className="flex min-w-max items-center gap-2">
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            className={cn(
              "inline-flex h-9 items-center rounded-btn border px-3 text-[12px] font-semibold transition-colors",
              index === 0
                ? "border-brand bg-brand text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-500">{label}</p>
      <p className="mt-0.5 truncate text-[11.5px] font-bold text-ink-900">{value}</p>
    </div>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-[76px] animate-pulse rounded-card border border-ink-200 bg-white" />
      ))}
    </div>
  );
}

function SectionError() {
  return (
    <div className="rounded-card border border-danger-200 bg-danger-50 p-4">
      <p className="text-[13px] font-semibold text-danger-700">Não foi possível carregar esta seção. Tente novamente.</p>
    </div>
  );
}

function SectionEmpty({
  title,
  icon,
  compact,
}: {
  title: string;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-ink-200 bg-white text-center text-[12.5px] font-medium text-ink-500",
        compact ? "px-3 py-4" : "px-4 py-8",
      )}
    >
      {icon && <span className="mx-auto mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500">{icon}</span>}
      <p>{title}</p>
    </div>
  );
}

function SummaryShortcut({
  label,
  value,
  icon,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "highlight";
  active?: boolean;
  onClick?: () => void;
}) {
  const isButton = !!onClick;
  const Wrap: any = isButton ? "button" : "div";

  return (
    <Wrap
      type={isButton ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col rounded-card border bg-white p-3.5 text-left transition-all",
        isButton && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-22px_rgba(17,17,17,0.25)]",
        tone === "highlight" && "border-brand/40 ring-1 ring-inset ring-brand/15",
        tone !== "highlight" && active && "border-brand/60 ring-1 ring-inset ring-brand/30",
        tone !== "highlight" && !active && "border-ink-200 hover:border-ink-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</p>
        {icon && (
          <span
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              tone === "highlight" && "bg-brand/10 text-brand",
              tone === "warn" && "bg-warning-50 text-warning-700",
              tone === "danger" && "bg-danger-50 text-danger-700",
              tone === "default" && (active ? "bg-brand/10 text-brand" : "bg-ink-100 text-ink-600"),
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-[20px] font-bold leading-[1] tracking-[-0.02em]",
          tone === "highlight" ? "text-brand" : "text-ink-900",
        )}
      >
        {value}
      </p>
      {isButton && (
        <p className="mt-1.5 text-[10.5px] text-ink-500">
          {active ? "Filtro aplicado · clique para limpar" : "Clique para filtrar"}
        </p>
      )}
    </Wrap>
  );
}

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[148px] animate-pulse rounded-card border border-ink-200 bg-white"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyStageHint({ stage, onCreate }: { stage: ClientStatus; onCreate: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-ink-200 bg-white px-3 py-5 text-center">
      <p className="text-[12px] font-medium text-ink-500">Nenhum cliente nesta etapa ainda.</p>
      {stage === "novo" && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-2.5 inline-flex h-8 items-center gap-1 rounded-btn bg-ink-900 px-2.5 text-[11.5px] font-semibold text-white hover:bg-ink-800"
        >
          <Plus className="h-3 w-3" strokeWidth={2.4} />
          Criar prospect
        </button>
      )}
    </div>
  );
}
