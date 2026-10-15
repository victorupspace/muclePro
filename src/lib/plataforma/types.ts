// Modelo de domínio da plataforma: um estabelecimento (conta) com filiais,
// equipe, planos, alunos, cobranças e tarefas. Espelha o schema em
// supabase/migrations/20261014000000_musclepro_schema.sql.

export type BusinessType = "academia" | "estudio" | "natacao" | "crossfit" | "lutas" | "outro";

export type DocumentType = "cnpj" | "cpf";

// O que o usuário logado pode fazer. Espelha as funções current_* do banco,
// que são quem de fato aplica as regras (RLS); aqui servem para a interface
// esconder o que o usuário não pode usar.
export type Permissions = {
  // dono da conta ou perfil "gestão"
  isManager: boolean;
  canRegisterStudents: boolean;
  // cobranças: criar, receber, cancelar, trocar plano
  canSendPaymentLinks: boolean;
  canCreateWorkouts: boolean;
  canManageTeam: boolean;
  canManagePlans: boolean;
  canManageUnits: boolean;
  canDeleteRecords: boolean;
  // dados da empresa: só o dono
  canManageCompany: boolean;
};

export type AccountProfile = {
  id: string;
  authUserId: string;
  isOwner: boolean;
  staffId?: string;
  staffRole?: StaffRole;
  staffRoleLabel?: string;
  // Unidade que limita o que o funcionário enxerga (undefined = todas).
  unitScopeId?: string;
  permissions: Permissions;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  businessType?: BusinessType;
  documentType?: DocumentType;
  document?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  paymentStatus?: string;
  paymentPlan?: string;
  paymentNextDueAt?: string;
};

export type CompanyProfilePatch = {
  companyName: string;
  businessType: BusinessType;
  documentType: DocumentType;
  document: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export type SubscriptionStatus = "ativo" | "trial" | "expirado";

export type Subscription = {
  status: SubscriptionStatus;
  plan: string;
  trialEndsAt?: string;
  nextDueAt?: string;
};

// ───────────────────────────── filiais ─────────────────────────────────────

export type Unit = {
  id: string;
  accountId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  isMain: boolean;
  active: boolean;
  createdAt: string;
};

// ───────────────────────────── equipe ──────────────────────────────────────

export type StaffRole = "gestao" | "recepcao" | "contabilidade" | "personal" | "outro";

export type Staff = {
  id: string;
  accountId: string;
  unitId?: string;
  authUserId?: string;
  fullName: string;
  cpf?: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  roleLabel?: string;
  startedAt?: string;
  endedAt?: string;
  canRegisterStudents: boolean;
  canSendPaymentLinks: boolean;
  canCreateWorkouts: boolean;
  active: boolean;
  notes?: string;
  accessInvitedAt?: string;
  accessAcceptedAt?: string;
  createdAt: string;
};

// Situação do login do funcionário.
export type StaffAccessState = "sem_acesso" | "convite_pendente" | "com_acesso";

// ───────────────────────────── planos ──────────────────────────────────────

export type PlanFrequency = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

export type Plan = {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  frequency: PlanFrequency;
  description?: string;
  active: boolean;
  createdAt: string;
};

// ───────────────────────────── alunos ──────────────────────────────────────

export type StudentStatus = "ativo" | "inativo";

export type ChurnReason = "preco" | "mudanca" | "horario" | "saude" | "insatisfacao" | "financeiro" | "outro";

export type Student = {
  id: string;
  accountId: string;
  unitId?: string;
  planId?: string;
  fullName: string;
  cpf?: string;
  birthDate?: string;
  whatsapp?: string;
  email?: string;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: StudentStatus;
  planStartedAt?: string;
  notes?: string;
  churnReason?: ChurnReason;
  churnNotes?: string;
  churnedAt?: string;
  createdAt: string;
  updatedAt: string;
};

// ───────────────────────────── cobranças ───────────────────────────────────

export type PaymentStatus = "pendente" | "pago" | "cancelado";

export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "boleto" | "outro";

export type Payment = {
  id: string;
  accountId: string;
  studentId: string;
  planId?: string;
  amount: number;
  // Data de vencimento no formato YYYY-MM-DD.
  dueAt: string;
  paidAt?: string;
  method?: PaymentMethod;
  status: PaymentStatus;
  referenceLabel?: string;
  notes?: string;
  createdAt: string;
};

// Situação financeira derivada das cobranças do aluno.
export type BillingState = "em_dia" | "a_vencer" | "inadimplente" | "sem_plano";

export type StudentBilling = {
  state: BillingState;
  nextPayment?: Payment;
  overduePayment?: Payment;
  overdueDays: number;
  overdueAmount: number;
  daysUntilDue?: number;
};

// ───────────────────────────── tarefas ─────────────────────────────────────

export type TaskPriority = "baixa" | "media" | "alta";

export type Task = {
  id: string;
  accountId: string;
  studentId?: string;
  staffId?: string;
  title: string;
  description?: string;
  dueAt?: string;
  priority: TaskPriority;
  done: boolean;
  doneAt?: string;
  createdAt: string;
};

// ───────────────────────────── histórico ───────────────────────────────────

export type StudentActivityKind =
  | "cadastro"
  | "nota"
  | "pagamento"
  | "cobranca"
  | "plano"
  | "status"
  | "contato"
  | "tarefa";

export type StudentActivity = {
  id: string;
  studentId: string;
  kind: StudentActivityKind;
  title: string;
  body?: string;
  by: string;
  at: string;
  metadata?: Record<string, unknown>;
};

// ───────────────────────────── avisos ──────────────────────────────────────

export type NotificationKind = "sistema" | "lead" | "tarefa" | "pagamento";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

// ───────────────────────────── metas e resumo diário ───────────────────────

export type AccountSettings = {
  revenueGoal?: number;
  activeStudentsGoal?: number;
  digestEnabled: boolean;
  digestEmail?: string;
  digestLastSentOn?: string;
};

// ───────────────────────────── registro da equipe ──────────────────────────

export type TeamLogEntity = "aluno" | "pagamento" | "plano" | "funcionario" | "unidade" | "tarefa";
export type TeamLogAction =
  | "criou"
  | "editou"
  | "excluiu"
  | "recebeu"
  | "cancelou"
  | "inativou"
  | "reativou"
  | "concluiu"
  | "acesso";

export type TeamLogEntry = {
  id: string;
  createdAt: string;
  actorUserId?: string;
  actorName: string;
  actorRole?: string;
  entityType: TeamLogEntity;
  entityId?: string;
  action: TeamLogAction;
  summary: string;
  metadata?: Record<string, unknown>;
};

// ───────────────────────────── risco e caixa ───────────────────────────────

export type RiskLevel = "alto" | "medio" | "baixo";

export type ChurnRisk = {
  score: number;
  level: RiskLevel;
  reasons: string[];
};

export type MonthForecast = {
  received: number;
  dueRest: number;
  overdue: number;
  projected: number;
  daysLeft: number;
  monthLabel: string;
};

// ───────────────────────────── dashboard ───────────────────────────────────

export type DashboardMetrics = {
  activeStudents: number;
  delinquentStudents: number;
  delinquentAmount: number;
  dueSoonStudents: number;
  activeStaff: number;
  openTasks: number;
  overdueTasks: number;
  activePlans: number;
  monthlyRecurring: number;
};
