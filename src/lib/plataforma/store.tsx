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
import { computeBilling, cycleLabel, monthForecast, monthlyRecurring, nextDueDate } from "./billing";
import { computeChurnRisk } from "./churn-risk";
import { CHURN_REASON_LABEL, formatCurrency, formatDateValue, todayValue } from "./format";
import { buildNextBestActions, type NextBestAction } from "./next-best-action";
import { useAccountSession } from "./session";
import type {
  AccountSettings,
  Assessment,
  AssessmentKind,
  AssessmentMeasures,
  ChurnReason,
  ChurnRisk,
  CompanyProfilePatch,
  MonthForecast,
  DashboardMetrics,
  HealthCondition,
  Lead,
  LeadEvent,
  LeadLostReason,
  LeadSource,
  LeadStage,
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
  WorkoutDay,
  WorkoutLevel,
  WorkoutProgram,
} from "./types";

import {
  mapActivity,
  mapAssessment,
  mapLead,
  mapLeadEvent,
  mapNotification,
  mapWorkout,
  mapPayment,
  mapPlan,
  mapStaff,
  mapStudent,
  mapTask,
  mapUnit,
  staffAccessState,
  type ActivityRow,
  type AssessmentRow,
  type AnnouncementRow,
  type LeadEventRow,
  type LeadRow,
  type WorkoutRow,
  type PaymentRow,
  type PlanRow,
  type StaffInvite,
  type StaffRow,
  type StudentRow,
  type TaskRow,
  type UnitRow,
} from "./mappers";

export { staffAccessState };
export type { StaffInvite };

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
  churnReason?: ChurnReason;
  churnNotes?: string;
  healthConditions?: HealthCondition[];
  healthRestrictions?: string;
};
export type StudentPatch = Partial<NewStudent>;

export type StudentHealth = { conditions: HealthCondition[]; restrictions: string; medicalNotes: string };

export type NewAssessment = AssessmentMeasures & {
  studentId: string;
  kind: AssessmentKind;
  measuredOn?: string;
  notes?: string;
};
export type AssessmentPatch = Partial<Omit<NewAssessment, "studentId">>;

export type NewLead = {
  fullName: string;
  whatsapp?: string;
  email?: string;
  source: LeadSource;
  interest?: string;
  unitId?: string;
  ownerStaffId?: string;
  stage?: LeadStage;
  trialAt?: string;
  notes?: string;
};
export type LeadPatch = Partial<NewLead & { lostReason: LeadLostReason; lostNotes: string; studentId: string }>;

export type NewWorkout = {
  studentId: string;
  title: string;
  goal?: string;
  level?: WorkoutLevel;
  notes?: string;
  days: WorkoutDay[];
  startsOn?: string;
  reviewOn?: string;
  cycleMonths?: number;
  active?: boolean;
};
export type WorkoutPatch = Partial<Omit<NewWorkout, "studentId">>;

export type SettingsPatch = Partial<Omit<AccountSettings, "digestLastSentOn">>;

type SettingsRow = {
  revenue_goal: number | string | null;
  active_students_goal: number | null;
  digest_enabled: boolean;
  digest_email: string | null;
  digest_last_sent_on: string | null;
};

const DEFAULT_SETTINGS: AccountSettings = { digestEnabled: false };

