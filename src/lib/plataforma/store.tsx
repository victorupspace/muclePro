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
import { computeBilling, cycleLabel, monthlyRecurring, nextDueDate } from "./billing";
import { formatCurrency, formatDateValue, todayValue } from "./format";
import { buildNextBestActions, type NextBestAction } from "./next-best-action";
import { useAccountSession } from "./session";
import type {
  CompanyProfilePatch,
  DashboardMetrics,
  Notification,
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
  StudentBilling,
  StudentStatus,
  Subscription,
  SubscriptionStatus,
  Task,
  TaskPriority,
  Unit,
} from "./types";

// ───────────────────────────── linhas do banco ─────────────────────────────

type UnitRow = {
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

type StaffRow = {
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

type PlanRow = {
  id: string;
  account_id: string;
  name: string;
  amount: number | string;
  frequency: PlanFrequency;
  description: string | null;
  active: boolean;
  created_at: string;
};

type StudentRow = {
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
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
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

type TaskRow = {
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

type ActivityRow = {
  id: string;
  student_id: string;
  kind: StudentActivityKind;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AnnouncementRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  published_at: string | null;
  created_at: string;
  read: boolean;
};

const mapUnit = (r: UnitRow): Unit => ({
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

const mapStaff = (r: StaffRow): Staff => ({
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

const mapPlan = (r: PlanRow): Plan => ({
  id: r.id,
  accountId: r.account_id,
  name: r.name,
  amount: Number(r.amount),
  frequency: r.frequency,
  description: r.description ?? undefined,
  active: r.active,
  createdAt: r.created_at,
});

const mapStudent = (r: StudentRow): Student => ({
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
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapPayment = (r: PaymentRow): Payment => ({
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

const mapTask = (r: TaskRow): Task => ({
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

const mapActivity = (r: ActivityRow, by: string): StudentActivity => ({
  id: r.id,
  studentId: r.student_id,
  kind: r.kind,
  title: r.title,
  body: r.body ?? undefined,
  by: (r.metadata?.by as string | undefined) ?? by,
  at: r.created_at,
  metadata: r.metadata ?? undefined,
});

const mapNotification = (r: AnnouncementRow): Notification => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  href: r.href ?? undefined,
  createdAt: r.published_at ?? r.created_at,
  read: r.read,
});

function mapSubscription(paymentStatus?: string, paymentPlan?: string, nextDueAt?: string): Subscription {
  const status: SubscriptionStatus =
    paymentStatus === "em_dia"
      ? "ativo"
      : paymentStatus === "trial" || paymentStatus === "nao_iniciado" || !paymentStatus
        ? "trial"
        : "expirado";
  return { status, plan: paymentPlan || "musclePro", nextDueAt };
}

const nullable = (v?: string | number | null) => (v === undefined || v === "" ? null : v);

// ───────────────────────────── entradas das mutações ───────────────────────

export type NewUnit = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  isMain?: boolean;
};
export type UnitPatch = Partial<NewUnit & { active: boolean }>;

export type NewStaff = {
  fullName: string;
  role: StaffRole;
  roleLabel?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  unitId?: string;
  startedAt?: string;
  endedAt?: string;
  canRegisterStudents?: boolean;
  canSendPaymentLinks?: boolean;
  canCreateWorkouts?: boolean;
  notes?: string;
};
export type StaffPatch = Partial<NewStaff & { active: boolean }>;

export type NewPlan = {
  name: string;
  amount: number;
  frequency: PlanFrequency;
  description?: string;
};
export type PlanPatch = Partial<NewPlan & { active: boolean }>;

export type NewStudent = {
  fullName: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  unitId?: string;
  planId?: string;
  planStartedAt?: string;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  status?: StudentStatus;
};
export type StudentPatch = Partial<NewStudent>;

export type NewTask = {
  title: string;
  description?: string;
  dueAt?: string;
  studentId?: string;
  staffId?: string;
  priority?: TaskPriority;
};
export type TaskPatch = Partial<NewTask & { done: boolean }>;

export type NewPayment = {
  studentId: string;
  amount: number;
  dueAt: string;
  referenceLabel?: string;
  planId?: string;
};

export type RegisterPaymentInput = {
  paidAt?: string;
  method?: PaymentMethod;
  amount?: number;
  notes?: string;
};

export type NewStudentActivity = {
  kind: StudentActivityKind;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
};

type Ctx = {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  clearActionError: () => void;
  refresh: () => Promise<void>;

  units: Unit[];
  staff: Staff[];
  plans: Plan[];
  students: Student[];
  payments: Payment[];
  tasks: Task[];
  activities: StudentActivity[];
  notifications: Notification[];
  subscription: Subscription;
  metrics: DashboardMetrics;
  recommendedActions: NextBestAction[];

  billingFor: (studentId: string) => StudentBilling;
  studentById: (id: string) => Student | undefined;
  planById: (id?: string) => Plan | undefined;
  unitById: (id?: string) => Unit | undefined;
  staffById: (id?: string) => Staff | undefined;
  paymentsFor: (studentId: string) => Payment[];
  activitiesFor: (studentId: string) => StudentActivity[];

  updateCompanyProfile: (patch: CompanyProfilePatch) => Promise<boolean>;

  addUnit: (input: NewUnit) => Promise<Unit | null>;
  updateUnit: (id: string, patch: UnitPatch) => Promise<Unit | null>;
  removeUnit: (id: string) => Promise<boolean>;

  addStaff: (input: NewStaff) => Promise<Staff | null>;
  updateStaff: (id: string, patch: StaffPatch) => Promise<Staff | null>;
  removeStaff: (id: string) => Promise<boolean>;
  inviteStaffAccess: (id: string, email: string) => Promise<StaffInvite | null>;
  revokeStaffAccess: (id: string) => Promise<boolean>;

  addPlan: (input: NewPlan) => Promise<Plan | null>;
  updatePlan: (id: string, patch: PlanPatch) => Promise<Plan | null>;
  removePlan: (id: string) => Promise<boolean>;

  addStudent: (input: NewStudent) => Promise<Student | null>;
  updateStudent: (id: string, patch: StudentPatch) => Promise<Student | null>;
  removeStudent: (id: string) => Promise<boolean>;
  assignPlan: (studentId: string, planId: string, startDate: string) => Promise<boolean>;

  addPayment: (input: NewPayment) => Promise<Payment | null>;
  registerPayment: (paymentId: string, input: RegisterPaymentInput) => Promise<boolean>;
  cancelPayment: (paymentId: string) => Promise<boolean>;
  logCharge: (studentId: string, channel: "whatsapp" | "lembrete", payment?: Payment) => Promise<void>;

  addTask: (input: NewTask) => Promise<Task | null>;
  updateTask: (id: string, patch: TaskPatch) => Promise<Task | null>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<boolean>;

  addStudentActivity: (studentId: string, input: NewStudentActivity) => Promise<StudentActivity | null>;
  removeStudentActivity: (activityId: string) => Promise<boolean>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const EMPTY_METRICS: DashboardMetrics = {
  activeStudents: 0,
  delinquentStudents: 0,
  delinquentAmount: 0,
  dueSoonStudents: 0,
  activeStaff: 0,
  openTasks: 0,
  overdueTasks: 0,
  activePlans: 0,
  monthlyRecurring: 0,
};

function describeError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes("23505")) return "Já existe um registro com esses dados.";
    return message;
  }
  return fallback;
}

export function PlataformaStoreProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAccountSession();
  const accountId = profile?.id ?? null;
  const authorName = profile?.fullName ?? "Equipe";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fail = useCallback((err: unknown, fallback: string) => {
    const message = describeError(err, fallback);
    console.error(fallback, err);
    setActionError(message);
  }, []);

  // ───────────── carga ─────────────

  const refresh = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [unitsRes, staffRes, plansRes, studentsRes, paymentsRes, tasksRes, activitiesRes] =
      await Promise.all([
        supabase.from("units").select("*").order("created_at", { ascending: true }),
        supabase.from("staff").select("*").order("full_name", { ascending: true }),
        supabase.from("plans").select("*").order("amount", { ascending: true }),
        supabase.from("students").select("*").order("full_name", { ascending: true }),
        supabase.from("payments").select("*").order("due_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase
          .from("student_activities")
          .select("id, student_id, kind, title, body, metadata, created_at")
          .order("created_at", { ascending: false }),
      ]);

    const firstError = [unitsRes, staffRes, plansRes, studentsRes, paymentsRes, tasksRes, activitiesRes].find(
      (r) => r.error,
    )?.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setUnits(((unitsRes.data ?? []) as UnitRow[]).map(mapUnit));
    setStaff(((staffRes.data ?? []) as StaffRow[]).map(mapStaff));
    setPlans(((plansRes.data ?? []) as PlanRow[]).map(mapPlan));
    setStudents(((studentsRes.data ?? []) as StudentRow[]).map(mapStudent));
    setPayments(((paymentsRes.data ?? []) as PaymentRow[]).map(mapPayment));
    setTasks(((tasksRes.data ?? []) as TaskRow[]).map(mapTask));
    setActivities(((activitiesRes.data ?? []) as ActivityRow[]).map((r) => mapActivity(r, authorName)));
    setLoading(false);
  }, [accountId, authorName]);

  const loadNotifications = useCallback(async () => {
    if (!accountId) return;
    const { data, error: loadError } = await supabase
      .from("v_my_announcements")
      .select("id, kind, title, body, href, published_at, created_at, read")
      .order("published_at", { ascending: false })
      .limit(40);
    if (loadError) return;
    setNotifications(((data ?? []) as AnnouncementRow[]).map(mapNotification));
  }, [accountId]);

  useEffect(() => {
    void refresh();
    void loadNotifications();
  }, [refresh, loadNotifications]);

  useEffect(() => {
    if (!accountId) return;
    const channel = supabase
      .channel(`announcements-${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_announcements" }, () => {
        void loadNotifications();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accountId, loadNotifications]);

  // ───────────── derivados ─────────────

  const billingMap = useMemo(() => {
    const map = new Map<string, StudentBilling>();
    for (const s of students) map.set(s.id, computeBilling(s, payments));
    return map;
  }, [students, payments]);

  const billingFor = useCallback(
    (studentId: string): StudentBilling =>
      billingMap.get(studentId) ?? { state: "sem_plano", overdueDays: 0, overdueAmount: 0 },
    [billingMap],
  );

  const studentById = useCallback((id: string) => students.find((s) => s.id === id), [students]);
  const planById = useCallback((id?: string) => (id ? plans.find((p) => p.id === id) : undefined), [plans]);
  const unitById = useCallback((id?: string) => (id ? units.find((u) => u.id === id) : undefined), [units]);
  const staffById = useCallback((id?: string) => (id ? staff.find((s) => s.id === id) : undefined), [staff]);
  const paymentsFor = useCallback(
    (studentId: string) => payments.filter((p) => p.studentId === studentId),
    [payments],
  );
  const activitiesFor = useCallback(
    (studentId: string) => activities.filter((a) => a.studentId === studentId),
    [activities],
  );

  const metrics = useMemo<DashboardMetrics>(() => {
    if (!accountId) return EMPTY_METRICS;
    const active = students.filter((s) => s.status === "ativo");
    let delinquentStudents = 0;
    let delinquentAmount = 0;
    let dueSoonStudents = 0;
    for (const s of active) {
      const b = billingMap.get(s.id);
      if (!b) continue;
      if (b.state === "inadimplente") {
        delinquentStudents += 1;
        delinquentAmount += b.overdueAmount;
      } else if (b.state === "a_vencer") {
        dueSoonStudents += 1;
      }
    }
    const now = Date.now();
    const open = tasks.filter((t) => !t.done);
    return {
      activeStudents: active.length,
      delinquentStudents,
      delinquentAmount,
      dueSoonStudents,
      activeStaff: staff.filter((s) => s.active).length,
      openTasks: open.length,
      overdueTasks: open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now).length,
      activePlans: plans.filter((p) => p.active).length,
      monthlyRecurring: monthlyRecurring(students, plans),
    };
  }, [accountId, students, billingMap, tasks, staff, plans]);

  const recommendedActions = useMemo(
    () => buildNextBestActions({ students, payments, plans, units, staff, tasks, billingFor }),
    [students, payments, plans, units, staff, tasks, billingFor],
  );

  const subscription = useMemo(
    () => mapSubscription(profile?.paymentStatus, profile?.paymentPlan, profile?.paymentNextDueAt),
    [profile?.paymentStatus, profile?.paymentPlan, profile?.paymentNextDueAt],
  );

  // ───────────── histórico ─────────────

  const insertActivity = useCallback(
    async (studentId: string, input: NewStudentActivity) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("student_activities")
        .insert({
          account_id: accountId,
          student_id: studentId,
          created_by: profile?.authUserId ?? null,
          kind: input.kind,
          title: input.title,
          body: input.body ?? null,
          metadata: { ...(input.metadata ?? {}), by: authorName },
        })
        .select("id, student_id, kind, title, body, metadata, created_at")
        .single();
      if (insertError || !data) return null;
      const activity = mapActivity(data as ActivityRow, authorName);
      setActivities((prev) => [activity, ...prev]);
      return activity;
    },
    [accountId, authorName, profile?.authUserId],
  );

  const addStudentActivity = useCallback(
    async (studentId: string, input: NewStudentActivity) => {
      const activity = await insertActivity(studentId, input);
      if (!activity) fail(null, "Não foi possível registrar a atividade.");
      return activity;
    },
    [insertActivity, fail],
  );

  const removeStudentActivity = useCallback(
    async (activityId: string) => {
      const { error: deleteError } = await supabase.from("student_activities").delete().eq("id", activityId);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir a atividade.");
        return false;
      }
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      return true;
    },
    [fail],
  );

  // ───────────── empresa ─────────────

  const updateCompanyProfile = useCallback(
    async (patch: CompanyProfilePatch) => {
      const { error: rpcError } = await supabase.rpc("update_company_profile", {
        p_company_name: patch.companyName,
        p_business_type: patch.businessType,
        p_document_type: patch.documentType,
        p_document: patch.document,
        p_address: nullable(patch.address),
        p_contact_phone: nullable(patch.contactPhone),
        p_contact_email: nullable(patch.contactEmail),
      });
      if (rpcError) {
        fail(rpcError, "Não foi possível salvar os dados da empresa.");
        return false;
      }
      await refreshProfile();
      return true;
    },
    [fail, refreshProfile],
  );

  // ───────────── filiais ─────────────

  const addUnit = useCallback(
    async (input: NewUnit) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("units")
        .insert({
          account_id: accountId,
          name: input.name,
          address: nullable(input.address),
          city: nullable(input.city),
          state: nullable(input.state),
          phone: nullable(input.phone),
          is_main: input.isMain ?? units.length === 0,
        })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível criar a unidade.");
        return null;
      }
      const unit = mapUnit(data as UnitRow);
      setUnits((prev) => [...prev, unit]);
      return unit;
    },
    [accountId, units.length, fail],
  );

  const updateUnit = useCallback(
    async (id: string, patch: UnitPatch) => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.address !== undefined) row.address = nullable(patch.address);
      if (patch.city !== undefined) row.city = nullable(patch.city);
      if (patch.state !== undefined) row.state = nullable(patch.state);
      if (patch.phone !== undefined) row.phone = nullable(patch.phone);
      if (patch.isMain !== undefined) row.is_main = patch.isMain;
      if (patch.active !== undefined) row.active = patch.active;
      const { data, error: updateError } = await supabase.from("units").update(row).eq("id", id).select("*").single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar a unidade.");
        return null;
      }
      const unit = mapUnit(data as UnitRow);
      setUnits((prev) => prev.map((u) => (u.id === id ? unit : u)));
      return unit;
    },
    [fail],
  );

  const removeUnit = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("units").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir a unidade.");
        return false;
      }
      setUnits((prev) => prev.filter((u) => u.id !== id));
      setStaff((prev) => prev.map((s) => (s.unitId === id ? { ...s, unitId: undefined } : s)));
      setStudents((prev) => prev.map((s) => (s.unitId === id ? { ...s, unitId: undefined } : s)));
      return true;
    },
    [fail],
  );

  // ───────────── equipe ─────────────

  const staffRowFrom = (input: Partial<NewStaff & { active: boolean }>) => {
    const row: Record<string, unknown> = {};
    if (input.fullName !== undefined) row.full_name = input.fullName;
    if (input.role !== undefined) row.role = input.role;
    if (input.roleLabel !== undefined) row.role_label = nullable(input.roleLabel);
    if (input.cpf !== undefined) row.cpf = nullable(input.cpf);
    if (input.email !== undefined) row.email = nullable(input.email);
    if (input.phone !== undefined) row.phone = nullable(input.phone);
    if (input.unitId !== undefined) row.unit_id = nullable(input.unitId);
    if (input.startedAt !== undefined) row.started_at = nullable(input.startedAt);
    if (input.endedAt !== undefined) row.ended_at = nullable(input.endedAt);
    if (input.canRegisterStudents !== undefined) row.can_register_students = input.canRegisterStudents;
    if (input.canSendPaymentLinks !== undefined) row.can_send_payment_links = input.canSendPaymentLinks;
    if (input.canCreateWorkouts !== undefined) row.can_create_workouts = input.canCreateWorkouts;
    if (input.notes !== undefined) row.notes = nullable(input.notes);
    if (input.active !== undefined) row.active = input.active;
    return row;
  };

  const addStaff = useCallback(
    async (input: NewStaff) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("staff")
        .insert({ account_id: accountId, ...staffRowFrom(input) })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível cadastrar o funcionário.");
        return null;
      }
      const member = mapStaff(data as StaffRow);
      setStaff((prev) => [...prev, member].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      return member;
    },
    [accountId, fail],
  );

  const updateStaff = useCallback(
    async (id: string, patch: StaffPatch) => {
      const { data, error: updateError } = await supabase
        .from("staff")
        .update(staffRowFrom(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar o funcionário.");
        return null;
      }
      const member = mapStaff(data as StaffRow);
      setStaff((prev) => prev.map((s) => (s.id === id ? member : s)));
      return member;
    },
    [fail],
  );

  const removeStaff = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("staff").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir o funcionário.");
        return false;
      }
      setStaff((prev) => prev.filter((s) => s.id !== id));
      return true;
    },
    [fail],
  );

  // Convite e revogação passam pelo servidor: criam/apagam o login com a
  // service role, que o navegador nunca vê.
  const callStaffAccess = useCallback(
    async (id: string, method: "POST" | "DELETE", body?: Record<string, unknown>) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        fail(null, "Sua sessão expirou. Entre novamente.");
        return null;
      }
      const response = await fetch(`/api/plataforma/staff/${id}/access`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json().catch(() => null)) as
        | ({ error?: string } & Partial<StaffInvite>)
        | null;
      if (!response.ok) {
        setActionError(result?.error ?? "Não foi possível concluir. Tente novamente.");
        return null;
      }
      return result ?? {};
    },
    [fail],
  );

  const reloadStaffMember = useCallback(async (id: string) => {
    const { data } = await supabase.from("staff").select("*").eq("id", id).maybeSingle();
    if (data) {
      const member = mapStaff(data as StaffRow);
      setStaff((prev) => prev.map((s) => (s.id === id ? member : s)));
    }
  }, []);

  const inviteStaffAccess = useCallback(
    async (id: string, email: string) => {
      const result = await callStaffAccess(id, "POST", { email });
      if (!result?.setupLink) return null;
      await reloadStaffMember(id);
      return { setupLink: result.setupLink, email: result.email ?? email, expiresAt: result.expiresAt ?? "" };
    },
    [callStaffAccess, reloadStaffMember],
  );

  const revokeStaffAccess = useCallback(
    async (id: string) => {
      const result = await callStaffAccess(id, "DELETE");
      if (!result) return false;
      await reloadStaffMember(id);
      return true;
    },
    [callStaffAccess, reloadStaffMember],
  );

  // ───────────── planos ─────────────

  const addPlan = useCallback(
    async (input: NewPlan) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("plans")
        .insert({
          account_id: accountId,
          name: input.name,
          amount: input.amount,
          frequency: input.frequency,
          description: nullable(input.description),
        })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível criar o plano.");
        return null;
      }
      const plan = mapPlan(data as PlanRow);
      setPlans((prev) => [...prev, plan].sort((a, b) => a.amount - b.amount));
      return plan;
    },
    [accountId, fail],
  );

  const updatePlan = useCallback(
    async (id: string, patch: PlanPatch) => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.amount !== undefined) row.amount = patch.amount;
      if (patch.frequency !== undefined) row.frequency = patch.frequency;
      if (patch.description !== undefined) row.description = nullable(patch.description);
      if (patch.active !== undefined) row.active = patch.active;
      const { data, error: updateError } = await supabase.from("plans").update(row).eq("id", id).select("*").single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar o plano.");
        return null;
      }
      const plan = mapPlan(data as PlanRow);
      setPlans((prev) => prev.map((p) => (p.id === id ? plan : p)).sort((a, b) => a.amount - b.amount));
      return plan;
    },
    [fail],
  );

  const removePlan = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("plans").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir o plano.");
        return false;
      }
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setStudents((prev) => prev.map((s) => (s.planId === id ? { ...s, planId: undefined } : s)));
      return true;
    },
    [fail],
  );

  // ───────────── cobranças ─────────────

  const insertPayment = useCallback(
    async (input: NewPayment) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("payments")
        .insert({
          account_id: accountId,
          student_id: input.studentId,
          plan_id: nullable(input.planId),
          amount: input.amount,
          due_at: input.dueAt,
          reference_label: nullable(input.referenceLabel),
          created_by: profile?.authUserId ?? null,
        })
        .select("*")
        .single();
      if (insertError || !data) return null;
      const payment = mapPayment(data as PaymentRow);
      setPayments((prev) => [payment, ...prev]);
      return payment;
    },
    [accountId, profile?.authUserId],
  );

  const addPayment = useCallback(
    async (input: NewPayment) => {
      const payment = await insertPayment(input);
      if (!payment) {
        fail(null, "Não foi possível criar a cobrança.");
        return null;
      }
      await insertActivity(input.studentId, {
        kind: "cobranca",
        title: "Cobrança criada",
        body: `${formatCurrency(input.amount)} com vencimento em ${formatDateValue(input.dueAt)}.`,
      });
      return payment;
    },
    [insertPayment, insertActivity, fail],
  );

  // Abre o ciclo do plano: a primeira cobrança vence na data de início.
  const startPlanCycle = useCallback(
    async (student: Student, plan: Plan, startDate: string) => {
      const existingPending = payments.some(
        (p) => p.studentId === student.id && p.status === "pendente" && p.planId === plan.id,
      );
      if (existingPending) return;
      await insertPayment({
        studentId: student.id,
        planId: plan.id,
        amount: plan.amount,
        dueAt: startDate,
        referenceLabel: cycleLabel(startDate, plan),
      });
    },
    [payments, insertPayment],
  );

  const registerPayment = useCallback(
    async (paymentId: string, input: RegisterPaymentInput) => {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) return false;
      const paidAt = input.paidAt ? new Date(`${input.paidAt}T12:00:00`).toISOString() : new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from("payments")
        .update({
          status: "pago",
          paid_at: paidAt,
          method: input.method ?? null,
          notes: nullable(input.notes),
          amount: input.amount ?? payment.amount,
        })
        .eq("id", paymentId)
        .select("*")
        .single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível registrar o pagamento.");
        return false;
      }
      const paid = mapPayment(data as PaymentRow);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? paid : p)));

      await insertActivity(payment.studentId, {
        kind: "pagamento",
        title: "Pagamento registrado",
        body: `${formatCurrency(paid.amount)} referente a ${paid.referenceLabel ?? formatDateValue(paid.dueAt)}${
          paid.method ? ` · ${paid.method}` : ""
        }.`,
      });

      // Próximo ciclo: só quando o aluno segue ativo no mesmo plano e não há
      // outra cobrança pendente.
      const student = students.find((s) => s.id === payment.studentId);
      const plan = student?.planId ? plans.find((p) => p.id === student.planId) : undefined;
      const otherPending = payments.some(
        (p) => p.studentId === payment.studentId && p.status === "pendente" && p.id !== paymentId,
      );
      if (student && student.status === "ativo" && plan && paid.planId === plan.id && !otherPending) {
        const due = nextDueDate(paid.dueAt, plan);
        await insertPayment({
          studentId: student.id,
          planId: plan.id,
          amount: plan.amount,
          dueAt: due,
          referenceLabel: cycleLabel(due, plan),
        });
      }
      return true;
    },
    [payments, students, plans, insertActivity, insertPayment, fail],
  );

  const cancelPayment = useCallback(
    async (paymentId: string) => {
      const { data, error: updateError } = await supabase
        .from("payments")
        .update({ status: "cancelado" })
        .eq("id", paymentId)
        .select("*")
        .single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível cancelar a cobrança.");
        return false;
      }
      const cancelled = mapPayment(data as PaymentRow);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? cancelled : p)));
      return true;
    },
    [fail],
  );

  const logCharge = useCallback(
    async (studentId: string, channel: "whatsapp" | "lembrete", payment?: Payment) => {
      await insertActivity(studentId, {
        kind: "cobranca",
        title: channel === "whatsapp" ? "Cobrança enviada por WhatsApp" : "Lembrete de vencimento enviado",
        body: payment
          ? `${formatCurrency(payment.amount)} · vencimento ${formatDateValue(payment.dueAt)}.`
          : undefined,
        metadata: { channel, paymentId: payment?.id },
      });
    },
    [insertActivity],
  );

  // ───────────── alunos ─────────────

  const studentRowFrom = (input: Partial<NewStudent>) => {
    const row: Record<string, unknown> = {};
    if (input.fullName !== undefined) row.full_name = input.fullName;
    if (input.whatsapp !== undefined) row.whatsapp = nullable(input.whatsapp);
    if (input.email !== undefined) row.email = nullable(input.email);
    if (input.cpf !== undefined) row.cpf = nullable(input.cpf);
    if (input.birthDate !== undefined) row.birth_date = nullable(input.birthDate);
    if (input.unitId !== undefined) row.unit_id = nullable(input.unitId);
    if (input.planId !== undefined) row.plan_id = nullable(input.planId);
    if (input.planStartedAt !== undefined) row.plan_started_at = nullable(input.planStartedAt);
    if (input.medicalNotes !== undefined) row.medical_notes = nullable(input.medicalNotes);
    if (input.emergencyContactName !== undefined) row.emergency_contact_name = nullable(input.emergencyContactName);
    if (input.emergencyContactPhone !== undefined) row.emergency_contact_phone = nullable(input.emergencyContactPhone);
    if (input.notes !== undefined) row.notes = nullable(input.notes);
    if (input.status !== undefined) row.status = input.status;
    return row;
  };

  const addStudent = useCallback(
    async (input: NewStudent) => {
      if (!accountId) return null;
      const startDate = input.planStartedAt || todayValue();
      const { data, error: insertError } = await supabase
        .from("students")
        .insert({ account_id: accountId, ...studentRowFrom({ ...input, planStartedAt: input.planId ? startDate : undefined }) })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível cadastrar o aluno.");
        return null;
      }
      const student = mapStudent(data as StudentRow);
      setStudents((prev) => [...prev, student].sort((a, b) => a.fullName.localeCompare(b.fullName)));

      await insertActivity(student.id, { kind: "cadastro", title: "Aluno cadastrado" });

      const plan = input.planId ? plans.find((p) => p.id === input.planId) : undefined;
      if (plan) {
        await startPlanCycle(student, plan, startDate);
        await insertActivity(student.id, {
          kind: "plano",
          title: `Plano ${plan.name} vinculado`,
          body: `${formatCurrency(plan.amount)} · início em ${formatDateValue(startDate)}.`,
        });
      }
      return student;
    },
    [accountId, plans, insertActivity, startPlanCycle, fail],
  );

  const updateStudent = useCallback(
    async (id: string, patch: StudentPatch) => {
      const before = students.find((s) => s.id === id);
      const { data, error: updateError } = await supabase
        .from("students")
        .update(studentRowFrom(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar o aluno.");
        return null;
      }
      const student = mapStudent(data as StudentRow);
      setStudents((prev) => prev.map((s) => (s.id === id ? student : s)).sort((a, b) => a.fullName.localeCompare(b.fullName)));

      if (before && patch.status && patch.status !== before.status) {
        await insertActivity(id, {
          kind: "status",
          title: patch.status === "ativo" ? "Aluno reativado" : "Aluno marcado como inativo",
        });
      }
      return student;
    },
    [students, insertActivity, fail],
  );

  const assignPlan = useCallback(
    async (studentId: string, planId: string, startDate: string) => {
      const student = students.find((s) => s.id === studentId);
      const plan = plans.find((p) => p.id === planId);
      if (!student || !plan) return false;

      // Cobranças pendentes do plano anterior deixam de valer.
      const stale = payments.filter((p) => p.studentId === studentId && p.status === "pendente" && p.planId !== planId);
      for (const p of stale) {
        await supabase.from("payments").update({ status: "cancelado" }).eq("id", p.id);
      }
      if (stale.length > 0) {
        const staleIds = new Set(stale.map((p) => p.id));
        setPayments((prev) => prev.map((p) => (staleIds.has(p.id) ? { ...p, status: "cancelado" } : p)));
      }

      const updated = await updateStudent(studentId, { planId, planStartedAt: startDate });
      if (!updated) return false;

      await startPlanCycle(updated, plan, startDate);
      await insertActivity(studentId, {
        kind: "plano",
        title: `Plano ${plan.name} vinculado`,
        body: `${formatCurrency(plan.amount)} · início em ${formatDateValue(startDate)}.`,
      });
      return true;
    },
    [students, plans, payments, updateStudent, startPlanCycle, insertActivity],
  );

  const removeStudent = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("students").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir o aluno.");
        return false;
      }
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setPayments((prev) => prev.filter((p) => p.studentId !== id));
      setActivities((prev) => prev.filter((a) => a.studentId !== id));
      setTasks((prev) => prev.map((t) => (t.studentId === id ? { ...t, studentId: undefined } : t)));
      return true;
    },
    [fail],
  );

  // ───────────── tarefas ─────────────

  const addTask = useCallback(
    async (input: NewTask) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          account_id: accountId,
          title: input.title,
          description: nullable(input.description),
          due_at: nullable(input.dueAt),
          student_id: nullable(input.studentId),
          staff_id: nullable(input.staffId),
          priority: input.priority ?? "media",
        })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível criar a tarefa.");
        return null;
      }
      const task = mapTask(data as TaskRow);
      setTasks((prev) => [task, ...prev]);
      if (task.studentId) {
        await insertActivity(task.studentId, { kind: "tarefa", title: `Tarefa criada: ${task.title}` });
      }
      return task;
    },
    [accountId, insertActivity, fail],
  );

  const updateTask = useCallback(
    async (id: string, patch: TaskPatch) => {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.description !== undefined) row.description = nullable(patch.description);
      if (patch.dueAt !== undefined) row.due_at = nullable(patch.dueAt);
      if (patch.studentId !== undefined) row.student_id = nullable(patch.studentId);
      if (patch.staffId !== undefined) row.staff_id = nullable(patch.staffId);
      if (patch.priority !== undefined) row.priority = patch.priority;
      if (patch.done !== undefined) {
        row.done = patch.done;
        row.done_at = patch.done ? new Date().toISOString() : null;
      }
      const { data, error: updateError } = await supabase.from("tasks").update(row).eq("id", id).select("*").single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar a tarefa.");
        return null;
      }
      const task = mapTask(data as TaskRow);
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      return task;
    },
    [fail],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      await updateTask(id, { done: !task.done });
    },
    [tasks, updateTask],
  );

  const removeTask = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir a tarefa.");
        return false;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return true;
    },
    [fail],
  );

  // ───────────── avisos ─────────────

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (!accountId) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase
        .from("platform_announcement_reads")
        .upsert({ announcement_id: id, account_id: accountId }, { onConflict: "announcement_id,account_id" });
    },
    [accountId],
  );

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.rpc("mark_all_announcements_read");
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);

  const value = useMemo<Ctx>(
    () => ({
      loading,
      error,
      actionError,
      clearActionError,
      refresh,
      units,
      staff,
      plans,
      students,
      payments,
      tasks,
      activities,
      notifications,
      subscription,
      metrics,
      recommendedActions,
      billingFor,
      studentById,
      planById,
      unitById,
      staffById,
      paymentsFor,
      activitiesFor,
      updateCompanyProfile,
      addUnit,
      updateUnit,
      removeUnit,
      addStaff,
      updateStaff,
      removeStaff,
      inviteStaffAccess,
      revokeStaffAccess,
      addPlan,
      updatePlan,
      removePlan,
      addStudent,
      updateStudent,
      removeStudent,
      assignPlan,
      addPayment,
      registerPayment,
      cancelPayment,
      logCharge,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      addStudentActivity,
      removeStudentActivity,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      loading,
      error,
      actionError,
      clearActionError,
      refresh,
      units,
      staff,
      plans,
      students,
      payments,
      tasks,
      activities,
      notifications,
      subscription,
      metrics,
      recommendedActions,
      billingFor,
      studentById,
      planById,
      unitById,
      staffById,
      paymentsFor,
      activitiesFor,
      updateCompanyProfile,
      addUnit,
      updateUnit,
      removeUnit,
      addStaff,
      updateStaff,
      removeStaff,
      inviteStaffAccess,
      revokeStaffAccess,
      addPlan,
      updatePlan,
      removePlan,
      addStudent,
      updateStudent,
      removeStudent,
      assignPlan,
      addPayment,
      registerPayment,
      cancelPayment,
      logCharge,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      addStudentActivity,
      removeStudentActivity,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePlataformaStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("usePlataformaStore must be used inside PlataformaStoreProvider");
  return ctx;
}
