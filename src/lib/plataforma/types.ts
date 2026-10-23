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
  // relatórios e exportações: gestão e contabilidade
  canViewReports: boolean;
  // assinatura em atraso além da carência: só consulta
  readOnly: boolean;
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
  billing?: AccountBilling;
};

// ───────────────────────────── assinatura musclePro ────────────────────────

export type AccountInvoice = {
  id: string;
  planName?: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  amount: number;
  status: "aberta" | "paga" | "cancelada";
  paidAt?: string;
  gatewayUrl?: string;
};

export type AccountBilling = {
  status: "trial" | "em_dia" | "pendente" | "atrasado" | "cancelado" | "nao_iniciado";
  readOnly: boolean;
  trialEndsAt?: string;
  graceDays: number;
  planName?: string;
  planMonths?: number;
  price?: number;
  nextDueOn?: string;
  overdueSince?: string;
  canceledAt?: string;
  invoices: AccountInvoice[];
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

export type SubscriptionStatus = "ativo" | "trial" | "atrasado" | "leitura" | "cancelado";

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

export type HealthCondition =
  | "coluna"
  | "joelho"
  | "ombro"
  | "hipertensao"
  | "diabetes"
  | "cardiaco"
  | "respiratorio"
  | "gestante"
  | "cirurgia_recente"
  | "obesidade"
  | "outro";

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
  addressZip?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  medicalNotes?: string;
  healthConditions: HealthCondition[];
  healthRestrictions?: string;
  // Área do aluno no celular.
  hasAppLogin: boolean;
  appInvitedAt?: string;
  appConnectedAt?: string;
  appLastSeenAt?: string;
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
  // Lembrete de renovação de ciclo, criado pelo banco a partir da ficha.
  workoutId?: string;
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

export type TeamLogEntity = "aluno" | "pagamento" | "plano" | "funcionario" | "unidade" | "tarefa" | "lead" | "treino" | "avaliacao";
export type TeamLogAction =
  | "criou"
  | "editou"
  | "excluiu"
  | "recebeu"
  | "cancelou"
  | "inativou"
  | "reativou"
  | "concluiu"
  | "acesso"
  | "moveu"
  | "matriculou"
  | "perdeu";

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

// ───────────────────────────── funil de matrículas ─────────────────────────

export type LeadStage = "novo" | "contato" | "agendada" | "experimental" | "matriculado" | "perdido";
export type LeadSource = "instagram" | "indicacao" | "passante" | "whatsapp" | "site" | "google" | "outro";
export type LeadLostReason = "preco" | "horario" | "distancia" | "sem_resposta" | "concorrente" | "desistiu" | "outro";

export type Lead = {
  id: string;
  unitId?: string;
  ownerStaffId?: string;
  fullName: string;
  whatsapp?: string;
  email?: string;
  source: LeadSource;
  interest?: string;
  stage: LeadStage;
  trialAt?: string;
  lostReason?: LeadLostReason;
  lostNotes?: string;
  notes?: string;
  studentId?: string;
  stageChangedAt: string;
  convertedAt?: string;
  createdAt: string;
};

export type LeadEvent = {
  id: string;
  leadId: string;
  kind: "etapa" | "nota" | "contato";
  body?: string;
  authorName?: string;
  createdAt: string;
};

// ───────────────────────────── fichas de treino ────────────────────────────

export type WorkoutLevel = "iniciante" | "intermediario" | "avancado";

export type WorkoutExercise = {
  name: string;
  sets?: string;
  reps?: string;
  load?: string;
  rest?: string;
  notes?: string;
};

export type WorkoutDay = {
  name: string;
  focus?: string;
  // Dias da semana (0 = domingo … 6 = sábado).
  weekdays?: number[];
  exercises: WorkoutExercise[];
};

export type WorkoutProgram = {
  id: string;
  studentId: string;
  authorStaffId?: string;
  authorName?: string;
  title: string;
  goal?: string;
  level?: WorkoutLevel;
  notes?: string;
  days: WorkoutDay[];
  startsOn: string;
  reviewOn?: string;
  cycleMonths?: number;
  endedOn?: string;
  // Rascunho = nunca liberada ao aluno.
  publishedAt?: string;
  studentSeenAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// Treino feito pelo aluno (área do aluno).
export type WorkoutLogExercise = { name: string; done: boolean; load?: string };

export type WorkoutLog = {
  id: string;
  studentId: string;
  workoutId: string;
  dayName: string;
  performedOn: string;
  exercises: WorkoutLogExercise[];
  comment?: string;
  finishedAt?: string;
};

// ───────────────────────────── avaliação física ────────────────────────────

export type AssessmentKind = "inicial" | "reavaliacao";

export type AssessmentMeasures = {
  weightKg?: number;
  heightCm?: number;
  armCm?: number;
  chestCm?: number;
  waistCm?: number;
  abdomenCm?: number;
  thighCm?: number;
};

export type Assessment = AssessmentMeasures & {
  id: string;
  studentId: string;
  kind: AssessmentKind;
  measuredOn: string;
  notes?: string;
  authorStaffId?: string;
  authorName?: string;
  createdAt: string;
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
