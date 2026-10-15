// Modelo de domínio da plataforma: um estabelecimento (conta) com filiais,
// equipe, planos, alunos, cobranças e tarefas. Espelha o schema em
// supabase/migrations/20261014000000_musclepro_schema.sql.

export type BusinessType = "academia" | "estudio" | "natacao" | "crossfit" | "lutas" | "outro";

export type DocumentType = "cnpj" | "cpf";

// O que o usuário logado pode fazer. O dono da conta tem tudo; funcionários
// com login herdam as alçadas do próprio cadastro em `staff`.
export type Permissions = {
  canRegisterStudents: boolean;
  canSendPaymentLinks: boolean;
  canCreateWorkouts: boolean;
  canManageTeam: boolean;
  canManageCompany: boolean;
};

export type AccountProfile = {
  id: string;
  authUserId: string;
  isOwner: boolean;
  staffId?: string;
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
  createdAt: string;
};

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
