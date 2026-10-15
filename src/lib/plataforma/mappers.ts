// Formato das linhas do banco e conversão para os tipos da plataforma.
// Compartilhado entre o store (navegador) e as rotas de servidor.

import type {
  NotificationKind,
  Payment,
  PaymentMethod,
  Plan,
  PlanFrequency,
  Staff,
  StaffAccessState,
  StaffRole,
  Student,
  StudentActivity,
  StudentActivityKind,
  StudentStatus,
  Task,
  TaskPriority,
  Unit,
  Notification,
  ChurnReason,
} from "./types";

// ───────────────────────────── linhas do banco ─────────────────────────────

export type UnitRow = {
  id: string;
  account_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  is_main: boolean;
  active: boolean;
  created_at: string;
};

export type StaffRow = {
  id: string;
  account_id: string;
  unit_id: string | null;
  auth_user_id: string | null;
  full_name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  role_label: string | null;
  started_at: string | null;
  ended_at: string | null;
  can_register_students: boolean;
  can_send_payment_links: boolean;
  can_create_workouts: boolean;
  active: boolean;
  notes: string | null;
  access_invited_at: string | null;
  access_accepted_at: string | null;
  created_at: string;
};

export type PlanRow = {
  id: string;
  account_id: string;
  name: string;
  amount: number | string;
  frequency: PlanFrequency;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type StudentRow = {
  id: string;
  account_id: string;
  unit_id: string | null;
  plan_id: string | null;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  whatsapp: string | null;
  email: string | null;
  medical_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: StudentStatus;
  plan_started_at: string | null;
  notes: string | null;
  churn_reason: ChurnReason | null;
  churn_notes: string | null;
  churned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  account_id: string;
  student_id: string;
  plan_id: string | null;
  amount: number | string;
  due_at: string;
  paid_at: string | null;
  method: PaymentMethod | null;
  status: Payment["status"];
  reference_label: string | null;
  notes: string | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  account_id: string;
  student_id: string | null;
  staff_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: TaskPriority;
  done: boolean;
  done_at: string | null;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  student_id: string;
  kind: StudentActivityKind;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AnnouncementRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  published_at: string | null;
  created_at: string;
  read: boolean;
};

export const mapUnit = (r: UnitRow): Unit => ({
  id: r.id,
  accountId: r.account_id,
  name: r.name,
  address: r.address ?? undefined,
  city: r.city ?? undefined,
  state: r.state ?? undefined,
  phone: r.phone ?? undefined,
  isMain: r.is_main,
  active: r.active,
  createdAt: r.created_at,
});

export const mapStaff = (r: StaffRow): Staff => ({
  id: r.id,
  accountId: r.account_id,
  unitId: r.unit_id ?? undefined,
  authUserId: r.auth_user_id ?? undefined,
  fullName: r.full_name,
  cpf: r.cpf ?? undefined,
  email: r.email ?? undefined,
  phone: r.phone ?? undefined,
  role: r.role,
  roleLabel: r.role_label ?? undefined,
  startedAt: r.started_at ?? undefined,
  endedAt: r.ended_at ?? undefined,
  canRegisterStudents: r.can_register_students,
  canSendPaymentLinks: r.can_send_payment_links,
  canCreateWorkouts: r.can_create_workouts,
  active: r.active,
  notes: r.notes ?? undefined,
  accessInvitedAt: r.access_invited_at ?? undefined,
  accessAcceptedAt: r.access_accepted_at ?? undefined,
  createdAt: r.created_at,
});

// Situação do login: com acesso quando já definiu a senha, convite pendente
// quando há vínculo mas a senha ainda não foi criada.
export function staffAccessState(member: Staff): StaffAccessState {
  if (member.authUserId && member.accessAcceptedAt) return "com_acesso";
  if (member.authUserId) return "convite_pendente";
  return "sem_acesso";
}

export type StaffInvite = { setupLink: string; email: string; expiresAt: string };

export const mapPlan = (r: PlanRow): Plan => ({
  id: r.id,
  accountId: r.account_id,
  name: r.name,
  amount: Number(r.amount),
  frequency: r.frequency,
  description: r.description ?? undefined,
  active: r.active,
  createdAt: r.created_at,
});

export const mapStudent = (r: StudentRow): Student => ({
  id: r.id,
  accountId: r.account_id,
  unitId: r.unit_id ?? undefined,
  planId: r.plan_id ?? undefined,
  fullName: r.full_name,
  cpf: r.cpf ?? undefined,
  birthDate: r.birth_date ?? undefined,
  whatsapp: r.whatsapp ?? undefined,
  email: r.email ?? undefined,
  medicalNotes: r.medical_notes ?? undefined,
  emergencyContactName: r.emergency_contact_name ?? undefined,
  emergencyContactPhone: r.emergency_contact_phone ?? undefined,
  status: r.status,
  planStartedAt: r.plan_started_at ?? undefined,
  notes: r.notes ?? undefined,
  churnReason: r.churn_reason ?? undefined,
  churnNotes: r.churn_notes ?? undefined,
  churnedAt: r.churned_at ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  accountId: r.account_id,
  studentId: r.student_id,
  planId: r.plan_id ?? undefined,
  amount: Number(r.amount),
  dueAt: r.due_at,
  paidAt: r.paid_at ?? undefined,
  method: r.method ?? undefined,
  status: r.status,
  referenceLabel: r.reference_label ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

export const mapTask = (r: TaskRow): Task => ({
  id: r.id,
  accountId: r.account_id,
  studentId: r.student_id ?? undefined,
  staffId: r.staff_id ?? undefined,
  title: r.title,
  description: r.description ?? undefined,
  dueAt: r.due_at ?? undefined,
  priority: r.priority,
  done: r.done,
  doneAt: r.done_at ?? undefined,
  createdAt: r.created_at,
});

export const mapActivity = (r: ActivityRow, by: string): StudentActivity => ({
  id: r.id,
  studentId: r.student_id,
  kind: r.kind,
  title: r.title,
  body: r.body ?? undefined,
  by: (r.metadata?.by as string | undefined) ?? by,
  at: r.created_at,
  metadata: r.metadata ?? undefined,
});

export const mapNotification = (r: AnnouncementRow): Notification => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  href: r.href ?? undefined,
  createdAt: r.published_at ?? r.created_at,
  read: r.read,
});

