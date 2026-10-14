"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { buildClientProfile } from "./client-profile-mock";
import { DEFAULT_CLIENT_SEGMENTS, mergeSegments, normalizeSegmentName } from "./client-segments";
import { CLIENT_MIGRATION_LABEL, CLIENT_MIGRATION_STAGES, CLIENT_STATUS_LABEL, formatCurrency } from "./format";
import { useConsultorSession } from "./session";
import type {
  Client,
  ClientActivity,
  ClientProfile,
  ClientMigrationDocument,
  ClientMigrationStage,
  ClientMigrationStatus,
  ClientMigrationStep,
  ClientStatus,
  DashboardMetrics,
  Notification,
  NotificationKind,
  Proposal,
  ProposalStatus,
  Simulation,
  SimulationData,
  SimulationResultsData,
  SimulationStatus,
  Subscription,
  SubscriptionStatus,
  Task,
  TaskPriority,
} from "./types";

type NewClient = Pick<Client, "name" | "email" | "phone"> &
  Partial<Pick<Client, "companyName" | "locationState" | "locationCity" | "distributor" | "segment" | "status">>;

type ClientPatch = Partial<
  Pick<
    Client,
    | "name"
    | "email"
    | "phone"
    | "companyName"
    | "locationState"
    | "locationCity"
    | "distributor"
    | "segment"
    | "status"
    | "monthlySavings"
  >
>;

type NewTask = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "dueAt" | "clientId" | "priority">>;

type NewProposal = Pick<Proposal, "clientId" | "title" | "amount"> &
  Partial<Pick<Proposal, "status" | "sentAt">>;

type ProposalPatch = Partial<Pick<Proposal, "title" | "amount" | "status" | "sentAt">>;

type NewSimulation = Pick<Simulation, "clientId" | "simulationData" | "resultsData"> &
  Partial<Pick<Simulation, "status" | "pdfUrl" | "sentAt">>;

type SimulationPatch = Partial<Pick<Simulation, "simulationData" | "resultsData" | "status" | "pdfUrl" | "sentAt">>;

type MigrationStepPatch = Partial<
  Pick<ClientMigrationStep, "status" | "notes" | "completedAt">
>;

type NewMigrationDocument = Pick<ClientMigrationDocument, "name" | "sizeKb">;

type NewClientActivity = Pick<ClientActivity, "kind" | "title"> &
  Partial<Pick<ClientActivity, "body" | "by">> & { metadata?: Record<string, unknown> };

export type PipelineCard = {
  id: string;
  ownerId: string;
  clientId: string;
  stage: ClientStatus;
  stageUpdatedAt: string;
  followUpAt?: string;
  position: number;
  priorityScore?: number;
  lastInteractionAt?: string;
};

export type NbaExecutionInput = {
  clientId: string;
  actionType: string;
  ctaAction: string;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  reason?: string;
  outcome?: string;
};

export type ClientDocumentRecord = {
  id: string;
  clientId: string;
  docType: string;
  status: "solicitado" | "recebido" | "aprovado" | "rejeitado" | "expirado";
  name: string;
  storagePath?: string;
  sizeKb: number;
  expiresAt?: string;
  requestedAt?: string;
  uploadedAt?: string;
  notes?: string;
  createdAt: string;
};

type Ctx = {
  ownerId: string;
  clients: Client[];
  clientSegments: string[];
  tasks: Task[];
  proposals: Proposal[];
  simulations: Simulation[];
  notifications: Notification[];
  subscription: Subscription;
  metrics: DashboardMetrics;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addClientSegment: (name: string) => string | null;
  addClient: (input: NewClient) => Promise<Client | null>;
  updateClient: (id: string, patch: ClientPatch) => Promise<Client | null>;
  updateClientMigrationStep: (
    clientId: string,
    stepName: ClientMigrationStage,
    patch: MigrationStepPatch,
  ) => Promise<ClientMigrationStep | null>;
  addClientMigrationDocument: (
    clientId: string,
    stepName: ClientMigrationStage,
    document: NewMigrationDocument,
  ) => Promise<ClientMigrationStep | null>;
  removeClient: (id: string) => Promise<boolean>;
  addTask: (input: NewTask) => Promise<Task | null>;
  toggleTask: (id: string) => Promise<void>;
  addProposal: (input: NewProposal) => Promise<Proposal | null>;
  updateProposal: (id: string, patch: ProposalPatch) => Promise<Proposal | null>;
  removeProposal: (id: string) => Promise<boolean>;
  addSimulation: (input: NewSimulation) => Promise<Simulation | null>;
  updateSimulation: (id: string, patch: SimulationPatch) => Promise<Simulation | null>;
  removeSimulation: (id: string) => Promise<boolean>;
  addClientActivity: (clientId: string, input: NewClientActivity) => Promise<ClientActivity | null>;
  removeClientActivity: (clientId: string, activityId: string) => Promise<boolean>;
  getClientProfile: (clientId: string) => ClientProfile | null;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  // Pipeline cards (CRM persistido)
  pipelineCards: Record<string, PipelineCard>;
  setPipelineFollowUp: (clientId: string, followUpAt: string | null) => Promise<void>;
  touchPipelineStage: (clientId: string) => Promise<void>;
  recordNbaExecution: (input: NbaExecutionInput) => Promise<void>;
  recordClientDocumentAction: (input: {
    clientId: string;
    docType: string;
    status: "solicitado" | "recebido";
    name?: string;
    notes?: string;
  }) => Promise<ClientDocumentRecord | null>;
};

const StoreContext = createContext<Ctx | null>(null);

type ClientRow = {
  id: string;
  account_id: string;
  created_at: string;
  name: string;
  company_name: string | null;
  email: string;
  phone: string;
  location_state: string | null;
  location_city: string | null;
  distributor: string | null;
  segment: string | null;
  monthly_savings: number | string | null;
  status: string;
};

