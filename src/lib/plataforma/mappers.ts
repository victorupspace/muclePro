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
  Assessment,
  WorkoutLog,
  HealthCondition,
  Lead,
  LeadEvent,
  LeadLostReason,
  LeadSource,
  LeadStage,
  WorkoutDay,
  WorkoutLevel,
  WorkoutProgram,
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
  health_conditions: string[] | null;
  health_restrictions: string | null;
  auth_user_id: string | null;
  app_invited_at: string | null;
  app_connected_at: string | null;
  app_last_seen_at: string | null;
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
  workout_id: string | null;
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
  healthConditions: (r.health_conditions ?? []) as HealthCondition[],
  healthRestrictions: r.health_restrictions ?? undefined,
  hasAppLogin: Boolean(r.auth_user_id),
  appInvitedAt: r.app_invited_at ?? undefined,
  appConnectedAt: r.app_connected_at ?? undefined,
  appLastSeenAt: r.app_last_seen_at ?? undefined,
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
  workoutId: r.workout_id ?? undefined,
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


// ───────────────────────────── funil e treinos ─────────────────────────────

export type LeadRow = {
  id: string;
  account_id: string;
  unit_id: string | null;
  owner_staff_id: string | null;
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  source: LeadSource;
  interest: string | null;
  stage: LeadStage;
  trial_at: string | null;
  lost_reason: LeadLostReason | null;
  lost_notes: string | null;
  notes: string | null;
  student_id: string | null;
  stage_changed_at: string;
  converted_at: string | null;
  created_at: string;
};

export const mapLead = (r: LeadRow): Lead => ({
  id: r.id,
  unitId: r.unit_id ?? undefined,
  ownerStaffId: r.owner_staff_id ?? undefined,
  fullName: r.full_name,
  whatsapp: r.whatsapp ?? undefined,
  email: r.email ?? undefined,
  source: r.source,
  interest: r.interest ?? undefined,
  stage: r.stage,
  trialAt: r.trial_at ?? undefined,
  lostReason: r.lost_reason ?? undefined,
  lostNotes: r.lost_notes ?? undefined,
  notes: r.notes ?? undefined,
  studentId: r.student_id ?? undefined,
  stageChangedAt: r.stage_changed_at,
  convertedAt: r.converted_at ?? undefined,
  createdAt: r.created_at,
});

export type LeadEventRow = {
  id: string;
  lead_id: string;
  kind: LeadEvent["kind"];
  body: string | null;
  author_name: string | null;
  created_at: string;
};

export const mapLeadEvent = (r: LeadEventRow): LeadEvent => ({
  id: r.id,
  leadId: r.lead_id,
  kind: r.kind,
  body: r.body ?? undefined,
  authorName: r.author_name ?? undefined,
  createdAt: r.created_at,
});

export type WorkoutRow = {
  id: string;
  account_id: string;
  student_id: string;
  author_staff_id: string | null;
  author_name: string | null;
  title: string;
  goal: string | null;
  level: WorkoutLevel | null;
  notes: string | null;
  days: WorkoutDay[] | null;
  starts_on: string;
  review_on: string | null;
  cycle_months: number | null;
  ended_on: string | null;
  published_at: string | null;
  student_seen_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const mapWorkout = (r: WorkoutRow): WorkoutProgram => ({
  id: r.id,
  studentId: r.student_id,
  authorStaffId: r.author_staff_id ?? undefined,
  authorName: r.author_name ?? undefined,
  title: r.title,
  goal: r.goal ?? undefined,
  level: r.level ?? undefined,
  notes: r.notes ?? undefined,
  days: Array.isArray(r.days) ? r.days : [],
  startsOn: r.starts_on,
  reviewOn: r.review_on ?? undefined,
  cycleMonths: r.cycle_months ?? undefined,
  endedOn: r.ended_on ?? undefined,
  publishedAt: r.published_at ?? undefined,
  studentSeenAt: r.student_seen_at ?? undefined,
  active: r.active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export type AssessmentRow = {
  id: string;
  student_id: string;
  kind: Assessment["kind"];
  measured_on: string;
  weight_kg: number | string | null;
  height_cm: number | string | null;
  arm_cm: number | string | null;
  chest_cm: number | string | null;
  waist_cm: number | string | null;
  abdomen_cm: number | string | null;
  thigh_cm: number | string | null;
  notes: string | null;
  author_staff_id: string | null;
  author_name: string | null;
  created_at: string;
};

const num = (v: number | string | null) => (v === null || v === "" ? undefined : Number(v));

export const mapAssessment = (r: AssessmentRow): Assessment => ({
  id: r.id,
  studentId: r.student_id,
  kind: r.kind,
  measuredOn: r.measured_on,
  weightKg: num(r.weight_kg),
  heightCm: num(r.height_cm),
  armCm: num(r.arm_cm),
  chestCm: num(r.chest_cm),
  waistCm: num(r.waist_cm),
  abdomenCm: num(r.abdomen_cm),
  thighCm: num(r.thigh_cm),
  notes: r.notes ?? undefined,
  authorStaffId: r.author_staff_id ?? undefined,
  authorName: r.author_name ?? undefined,
  createdAt: r.created_at,
});

export type WorkoutLogRow = {
  id: string;
  student_id: string;
  workout_id: string;
  day_name: string;
  performed_on: string;
  exercises: WorkoutLog["exercises"] | null;
  comment: string | null;
  finished_at: string | null;
};

export const mapWorkoutLog = (r: WorkoutLogRow): WorkoutLog => ({
  id: r.id,
  studentId: r.student_id,
  workoutId: r.workout_id,
  dayName: r.day_name,
  performedOn: r.performed_on,
  exercises: Array.isArray(r.exercises) ? r.exercises : [],
  comment: r.comment ?? undefined,
  finishedAt: r.finished_at ?? undefined,
});