const mapSettings = (r: SettingsRow | null): AccountSettings =>
  r
    ? {
        revenueGoal: r.revenue_goal === null ? undefined : Number(r.revenue_goal),
        activeStudentsGoal: r.active_students_goal ?? undefined,
        digestEnabled: r.digest_enabled,
        digestEmail: r.digest_email ?? undefined,
        digestLastSentOn: r.digest_last_sent_on ?? undefined,
      }
    : DEFAULT_SETTINGS;

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
  leads: Lead[];
  workouts: WorkoutProgram[];
  assessments: Assessment[];
  subscription: Subscription;
  metrics: DashboardMetrics;
  recommendedActions: NextBestAction[];
  settings: AccountSettings;
  forecast: MonthForecast;

  riskFor: (studentId: string) => ChurnRisk;
  billingFor: (studentId: string) => StudentBilling;
  studentById: (id: string) => Student | undefined;
  planById: (id?: string) => Plan | undefined;
  unitById: (id?: string) => Unit | undefined;
  staffById: (id?: string) => Staff | undefined;
  paymentsFor: (studentId: string) => Payment[];
  activitiesFor: (studentId: string) => StudentActivity[];
  workoutsFor: (studentId: string) => WorkoutProgram[];
  assessmentsFor: (studentId: string) => Assessment[];

  updateCompanyProfile: (patch: CompanyProfilePatch) => Promise<boolean>;
  updateSettings: (patch: SettingsPatch) => Promise<boolean>;

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

  addLead: (input: NewLead) => Promise<Lead | null>;
  updateLead: (id: string, patch: LeadPatch) => Promise<Lead | null>;
  removeLead: (id: string) => Promise<boolean>;
  loadLeadEvents: (leadId: string) => Promise<LeadEvent[]>;
  addLeadEvent: (leadId: string, kind: "nota" | "contato", body: string) => Promise<LeadEvent | null>;

  updateStudentHealth: (studentId: string, health: StudentHealth) => Promise<boolean>;
  addAssessment: (input: NewAssessment) => Promise<Assessment | null>;
  updateAssessment: (id: string, patch: AssessmentPatch) => Promise<Assessment | null>;
  removeAssessment: (id: string) => Promise<boolean>;

  addWorkout: (input: NewWorkout) => Promise<WorkoutProgram | null>;
  updateWorkout: (id: string, patch: WorkoutPatch) => Promise<WorkoutProgram | null>;
  removeWorkout: (id: string) => Promise<boolean>;

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
  const [settings, setSettings] = useState<AccountSettings>(DEFAULT_SETTINGS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutProgram[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

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

    const [unitsRes, staffRes, plansRes, studentsRes, paymentsRes, tasksRes, activitiesRes, settingsRes, leadsRes, workoutsRes, assessmentsRes] =
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
        supabase
          .from("account_settings")
          .select("revenue_goal, active_students_goal, digest_enabled, digest_email, digest_last_sent_on")
          .maybeSingle(),
        supabase.from("leads").select("*").order("stage_changed_at", { ascending: false }),
        supabase.from("workout_programs").select("*").order("created_at", { ascending: false }),
        supabase.from("student_assessments").select("*").order("measured_on", { ascending: false }),
      ]);

    const firstError = [unitsRes, staffRes, plansRes, studentsRes, paymentsRes, tasksRes, activitiesRes, leadsRes, workoutsRes, assessmentsRes].find(
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
    setSettings(mapSettings((settingsRes.data ?? null) as SettingsRow | null));
    setLeads(((leadsRes.data ?? []) as LeadRow[]).map(mapLead));
    setWorkouts(((workoutsRes.data ?? []) as WorkoutRow[]).map(mapWorkout));
    setAssessments(((assessmentsRes.data ?? []) as AssessmentRow[]).map(mapAssessment));
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

  const assessmentsFor = useCallback(
    (studentId: string) =>
      assessments
        .filter((a) => a.studentId === studentId)
        .sort((a, b) => b.measuredOn.localeCompare(a.measuredOn) || b.createdAt.localeCompare(a.createdAt)),
    [assessments],
  );

  const workoutsFor = useCallback(
    (studentId: string) => workouts.filter((w) => w.studentId === studentId),
    [workouts],
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

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const riskMap = useMemo(() => {
    const map = new Map<string, ChurnRisk>();
    for (const s of students) {
      const billing = billingMap.get(s.id) ?? { state: "sem_plano" as const, overdueDays: 0, overdueAmount: 0 };
      map.set(s.id, computeChurnRisk(s, billing, payments, activities, s.planId ? planMap.get(s.planId) : undefined));
    }
    return map;
  }, [students, billingMap, payments, activities, planMap]);

  const riskFor = useCallback(
    (studentId: string): ChurnRisk => riskMap.get(studentId) ?? { score: 0, level: "baixo", reasons: [] },
    [riskMap],
  );

  const forecast = useMemo(() => monthForecast(payments, students), [payments, students]);

  const recommendedActions = useMemo(
    () => buildNextBestActions({ students, payments, plans, units, staff, tasks, billingFor, riskFor }),
    [students, payments, plans, units, staff, tasks, billingFor, riskFor],
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

  // ───────────── funil de matrículas ─────────────

  const leadRowFrom = (input: LeadPatch) => {
    const row: Record<string, unknown> = {};
    if (input.fullName !== undefined) row.full_name = input.fullName.trim();
    if (input.whatsapp !== undefined) row.whatsapp = nullable(input.whatsapp);
    if (input.email !== undefined) row.email = nullable(input.email);
    if (input.source !== undefined) row.source = input.source;
    if (input.interest !== undefined) row.interest = nullable(input.interest);
    if (input.unitId !== undefined) row.unit_id = nullable(input.unitId);
    if (input.ownerStaffId !== undefined) row.owner_staff_id = nullable(input.ownerStaffId);
    if (input.stage !== undefined) row.stage = input.stage;
    if (input.trialAt !== undefined) row.trial_at = nullable(input.trialAt);
    if (input.notes !== undefined) row.notes = nullable(input.notes);
    if (input.lostReason !== undefined) row.lost_reason = nullable(input.lostReason);
    if (input.lostNotes !== undefined) row.lost_notes = nullable(input.lostNotes);
    if (input.studentId !== undefined) row.student_id = nullable(input.studentId);
    return row;
  };

  const addLead = useCallback(
    async (input: NewLead) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("leads")
        .insert({ account_id: accountId, ...leadRowFrom(input) })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível adicionar o interessado.");
        return null;
      }
      const lead = mapLead(data as LeadRow);
      setLeads((prev) => [lead, ...prev]);
      return lead;
    },
    [accountId, fail],
  );

  const updateLead = useCallback(
    async (id: string, patch: LeadPatch) => {
      const { data, error: updateError } = await supabase.from("leads").update(leadRowFrom(patch)).eq("id", id).select("*").single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar o interessado.");
        return null;
      }
      const lead = mapLead(data as LeadRow);
      setLeads((prev) => prev.map((l) => (l.id === id ? lead : l)));
      return lead;
    },
    [fail],
  );

  const removeLead = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("leads").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir o interessado.");
        return false;
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
      return true;
    },
    [fail],
  );

  const loadLeadEvents = useCallback(async (leadId: string) => {
    const { data, error: loadError } = await supabase
      .from("lead_events")
      .select("id, lead_id, kind, body, author_name, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (loadError) return [];
    return ((data ?? []) as LeadEventRow[]).map(mapLeadEvent);
  }, []);

  const addLeadEvent = useCallback(
    async (leadId: string, kind: "nota" | "contato", body: string) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("lead_events")
        .insert({ account_id: accountId, lead_id: leadId, kind, body })
        .select("id, lead_id, kind, body, author_name, created_at")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível registrar no histórico.");
        return null;
      }
      return mapLeadEvent(data as LeadEventRow);
    },
    [accountId, fail],
  );

  // ───────────── fichas de treino ─────────────

  // O lembrete de renovação é criado/atualizado pelo banco junto com a ficha.
  const reloadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (data) setTasks((data as TaskRow[]).map(mapTask));
  }, []);

  const workoutRowFrom = (input: WorkoutPatch) => {
    const row: Record<string, unknown> = {};
    if (input.title !== undefined) row.title = input.title.trim();
    if (input.goal !== undefined) row.goal = nullable(input.goal);
    if (input.level !== undefined) row.level = nullable(input.level);
    if (input.notes !== undefined) row.notes = nullable(input.notes);
    if (input.days !== undefined) row.days = input.days;
    if (input.startsOn !== undefined) row.starts_on = input.startsOn || todayValue();
    if (input.reviewOn !== undefined) row.review_on = nullable(input.reviewOn);
    if (input.cycleMonths !== undefined) row.cycle_months = input.cycleMonths || null;
    if (input.active !== undefined) row.active = input.active;
    return row;
  };

  const addWorkout = useCallback(
    async (input: NewWorkout) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("workout_programs")
        .insert({ account_id: accountId, student_id: input.studentId, ...workoutRowFrom(input) })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível salvar a ficha.");
        return null;
      }
      const workout = mapWorkout(data as WorkoutRow);
      setWorkouts((prev) => [workout, ...prev]);
      void reloadTasks();
      return workout;
    },
    [accountId, fail, reloadTasks],
  );

  const updateWorkout = useCallback(
    async (id: string, patch: WorkoutPatch) => {
      const { data, error: updateError } = await supabase
        .from("workout_programs")
        .update(workoutRowFrom(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar a ficha.");
        return null;
      }
      const workout = mapWorkout(data as WorkoutRow);
      setWorkouts((prev) => prev.map((w) => (w.id === id ? workout : w)));
      void reloadTasks();
      return workout;
    },
    [fail, reloadTasks],
  );

  const removeWorkout = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("workout_programs").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir a ficha.");
        return false;
      }
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      return true;
    },
    [fail],
  );

  // ───────────── saúde e avaliações ─────────────

  const updateStudentHealth = useCallback(
    async (studentId: string, health: StudentHealth) => {
      const { error: rpcError } = await supabase.rpc("update_student_health", {
        p_student: studentId,
        p_conditions: health.conditions,
        p_restrictions: health.restrictions,
        p_medical_notes: health.medicalNotes,
      });
      if (rpcError) {
        fail(rpcError, "Não foi possível salvar os dados de saúde.");
        return false;
      }
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                healthConditions: health.conditions,
                healthRestrictions: health.restrictions.trim() || undefined,
                medicalNotes: health.medicalNotes.trim() || undefined,
              }
            : s,
        ),
      );
      return true;
    },
    [fail],
  );

  const assessmentRowFrom = (input: AssessmentPatch) => {
    const row: Record<string, unknown> = {};
    if (input.kind !== undefined) row.kind = input.kind;
    if (input.measuredOn !== undefined) row.measured_on = input.measuredOn || todayValue();
    const measures: [keyof AssessmentMeasures, string][] = [
      ["weightKg", "weight_kg"],
      ["heightCm", "height_cm"],
      ["armCm", "arm_cm"],
      ["chestCm", "chest_cm"],
      ["waistCm", "waist_cm"],
      ["abdomenCm", "abdomen_cm"],
      ["thighCm", "thigh_cm"],
    ];
    for (const [key, column] of measures) {
      if (key in input) row[column] = input[key] ?? null;
    }
    if (input.notes !== undefined) row.notes = nullable(input.notes);
    return row;
  };

  const addAssessment = useCallback(
    async (input: NewAssessment) => {
      if (!accountId) return null;
      const { data, error: insertError } = await supabase
        .from("student_assessments")
        .insert({ account_id: accountId, student_id: input.studentId, ...assessmentRowFrom(input) })
        .select("*")
        .single();
      if (insertError || !data) {
        fail(insertError, "Não foi possível salvar a avaliação.");
        return null;
      }
      const assessment = mapAssessment(data as AssessmentRow);
      setAssessments((prev) => [assessment, ...prev]);
      return assessment;
    },
    [accountId, fail],
  );

  const updateAssessment = useCallback(
    async (id: string, patch: AssessmentPatch) => {
      const { data, error: updateError } = await supabase
        .from("student_assessments")
        .update(assessmentRowFrom(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (updateError || !data) {
        fail(updateError, "Não foi possível atualizar a avaliação.");
        return null;
      }
      const assessment = mapAssessment(data as AssessmentRow);
      setAssessments((prev) => prev.map((a) => (a.id === id ? assessment : a)));
      return assessment;
    },
    [fail],
  );

  const removeAssessment = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from("student_assessments").delete().eq("id", id);
      if (deleteError) {
        fail(deleteError, "Não foi possível excluir a avaliação.");
        return false;
      }
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      return true;
    },
    [fail],
  );

  // ───────────── metas e resumo diário ─────────────

  const updateSettings = useCallback(
    async (patch: SettingsPatch) => {
      if (!accountId) return false;
      const row: Record<string, unknown> = { account_id: accountId };
      if (patch.revenueGoal !== undefined) row.revenue_goal = patch.revenueGoal || null;
      if (patch.activeStudentsGoal !== undefined) row.active_students_goal = patch.activeStudentsGoal || null;
      if (patch.digestEnabled !== undefined) row.digest_enabled = patch.digestEnabled;
      if (patch.digestEmail !== undefined) row.digest_email = nullable(patch.digestEmail?.trim());
      const { data, error: saveError } = await supabase
        .from("account_settings")
        .upsert(row, { onConflict: "account_id" })
        .select("revenue_goal, active_students_goal, digest_enabled, digest_email, digest_last_sent_on")
        .single();
      if (saveError || !data) {
        fail(saveError, "Não foi possível salvar as preferências.");
        return false;
      }
      setSettings(mapSettings(data as SettingsRow));
      return true;
    },
    [accountId, fail],
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
    if (input.churnReason !== undefined) row.churn_reason = nullable(input.churnReason);
    if (input.churnNotes !== undefined) row.churn_notes = nullable(input.churnNotes);
    if (input.healthConditions !== undefined) row.health_conditions = input.healthConditions;
    if (input.healthRestrictions !== undefined) row.health_restrictions = nullable(input.healthRestrictions);
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
          body:
            patch.status === "inativo" && student.churnReason
              ? `Motivo: ${CHURN_REASON_LABEL[student.churnReason]}${student.churnNotes ? `. ${student.churnNotes}` : "."}`
              : undefined,
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
      leads,
      workouts,
      assessments,
      subscription,
      metrics,
      recommendedActions,
      settings,
      forecast,
      riskFor,
      billingFor,
      studentById,
      planById,
      unitById,
      staffById,
      paymentsFor,
      activitiesFor,
      workoutsFor,
      assessmentsFor,
      updateCompanyProfile,
      updateSettings,
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
      addLead,
      updateLead,
      removeLead,
      loadLeadEvents,
      addLeadEvent,
      updateStudentHealth,
      addAssessment,
      updateAssessment,
      removeAssessment,
      addWorkout,
      updateWorkout,
      removeWorkout,
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
      leads,
      workouts,
      assessments,
      subscription,
      metrics,
      recommendedActions,
      settings,
      forecast,
      riskFor,
      billingFor,
      studentById,
      planById,
      unitById,
      staffById,
      paymentsFor,
      activitiesFor,
      workoutsFor,
      assessmentsFor,
      updateCompanyProfile,
      updateSettings,
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
      addLead,
      updateLead,
      removeLead,
      loadLeadEvents,
      addLeadEvent,
      updateStudentHealth,
      addAssessment,
      updateAssessment,
      removeAssessment,
      addWorkout,
      updateWorkout,
      removeWorkout,
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