type TaskRow = {
  id: string;
  account_id: string;
  client_id: string | null;
  created_at: string;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: TaskPriority;
  done: boolean;
};

type ProposalRow = {
  id: string;
  account_id: string;
  client_id: string;
  created_at: string;
  title: string;
  amount: number | string | null;
  status: ProposalStatus;
  sent_at: string | null;
};

type SimulationRow = {
  id: string;
  user_id: string;
  client_id: string;
  created_at: string;
  sent_at: string | null;
  simulation_data: SimulationData;
  results_data: SimulationResultsData;
  status: SimulationStatus;
  pdf_url: string | null;
};

type PipelineCardRow = {
  id: string;
  account_id: string;
  client_id: string;
  stage: string;
  stage_updated_at: string;
  follow_up_at: string | null;
  position: number;
  priority_score: number | null;
  last_interaction_at: string | null;
};

type ClientActivityRow = {
  id: string;
  account_id: string;
  client_id: string;
  created_by: string | null;
  kind: ClientActivity["kind"];
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ClientSegmentRow = {
  id: string;
  account_id: string;
  created_at: string;
  name: string;
  created_by: string | null;
};

type ClientMigrationStepRow = {
  id: string;
  client_id: string;
  step_name: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ClientMigrationDocumentRow = {
  id: string;
  migration_step_id: string;
  created_at: string;
  name: string;
  size_kb: number;
  storage_path: string | null;
};

function mapPipelineCard(row: PipelineCardRow): PipelineCard {
  return {
    id: row.id,
    ownerId: row.account_id,
    clientId: row.client_id,
    stage: normalizeClientStatus(row.stage),
    stageUpdatedAt: row.stage_updated_at,
    followUpAt: row.follow_up_at ?? undefined,
    position: row.position,
    priorityScore: row.priority_score ?? undefined,
    lastInteractionAt: row.last_interaction_at ?? undefined,
  };
}

function mapClientActivity(row: ClientActivityRow): ClientActivity {
  return {
    id: row.id,
    clientId: row.client_id,
    kind: row.kind,
    by: "Você",
    at: row.created_at,
    title: row.title,
    body: row.body ?? undefined,
  };
}

function normalizeMigrationStage(stepName: string): ClientMigrationStage {
  return CLIENT_MIGRATION_STAGES.includes(stepName as ClientMigrationStage)
    ? (stepName as ClientMigrationStage)
    : "diagnostico";
}

function normalizeMigrationStatus(status: string): ClientMigrationStatus {
  if (status === "em_andamento" || status === "concluido" || status === "pendente") {
    return status;
  }
  return "pendente";
}

function mapMigrationDocument(row: ClientMigrationDocumentRow): ClientMigrationDocument {
  return {
    id: row.id,
    name: row.name,
    sizeKb: row.size_kb,
    uploadedAt: row.created_at,
  };
}

function mapMigrationStep(
  row: ClientMigrationStepRow,
  documents: ClientMigrationDocument[] = [],
): ClientMigrationStep {
  return {
    id: row.id,
    clientId: row.client_id,
    stepName: normalizeMigrationStage(row.step_name),
    status: normalizeMigrationStatus(row.status),
    notes: row.notes ?? undefined,
    completedAt: row.completed_at ?? undefined,
    updatedAt: row.updated_at,
    documents,
  };
}

function sortMigrationSteps(steps: ClientMigrationStep[]) {
  return [...steps].sort(
    (a, b) =>
      CLIENT_MIGRATION_STAGES.indexOf(a.stepName) - CLIENT_MIGRATION_STAGES.indexOf(b.stepName),
  );
}

function upsertMigrationStepInList(
  steps: ClientMigrationStep[],
  nextStep: ClientMigrationStep,
) {
  const found = steps.some((step) => step.stepName === nextStep.stepName);
  const next = found
    ? steps.map((step) => (step.stepName === nextStep.stepName ? nextStep : step))
    : [...steps, nextStep];
  return sortMigrationSteps(next);
}

function mergeMigrationSteps(
  baseSteps: ClientMigrationStep[],
  persistedSteps: ClientMigrationStep[],
) {
  return sortMigrationSteps(
    baseSteps.map((baseStep) => {
      const persisted = persistedSteps.find((step) => step.stepName === baseStep.stepName);
      return persisted ? { ...baseStep, ...persisted } : baseStep;
    }),
  );
}

type AnnouncementRow = {
  id: string;
  created_at: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  audience: "all" | "consultor" | "comercializadora";
  published_at: string | null;
  expires_at: string | null;
  account_id: string;
  read: boolean;
  read_at: string | null;
};

function mapAnnouncement(row: AnnouncementRow): Notification {
  return {
    id: row.id,
    ownerId: row.account_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.published_at ?? row.created_at,
    read: row.read,
    href: row.href ?? undefined,
  };
}

function normalizeClientStatus(status: string): ClientStatus {
  if (status === "prospecto") return "novo";
  if (status === "perdido") return "inativo";
  if (
    status === "novo" ||
    status === "qualificando" ||
    status === "proposta_enviada" ||
    status === "em_negociacao" ||
    status === "assinado" ||
    status === "migrando" ||
    status === "ativo" ||
    status === "inativo"
  ) {
    return status;
  }
  return "novo";
}

function stepsToMigration(steps: ClientMigrationStep[]) {
  return CLIENT_MIGRATION_STAGES.reduce<Record<ClientMigrationStage, ClientMigrationStatus>>(
    (acc, stage) => {
      acc[stage] = steps.find((step) => step.stepName === stage)?.status ?? "pendente";
      return acc;
    },
    {} as Record<ClientMigrationStage, ClientMigrationStatus>,
  );
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    ownerId: row.account_id,
    name: row.name,
    companyName: row.company_name ?? undefined,
    email: row.email,
    phone: row.phone,
    locationState: row.location_state ?? undefined,
    locationCity: row.location_city ?? undefined,
    distributor: row.distributor ?? undefined,
    segment: row.segment ?? undefined,
    monthlySavings:
      row.monthly_savings === null || row.monthly_savings === undefined
        ? undefined
        : Number(row.monthly_savings),
    status: normalizeClientStatus(row.status),
    createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    ownerId: row.account_id,
    title: row.title,
    description: row.description ?? undefined,
    dueAt: row.due_at ?? undefined,
    clientId: row.client_id ?? undefined,
    priority: row.priority,
    done: row.done,
    createdAt: row.created_at,
  };
}

function mapProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    ownerId: row.account_id,
    clientId: row.client_id,
    title: row.title,
    amount: Number(row.amount ?? 0),
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? undefined,
  };
}

