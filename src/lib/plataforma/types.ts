export type ConsultorProfile = {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  companyName?: string;
  paymentStatus?: string;
  paymentPlan?: string;
  paymentNextDueAt?: string;
};

export type SubscriptionStatus = "ativo" | "trial" | "expirado";

export type Subscription = {
  status: SubscriptionStatus;
  plan: string;
  trialEndsAt?: string;
  nextDueAt?: string;
};

export type ClientStatus =
  | "novo"
  | "qualificando"
  | "proposta_enviada"
  | "em_negociacao"
  | "assinado"
  | "migrando"
  | "ativo"
  | "inativo";

export type Client = {
  id: string;
  ownerId: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  locationState?: string;
  locationCity?: string;
  distributor?: string;
  segment?: string;
  monthlySavings?: number;
  status: ClientStatus;
  createdAt: string;
};

export type ClientLifecycleStatus = ClientStatus;

export type ClientProfileTag =
  | "varejista"
  | "atacadista"
  | "industria"
  | "servicos"
  | "logistica"
  | "outros";

export type Submercado = "SE/CO" | "S" | "NE" | "N";

export type Tensao = "BT" | "MT" | "AT";

export type ClientUnit = {
  id: string;
  clientId: string;
  ucCode: string;
  distribuidora: string;
  locationState?: string;
  locationCity?: string;
  submercado: Submercado;
  tensao: Tensao;
  contractedDemandKw?: number;
  tariff?: string;
  averageConsumptionKwh?: number;
  smfReady: boolean;
  contractEndAt?: string;
};

export type ClientDocumentKind =
  | "contrato_social"
  | "fatura"
  | "procuracao"
  | "denuncia_distribuidora"
  | "ccee"
  | "outros";

export type ClientDocument = {
  id: string;
  clientId: string;
  name: string;
  kind: ClientDocumentKind;
  uploadedAt: string;
  expiresAt?: string;
  sizeKb: number;
};

export type ClientActivityKind =
  | "criacao"
  | "status"
  | "segmento"
  | "nota"
  | "simulacao"
  | "proposta"
  | "documento"
  | "migracao"
  | "tarefa"
  | "contato"
  | "nba";

export type ClientActivity = {
  id: string;
  clientId: string;
  kind: ClientActivityKind;
  by: string;
  at: string;
  title: string;
  body?: string;
};

export type ClientMigrationStage =
  | "diagnostico"
  | "simulacao"
  | "proposta_enviada"
  | "proposta_aceita"
  | "denuncia"
  | "contratos"
  | "smf"
  | "ccee"
  | "ativo_ml";

export type ClientMigrationStatus = "pendente" | "em_andamento" | "concluido";

export type ClientMigrationDocument = {
  id: string;
  name: string;
  sizeKb: number;
  uploadedAt: string;
};

export type ClientMigrationStep = {
  id: string;
  clientId: string;
  stepName: ClientMigrationStage;
  status: ClientMigrationStatus;
  notes?: string;
  completedAt?: string;
  updatedAt: string;
  documents: ClientMigrationDocument[];
};

export type ClientProfile = {
  id: string;
  legalName: string;
  tradeName?: string;
  document?: string;
  profileTag?: ClientProfileTag;
  lifecycle: ClientLifecycleStatus;
  economicGroup?: string;
  units: ClientUnit[];
  documents: ClientDocument[];
  activities: ClientActivity[];
  migration: Record<ClientMigrationStage, ClientMigrationStatus>;
  migrationSteps: ClientMigrationStep[];
  lastInteractionAt?: string;
  averageConsumptionKwh?: number;
  monthlySavings?: number;
};

export type TaskPriority = "baixa" | "media" | "alta";

export type Task = {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  dueAt?: string;
  clientId?: string;
  priority: TaskPriority;
  done: boolean;
  createdAt: string;
};

export type ProposalStatus = "rascunho" | "enviada" | "aceita" | "recusada";

export type Proposal = {
  id: string;
  ownerId: string;
  clientId: string;
  title: string;
  amount: number;
  status: ProposalStatus;
  createdAt: string;
  sentAt?: string;
};

export type SimulationStatus = "rascunho" | "enviada" | "arquivada";

export type SimulationData = {
  client: {
    name: string;
    companyName?: string;
    document?: string;
    email?: string;
    phone?: string;
    address?: string;
    consumerUnit?: string;
    distributor?: string;
    locationState?: string;
    locationCity?: string;
  };
  current: {
    averageConsumptionKwh: number;
    contractedDemandKw?: number;
    monthlyCost: number;
    annualCost: number;
    averageTariffMwh: number;
    tariffModality?: string;
    billComponents: { label: string; amount: number; percent: number }[];
  };
  projected: {
    monthlyCost: number;
    annualCost: number;
    commercializer?: string;
    contractType?: string;
    energySource?: string;
    discountPercent: number;
    estimatedTariffMwh: number;
    contractTermMonths: number;
  };
  technical?: {
    submercado?: string;
    tensao?: string;
  };
};

export type SimulationResultsData = {
  monthlySavings: number;
  annualSavings: number;
  contractSavings: number;
  savingsPercent: number;
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
};

export type Simulation = {
  id: string;
  userId: string;
  clientId: string;
  simulationData: SimulationData;
  resultsData: SimulationResultsData;
  status: SimulationStatus;
  pdfUrl?: string;
  createdAt: string;
  sentAt?: string;
};

export type NotificationKind = "sistema" | "lead" | "tarefa" | "pagamento";

export type Notification = {
  id: string;
  ownerId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export type DashboardMetrics = {
  walletSavings: number;
  totalClients: number;
  proposalsSent: number;
  openTasks: number;
};