function mapSimulation(row: SimulationRow): Simulation {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    simulationData: row.simulation_data,
    resultsData: row.results_data,
    status: row.status,
    pdfUrl: row.pdf_url ?? undefined,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? undefined,
  };
}

function mapSubscription(paymentStatus?: string, paymentPlan?: string, paymentNextDueAt?: string): Subscription {
  const statusByPayment: Record<string, SubscriptionStatus> = {
    em_dia: "ativo",
    trial: "trial",
    pendente: "expirado",
    atrasado: "expirado",
    cancelado: "expirado",
    nao_iniciado: "trial",
  };

  return {
    status: statusByPayment[paymentStatus ?? ""] ?? "trial",
    plan: paymentPlan || "musclePro Consultor",
    nextDueAt: paymentNextDueAt,
    trialEndsAt: paymentStatus === "trial" ? paymentNextDueAt : undefined,
  };
}

function isMissingTableError(error?: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("schema cache") ||
    error.message?.toLowerCase().includes("could not find the table")
  );
}

export function PlataformaStoreProvider({ children }: { children: ReactNode }) {
  const { profile } = useConsultorSession();
  const ownerId = profile?.id ?? "";
  const authUserId = profile?.authUserId ?? "";

  const [clients, setClients] = useState<Client[]>([]);
  const [customSegments, setCustomSegments] = useState<string[]>([]);
  const [migrationStepOverrides, setMigrationStepOverrides] = useState<Record<string, ClientMigrationStep[]>>({});
  const [clientActivities, setClientActivities] = useState<Record<string, ClientActivity[]>>({});
  const [pipelineCards, setPipelineCards] = useState<Record<string, PipelineCard>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscription = useMemo(
    () => mapSubscription(profile?.paymentStatus, profile?.paymentPlan, profile?.paymentNextDueAt),
    [profile?.paymentNextDueAt, profile?.paymentPlan, profile?.paymentStatus],
  );

  const clientSegments = useMemo(
    () => mergeSegments([...DEFAULT_CLIENT_SEGMENTS], customSegments, clients.map((c) => c.segment)),
    [clients, customSegments],
  );

  const refresh = useCallback(async () => {
    if (!ownerId) return;

    setLoading(true);
    setError(null);

    const [
      clientsResult,
      tasksResult,
      proposalsResult,
      simulationsResult,
      pipelineCardsResult,
      activitiesResult,
      segmentsResult,
      migrationStepsResult,
      migrationDocumentsResult,
    ] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("proposals").select("*").order("created_at", { ascending: false }),
      supabase.from("simulations").select("*").order("created_at", { ascending: false }),
      supabase.from("pipeline_cards").select("*"),
      supabase.from("client_activities").select("*").order("created_at", { ascending: false }),
      supabase.from("client_segments").select("*").order("name", { ascending: true }),
      supabase.from("client_migration_steps").select("*").order("updated_at", { ascending: false }),
      supabase.from("client_migration_documents").select("*").order("created_at", { ascending: false }),
    ]);

    const simulationsTableMissing = isMissingTableError(simulationsResult.error);
    const pipelineCardsTableMissing = isMissingTableError(pipelineCardsResult.error);
    const activitiesTableMissing = isMissingTableError(activitiesResult.error);
    const segmentsTableMissing = isMissingTableError(segmentsResult.error);
    const migrationStepsTableMissing = isMissingTableError(migrationStepsResult.error);
    const migrationDocumentsTableMissing = isMissingTableError(migrationDocumentsResult.error);

    if (
      clientsResult.error ||
      tasksResult.error ||
      proposalsResult.error ||
      (simulationsResult.error && !simulationsTableMissing) ||
      (pipelineCardsResult.error && !pipelineCardsTableMissing) ||
      (activitiesResult.error && !activitiesTableMissing) ||
      (segmentsResult.error && !segmentsTableMissing) ||
      (migrationStepsResult.error && !migrationStepsTableMissing) ||
      (migrationDocumentsResult.error && !migrationDocumentsTableMissing)
    ) {
      const firstBlockingError =
        clientsResult.error ??
        tasksResult.error ??
        proposalsResult.error ??
        (!simulationsTableMissing ? simulationsResult.error : null) ??
        (!pipelineCardsTableMissing ? pipelineCardsResult.error : null) ??
        (!activitiesTableMissing ? activitiesResult.error : null) ??
        (!segmentsTableMissing ? segmentsResult.error : null) ??
        (!migrationStepsTableMissing ? migrationStepsResult.error : null) ??
        (!migrationDocumentsTableMissing ? migrationDocumentsResult.error : null);
      setError(
        firstBlockingError?.message ?? "Não foi possível carregar a plataforma.",
      );
      setLoading(false);
      return;
    }

    setClients((clientsResult.data ?? []).map((row) => mapClient(row as ClientRow)));
    setTasks((tasksResult.data ?? []).map((row) => mapTask(row as TaskRow)));
    setProposals((proposalsResult.data ?? []).map((row) => mapProposal(row as ProposalRow)));
    setSimulations(
      simulationsTableMissing
        ? []
        : (simulationsResult.data ?? []).map((row) => mapSimulation(row as SimulationRow)),
    );
    setCustomSegments(
      segmentsTableMissing
        ? []
        : mergeSegments((segmentsResult.data ?? []).map((row) => (row as ClientSegmentRow).name)),
    );

    if (!pipelineCardsTableMissing) {
      const cardMap: Record<string, PipelineCard> = {};
      (pipelineCardsResult.data ?? []).forEach((row) => {
        const card = mapPipelineCard(row as PipelineCardRow);
        cardMap[card.clientId] = card;
      });
      setPipelineCards(cardMap);
    } else {
      setPipelineCards({});
    }

    if (!activitiesTableMissing) {
      const grouped: Record<string, ClientActivity[]> = {};
      (activitiesResult.data ?? []).forEach((row) => {
        const act = mapClientActivity(row as ClientActivityRow);
        if (!grouped[act.clientId]) grouped[act.clientId] = [];
        grouped[act.clientId].push(act);
      });
      setClientActivities(grouped);
    } else {
      setClientActivities({});
    }

    if (!migrationStepsTableMissing) {
      const documentsByStep: Record<string, ClientMigrationDocument[]> = {};
      if (!migrationDocumentsTableMissing) {
        (migrationDocumentsResult.data ?? []).forEach((row) => {
          const documentRow = row as ClientMigrationDocumentRow;
          if (!documentsByStep[documentRow.migration_step_id]) {
            documentsByStep[documentRow.migration_step_id] = [];
          }
          documentsByStep[documentRow.migration_step_id].push(mapMigrationDocument(documentRow));
        });
      }

      const groupedSteps: Record<string, ClientMigrationStep[]> = {};
      (migrationStepsResult.data ?? []).forEach((row) => {
        const stepRow = row as ClientMigrationStepRow;
        const step = mapMigrationStep(stepRow, documentsByStep[stepRow.id] ?? []);
        groupedSteps[step.clientId] = upsertMigrationStepInList(groupedSteps[step.clientId] ?? [], step);
      });
      setMigrationStepOverrides(groupedSteps);
    } else {
      setMigrationStepOverrides({});
    }

    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    void refresh();
  }, [ownerId, refresh]);

  const refreshNotifications = useCallback(async () => {
    if (!ownerId) return;
    const { data, error: fetchError } = await supabase
      .from("v_my_announcements")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(40);

    if (fetchError) {
      setNotifications([]);
      return;
    }

    setNotifications((data ?? []).map((row) => mapAnnouncement(row as AnnouncementRow)));
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) {
      setNotifications([]);
      return;
    }

    void refreshNotifications();

    const channel = supabase
      .channel(`announcements:${ownerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_announcements" },
        () => {
          void refreshNotifications();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_announcement_reads",
          filter: `account_id=eq.${ownerId}`,
        },
        () => {
          void refreshNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ownerId, refreshNotifications]);

  const pushActivity = useCallback(
    async (clientId: string, input: NewClientActivity): Promise<ClientActivity | null> => {
      if (!ownerId) return null;

      const { data, error: insertError } = await supabase
        .from("client_activities")
        .insert({
          account_id: ownerId,
          client_id: clientId,
          created_by: authUserId || null,
          kind: input.kind,
          title: input.title,
          body: input.body ?? null,
          metadata: input.metadata ?? null,
        })
        .select("*")
        .single();

      if (insertError || !data) {
        if (isMissingTableError(insertError)) {
          const fallback: ClientActivity = {
            id: `${clientId}-act-${input.kind}-${Date.now()}`,
            clientId,
            kind: input.kind,
            by: input.by ?? "Você",
            at: new Date().toISOString(),
            title: input.title,
            body: input.body,
          };
          setClientActivities((prev) => ({
            ...prev,
            [clientId]: [fallback, ...(prev[clientId] ?? [])],
          }));
          return fallback;
        }
        setError(insertError?.message ?? "Não foi possível registrar a atividade.");
        return null;
      }

      const activity = mapClientActivity(data as ClientActivityRow);
      setClientActivities((prev) => ({
        ...prev,
        [clientId]: [activity, ...(prev[clientId] ?? [])],
      }));
      return activity;
    },
    [ownerId, authUserId],
  );

  const addClientSegment = useCallback<Ctx["addClientSegment"]>((name) => {
    const segment = normalizeSegmentName(name);
    if (!segment) return null;
    setCustomSegments((prev) => mergeSegments(prev, [segment]));
    if (ownerId && authUserId) {
      void supabase
        .from("client_segments")
        .upsert(
          {
            account_id: ownerId,
            name: segment,
            created_by: authUserId,
          },
          { onConflict: "account_id,name", ignoreDuplicates: true },
        )
        .then(({ error: upsertError }) => {
          if (upsertError && !isMissingTableError(upsertError)) {
            setError(upsertError.message);
          }
        });
    }
    return segment;
  }, [authUserId, ownerId]);

  const addClient = useCallback<Ctx["addClient"]>(
    async (input) => {
      if (!ownerId) return null;

      const { data, error: insertError } = await supabase
        .from("clients")
        .insert({
          account_id: ownerId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          company_name: input.companyName ?? null,
          location_state: input.locationState ?? null,
          location_city: input.locationCity ?? null,
          distributor: input.distributor ?? null,
          segment: input.segment ?? null,
          status: input.status ?? "novo",
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      setError(null);
      const client = mapClient(data as ClientRow);
      if (client.segment) addClientSegment(client.segment);
      setClients((prev) => [client, ...prev]);
      return client;
    },
    [addClientSegment, ownerId],
  );

  const addTask = useCallback<Ctx["addTask"]>(
    async (input) => {
      if (!ownerId) return null;

      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          account_id: ownerId,
          title: input.title,
          description: input.description ?? null,
          due_at: input.dueAt ?? null,
          client_id: input.clientId ?? null,
          priority: input.priority ?? "media",
          done: false,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      setError(null);
      const task = mapTask(data as TaskRow);
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [ownerId],
  );

  const updateClient = useCallback<Ctx["updateClient"]>(
    async (id, patch) => {
      if (!ownerId) return null;
      const previous = clients.find((c) => c.id === id);

      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.email !== undefined) payload.email = patch.email;
      if (patch.phone !== undefined) payload.phone = patch.phone;
      if (patch.companyName !== undefined) payload.company_name = patch.companyName ?? null;
      if (patch.locationState !== undefined) payload.location_state = patch.locationState ?? null;
      if (patch.locationCity !== undefined) payload.location_city = patch.locationCity ?? null;
      if (patch.distributor !== undefined) payload.distributor = patch.distributor ?? null;
      if (patch.segment !== undefined) payload.segment = patch.segment ?? null;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.monthlySavings !== undefined) payload.monthly_savings = patch.monthlySavings ?? null;

      const { data, error: updateError } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError || !data) {
        setError(updateError?.message ?? "Não foi possível atualizar o cliente.");
        return null;
      }

      setError(null);
      const client = mapClient(data as ClientRow);
      if (client.segment) addClientSegment(client.segment);
      setClients((prev) => prev.map((c) => (c.id === id ? client : c)));
      if (previous && patch.segment !== undefined && patch.segment !== previous.segment) {
        const segment = patch.segment || "Sem segmento";
        void pushActivity(id, {
          kind: "segmento",
          title: `Segmento atualizado para ${segment}`,
        });
      }
      if (previous && patch.status !== undefined && patch.status !== previous.status) {
        const nextStatus = patch.status;
        void pushActivity(id, {
          kind: "status",
          title: `Status atualizado para ${CLIENT_STATUS_LABEL[nextStatus]}`,
        });
      }
      return client;
    },
    [addClientSegment, clients, ownerId, pushActivity],
  );

  const getBaseMigrationSteps = useCallback(
    (clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return null;
      return mergeMigrationSteps(
        buildClientProfile(client, tasks, proposals).migrationSteps,
        migrationStepOverrides[clientId] ?? [],
      );
    },
    [clients, migrationStepOverrides, proposals, tasks],
  );

  const updateClientMigrationStep = useCallback<Ctx["updateClientMigrationStep"]>(
    async (clientId, stepName, patch) => {
      const currentSteps = getBaseMigrationSteps(clientId);
      if (!currentSteps) return null;

      const now = new Date().toISOString();
      const currentStep = currentSteps.find((step) => step.stepName === stepName);
      if (!currentStep) return null;
      const updatedStep: ClientMigrationStep = {
        ...currentStep,
        ...patch,
        completedAt:
          patch.status === "concluido"
            ? patch.completedAt ?? currentStep.completedAt ?? now
            : patch.status
              ? undefined
              : patch.completedAt !== undefined
                ? patch.completedAt
                : currentStep.completedAt,
        updatedAt: now,
      };
      const previousPersistedSteps = migrationStepOverrides[clientId] ?? [];
      setMigrationStepOverrides((prev) => ({
        ...prev,
        [clientId]: upsertMigrationStepInList(prev[clientId] ?? [], updatedStep),
      }));

      const { data, error: upsertError } = await supabase
        .from("client_migration_steps")
        .upsert(
          {
            client_id: clientId,
            step_name: stepName,
            status: updatedStep.status,
            notes: updatedStep.notes ?? null,
            completed_at: updatedStep.completedAt ?? null,
            updated_at: now,
          },
          { onConflict: "client_id,step_name" },
        )
        .select("*")
        .single();

      if (upsertError || !data) {
        if (!isMissingTableError(upsertError)) {
          setError(upsertError?.message ?? "Não foi possível atualizar a etapa de migração.");
        }
        setMigrationStepOverrides((prev) => ({ ...prev, [clientId]: previousPersistedSteps }));
        return null;
      }

      const persistedStep = mapMigrationStep(
        data as ClientMigrationStepRow,
        currentStep.documents,
      );
      setMigrationStepOverrides((prev) => ({
        ...prev,
        [clientId]: upsertMigrationStepInList(prev[clientId] ?? [], persistedStep),
      }));
      setError(null);

      const statusLabel =
        persistedStep.status === "concluido"
          ? "concluída"
          : persistedStep.status === "em_andamento"
            ? "marcada como em andamento"
            : "marcada como pendente";

      void pushActivity(clientId, {
        kind: "migracao",
        title: `Etapa "${CLIENT_MIGRATION_LABEL[stepName]}" ${statusLabel}`,
        body: patch.notes,
      });

      return persistedStep;
    },
    [getBaseMigrationSteps, migrationStepOverrides, pushActivity],
  );

  const addClientMigrationDocument = useCallback<Ctx["addClientMigrationDocument"]>(
    async (clientId, stepName, document) => {
      const currentSteps = getBaseMigrationSteps(clientId);
      if (!currentSteps) return null;

      const now = new Date().toISOString();
      const currentStep = currentSteps.find((step) => step.stepName === stepName);
      if (!currentStep) return null;
      const nextDocument: ClientMigrationDocument = {
        id: `${clientId}-${stepName}-doc-${Date.now()}`,
        name: document.name,
        sizeKb: document.sizeKb,
        uploadedAt: now,
      };
      const updatedStep: ClientMigrationStep = {
        ...currentStep,
        updatedAt: now,
        documents: [nextDocument, ...currentStep.documents],
      };

      const previousPersistedSteps = migrationStepOverrides[clientId] ?? [];
      setMigrationStepOverrides((prev) => ({
        ...prev,
        [clientId]: upsertMigrationStepInList(prev[clientId] ?? [], updatedStep),
      }));

      const { data: stepData, error: stepError } = await supabase
        .from("client_migration_steps")
        .upsert(
          {
            client_id: clientId,
            step_name: stepName,
            status: currentStep.status,
            notes: currentStep.notes ?? null,
            completed_at: currentStep.completedAt ?? null,
            updated_at: now,
          },
          { onConflict: "client_id,step_name" },
        )
        .select("*")
        .single();

      if (stepError || !stepData) {
        if (!isMissingTableError(stepError)) {
          setError(stepError?.message ?? "Não foi possível preparar a etapa de migração.");
        }
        setMigrationStepOverrides((prev) => ({ ...prev, [clientId]: previousPersistedSteps }));
        return null;
      }

      const persistedStep = mapMigrationStep(stepData as ClientMigrationStepRow, currentStep.documents);
      const { data: documentData, error: documentError } = await supabase
        .from("client_migration_documents")
        .insert({
          migration_step_id: persistedStep.id,
          name: document.name,
          size_kb: document.sizeKb,
        })
        .select("*")
        .single();

      if (documentError || !documentData) {
        if (!isMissingTableError(documentError)) {
          setError(documentError?.message ?? "Não foi possível anexar o documento.");
        }
        setMigrationStepOverrides((prev) => ({ ...prev, [clientId]: previousPersistedSteps }));
        return null;
      }

      const persistedDocument = mapMigrationDocument(documentData as ClientMigrationDocumentRow);
      const nextStep = {
        ...persistedStep,
        documents: [persistedDocument, ...persistedStep.documents],
      };

      setMigrationStepOverrides((prev) => ({
        ...prev,
        [clientId]: upsertMigrationStepInList(prev[clientId] ?? [], nextStep),
      }));
      setError(null);

      void pushActivity(clientId, {
        kind: "documento",
        title: `Documento anexado em "${CLIENT_MIGRATION_LABEL[stepName]}"`,
        body: document.name,
      });

      return nextStep;
    },
    [getBaseMigrationSteps, migrationStepOverrides, pushActivity],
  );

  const removeClient = useCallback<Ctx["removeClient"]>(
    async (id) => {
      if (!ownerId) return false;
      const previousClients = clients;
      const previousTasks = tasks;
      const previousProposals = proposals;
      const previousSimulations = simulations;

      setClients((prev) => prev.filter((c) => c.id !== id));
      setTasks((prev) =>
        prev.map((t) => (t.clientId === id ? { ...t, clientId: undefined } : t)),
      );
      setProposals((prev) => prev.filter((p) => p.clientId !== id));
      setSimulations((prev) => prev.filter((s) => s.clientId !== id));

      const { error: deleteError } = await supabase.from("clients").delete().eq("id", id);

      if (deleteError) {
        setError(deleteError.message);
        setClients(previousClients);
        setTasks(previousTasks);
        setProposals(previousProposals);
        setSimulations(previousSimulations);
        return false;
      }

      setError(null);
      return true;
    },
    [clients, ownerId, proposals, simulations, tasks],
  );

  const addProposal = useCallback<Ctx["addProposal"]>(
    async (input) => {
      if (!ownerId) return null;

      const { data, error: insertError } = await supabase
        .from("proposals")
        .insert({
          account_id: ownerId,
          client_id: input.clientId,
          title: input.title,
          amount: input.amount,
          status: input.status ?? "rascunho",
          sent_at: input.sentAt ?? null,
        })
        .select("*")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Não foi possível criar a proposta.");
        return null;
      }

      setError(null);
      const proposal = mapProposal(data as ProposalRow);
      setProposals((prev) => [proposal, ...prev]);
      return proposal;
    },
    [ownerId],
  );

  const updateProposal = useCallback<Ctx["updateProposal"]>(
    async (id, patch) => {
      if (!ownerId) return null;

      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.amount !== undefined) payload.amount = patch.amount;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.sentAt !== undefined) payload.sent_at = patch.sentAt ?? null;

      const { data, error: updateError } = await supabase
        .from("proposals")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError || !data) {
        setError(updateError?.message ?? "Não foi possível atualizar a proposta.");
        return null;
      }

      setError(null);
      const proposal = mapProposal(data as ProposalRow);
      setProposals((prev) => prev.map((p) => (p.id === id ? proposal : p)));
      return proposal;
    },
    [ownerId],
  );

  const removeProposal = useCallback<Ctx["removeProposal"]>(
    async (id) => {
      const previous = proposals;
      setProposals((prev) => prev.filter((p) => p.id !== id));

      const { error: deleteError } = await supabase.from("proposals").delete().eq("id", id);
      if (deleteError) {
        setError(deleteError.message);
        setProposals(previous);
        return false;
      }
      setError(null);
      return true;
    },
    [proposals],
  );

  const addSimulation = useCallback<Ctx["addSimulation"]>(
    async (input) => {
      if (!authUserId) return null;

      const { data, error: insertError } = await supabase
        .from("simulations")
        .insert({
          user_id: authUserId,
          client_id: input.clientId,
          simulation_data: input.simulationData,
          results_data: input.resultsData,
          status: input.status ?? "rascunho",
          pdf_url: input.pdfUrl ?? null,
          sent_at: input.sentAt ?? null,
        })
        .select("*")
        .single();

      if (insertError || !data) {
        setError(
          isMissingTableError(insertError)
            ? "A tabela de simulações ainda não foi publicada no Supabase."
            : insertError?.message ?? "Não foi possível salvar a simulação.",
        );
        return null;
      }

      setError(null);
      const simulation = mapSimulation(data as SimulationRow);
      setSimulations((prev) => [simulation, ...prev]);
      return simulation;
    },
    [authUserId],
  );

  const updateSimulation = useCallback<Ctx["updateSimulation"]>(
    async (id, patch) => {
      if (!authUserId) return null;

      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.simulationData !== undefined) payload.simulation_data = patch.simulationData;
      if (patch.resultsData !== undefined) payload.results_data = patch.resultsData;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.pdfUrl !== undefined) payload.pdf_url = patch.pdfUrl ?? null;
      if (patch.sentAt !== undefined) payload.sent_at = patch.sentAt ?? null;

      const { data, error: updateError } = await supabase
        .from("simulations")
        .update(payload)
        .eq("id", id)
        .eq("user_id", authUserId)
        .select("*")
        .single();

      if (updateError || !data) {
        setError(
          isMissingTableError(updateError)
            ? "A tabela de simulações ainda não foi publicada no Supabase."
            : updateError?.message ?? "Não foi possível atualizar a simulação.",
        );
        return null;
      }

      setError(null);
      const simulation = mapSimulation(data as SimulationRow);
      setSimulations((prev) => prev.map((s) => (s.id === id ? simulation : s)));
      return simulation;
    },
    [authUserId],
  );

  const removeSimulation = useCallback<Ctx["removeSimulation"]>(
    async (id) => {
      if (!authUserId) return false;

      const previous = simulations;
      setSimulations((prev) => prev.filter((s) => s.id !== id));

      const { error: deleteError } = await supabase
        .from("simulations")
        .delete()
        .eq("id", id)
        .eq("user_id", authUserId);

      if (deleteError) {
        setError(
          isMissingTableError(deleteError)
            ? "A tabela de simulações ainda não foi publicada no Supabase."
            : deleteError.message,
        );
        setSimulations(previous);
        return false;
      }

      setError(null);
      return true;
    },
    [authUserId, simulations],
  );

  const toggleTask = useCallback<Ctx["toggleTask"]>(async (id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ done: !current.done, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setTasks((prev) => prev.map((t) => (t.id === id ? current : t)));
      return;
    }

    setError(null);
  }, [tasks]);

  const addClientActivity = useCallback<Ctx["addClientActivity"]>(
    (clientId, input) => pushActivity(clientId, input),
    [pushActivity],
  );

  const removeClientActivity = useCallback<Ctx["removeClientActivity"]>(
    async (clientId, activityId) => {
      const current = clientActivities[clientId] ?? [];
      if (!current.some((a) => a.id === activityId)) return false;

      const previous = current;
      setClientActivities((prev) => ({
        ...prev,
        [clientId]: (prev[clientId] ?? []).filter((a) => a.id !== activityId),
      }));

      const { error: deleteError } = await supabase
        .from("client_activities")
        .delete()
        .eq("id", activityId);

      if (deleteError && !isMissingTableError(deleteError)) {
        setError(deleteError.message);
        setClientActivities((prev) => ({ ...prev, [clientId]: previous }));
        return false;
      }
      return true;
    },
    [clientActivities],
  );

  const setPipelineFollowUp = useCallback<Ctx["setPipelineFollowUp"]>(
    async (clientId, followUpAt) => {
      if (!ownerId) return;
      const nowIso = new Date().toISOString();
      const previous = pipelineCards[clientId];
      // Optimistic update
      setPipelineCards((prev) => {
        const card = prev[clientId];
        if (!card) {
          return {
            ...prev,
            [clientId]: {
              id: `local-${clientId}`,
              ownerId,
              clientId,
              stage: clients.find((c) => c.id === clientId)?.status ?? "novo",
              stageUpdatedAt: nowIso,
              followUpAt: followUpAt ?? undefined,
              position: 0,
            },
          };
        }
        return { ...prev, [clientId]: { ...card, followUpAt: followUpAt ?? undefined } };
      });

      const { data, error: upsertError } = await supabase
        .from("pipeline_cards")
        .upsert(
          {
            account_id: ownerId,
            client_id: clientId,
            follow_up_at: followUpAt,
          },
          { onConflict: "client_id" },
        )
        .select("*")
        .single();

      if (upsertError) {
        if (!isMissingTableError(upsertError)) {
          setError(upsertError.message);
        }
        if (previous) {
          setPipelineCards((prev) => ({ ...prev, [clientId]: previous }));
        }
        return;
      }
      if (data) {
        const card = mapPipelineCard(data as PipelineCardRow);
        setPipelineCards((prev) => ({ ...prev, [clientId]: card }));
      }
    },
    [ownerId, pipelineCards, clients],
  );

  const touchPipelineStage = useCallback<Ctx["touchPipelineStage"]>(
    async (clientId) => {
      if (!ownerId) return;
      const nowIso = new Date().toISOString();
      setPipelineCards((prev) => {
        const card = prev[clientId];
        if (!card) return prev;
        return { ...prev, [clientId]: { ...card, stageUpdatedAt: nowIso } };
      });
      const { error: upsertError } = await supabase
        .from("pipeline_cards")
        .upsert(
          {
            account_id: ownerId,
            client_id: clientId,
            stage_updated_at: nowIso,
          },
          { onConflict: "client_id" },
        );
      if (upsertError && !isMissingTableError(upsertError)) {
        setError(upsertError.message);
      }
    },
    [ownerId],
  );

  const recordNbaExecution = useCallback<Ctx["recordNbaExecution"]>(
    async (input) => {
      if (!ownerId) return;
      const { error: insertError } = await supabase.from("nba_executions").insert({
        account_id: ownerId,
        client_id: input.clientId,
        executed_by: authUserId || null,
        action_type: input.actionType,
        cta_action: input.ctaAction,
        priority: input.priority,
        title: input.title,
        reason: input.reason ?? null,
        outcome: input.outcome ?? null,
      });
      if (insertError && !isMissingTableError(insertError)) {
        setError(insertError.message);
      }
    },
    [ownerId, authUserId],
  );

  const recordClientDocumentAction = useCallback<Ctx["recordClientDocumentAction"]>(
    async (input) => {
      if (!ownerId) return null;
      const nowIso = new Date().toISOString();
      const { data, error: insertError } = await supabase
        .from("client_documents")
        .insert({
          account_id: ownerId,
          client_id: input.clientId,
          uploaded_by: authUserId || null,
          doc_type: input.docType,
          status: input.status,
          name: input.name ?? input.docType,
          notes: input.notes ?? null,
          requested_at: input.status === "solicitado" ? nowIso : null,
          uploaded_at: input.status === "recebido" ? nowIso : null,
        })
        .select("*")
        .single();

      if (insertError) {
        if (!isMissingTableError(insertError)) {
          setError(insertError.message);
        }
        return null;
      }
      if (!data) return null;
      const row = data as {
        id: string;
        client_id: string;
        doc_type: string;
        status: ClientDocumentRecord["status"];
        name: string;
        storage_path: string | null;
        size_kb: number;
        expires_at: string | null;
        requested_at: string | null;
        uploaded_at: string | null;
        notes: string | null;
        created_at: string;
      };
      return {
        id: row.id,
        clientId: row.client_id,
        docType: row.doc_type,
        status: row.status,
        name: row.name,
        storagePath: row.storage_path ?? undefined,
        sizeKb: row.size_kb,
        expiresAt: row.expires_at ?? undefined,
        requestedAt: row.requested_at ?? undefined,
        uploadedAt: row.uploaded_at ?? undefined,
        notes: row.notes ?? undefined,
        createdAt: row.created_at,
      };
    },
    [ownerId, authUserId],
  );

  const getClientProfile = useCallback<Ctx["getClientProfile"]>(
    (clientId) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return null;
      const base = buildClientProfile(client, tasks, proposals);
      const migrationSteps = mergeMigrationSteps(base.migrationSteps, migrationStepOverrides[clientId] ?? []);
      const simulationActivities: ClientActivity[] = simulations
        .filter((simulation) => simulation.clientId === clientId)
        .map((simulation) => ({
          id: `${clientId}-act-simulation-${simulation.id}`,
          clientId,
          kind: "simulacao",
          by: "Você",
          at: simulation.createdAt,
          title:
            simulation.status === "enviada"
              ? "Simulação enviada"
              : "Simulação registrada",
          body: `${formatCurrency(simulation.resultsData.monthlySavings)}/mês de economia estimada`,
        }));
      const activities = [
        ...(clientActivities[clientId] ?? []),
        ...simulationActivities,
        ...base.activities,
      ].sort(
        (a, b) => +new Date(b.at) - +new Date(a.at),
      );

      return {
        ...base,
        activities,
        migrationSteps,
        migration: stepsToMigration(migrationSteps),
        lastInteractionAt: activities[0]?.at ?? base.lastInteractionAt,
      };
    },
    [clientActivities, clients, migrationStepOverrides, proposals, simulations, tasks],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (!ownerId) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase
        .from("platform_announcement_reads")
        .upsert(
          { announcement_id: id, account_id: ownerId },
          { onConflict: "announcement_id,account_id", ignoreDuplicates: true },
        );
    },
    [ownerId],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!ownerId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.rpc("mark_all_announcements_read");
  }, [ownerId]);

  const metrics = useMemo<DashboardMetrics>(() => {
    const walletSavings = clients
      .filter((c) => c.status === "ativo")
      .reduce((acc, c) => acc + (c.monthlySavings ?? 0), 0);
    const totalClients = clients.length;
    const proposalsSent = proposals.filter((p) => p.status !== "rascunho").length;
    const openTasks = tasks.filter((t) => !t.done).length;
    return { walletSavings, totalClients, proposalsSent, openTasks };
  }, [clients, tasks, proposals]);

  const value = useMemo<Ctx>(
    () => ({
      ownerId,
      clients,
      clientSegments,
      tasks,
      proposals,
      simulations,
      notifications,
      subscription,
      metrics,
      loading,
      error,
      refresh,
      addClientSegment,
      addClient,
      updateClient,
      updateClientMigrationStep,
      addClientMigrationDocument,
      removeClient,
      addTask,
      toggleTask,
      addProposal,
      updateProposal,
      removeProposal,
      addSimulation,
      updateSimulation,
      removeSimulation,
      addClientActivity,
      removeClientActivity,
      getClientProfile,
      markNotificationRead,
      markAllNotificationsRead,
      pipelineCards,
      setPipelineFollowUp,
      touchPipelineStage,
      recordNbaExecution,
      recordClientDocumentAction,
    }),
    [
      ownerId,
      clients,
      clientSegments,
      tasks,
      proposals,
      simulations,
      notifications,
      subscription,
      metrics,
      loading,
      error,
      refresh,
      addClientSegment,
      addClient,
      updateClient,
      updateClientMigrationStep,
      addClientMigrationDocument,
      removeClient,
      addTask,
      toggleTask,
      addProposal,
      updateProposal,
      removeProposal,
      addSimulation,
      updateSimulation,
      removeSimulation,
      addClientActivity,
      removeClientActivity,
      getClientProfile,
      markNotificationRead,
      markAllNotificationsRead,
      pipelineCards,
      setPipelineFollowUp,
      touchPipelineStage,
      recordNbaExecution,
      recordClientDocumentAction,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePlataformaStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("usePlataformaStore must be used inside PlataformaStoreProvider");
  return ctx;
}
