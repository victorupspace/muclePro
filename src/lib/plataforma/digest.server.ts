import "server-only";
import { computeBilling } from "./billing";
import { computeChurnRisk } from "./churn-risk";
import { CHURN_REASON_LABEL, formatCurrency, firstName } from "./format";
import {
  mapActivity,
  mapPayment,
  mapPlan,
  mapStudent,
  type ActivityRow,
  type PaymentRow,
  type PlanRow,
  type StudentRow,
} from "./mappers";
import type { ChurnReason } from "./types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Resumo diário do dono: o que entrou ontem, o que vence hoje, quem atrasou,
// quem pode sair e o que a equipe fez. Datas sempre no fuso de São Paulo,
// porque o servidor roda em UTC.

const TZ = "America/Sao_Paulo";
const MAX_LIST = 6;

export function dateInSaoPaulo(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function shiftDate(value: string, days: number) {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function longDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isBirthday(birth: string | undefined, today: string) {
  return Boolean(birth && birth.slice(5, 10) === today.slice(5, 10));
}

export type DigestPerson = { id: string; name: string; detail: string };

export type DigestData = {
  accountId: string;
  companyName: string;
  ownerName: string;
  recipient: string;
  today: string;
  dateLabel: string;
  receivedYesterday: { amount: number; count: number };
  overdue: { amount: number; students: number };
  newlyOverdue: DigestPerson[];
  dueToday: DigestPerson[];
  dueTodayAmount: number;
  birthdays: DigestPerson[];
  highRisk: DigestPerson[];
  highRiskTotal: number;
  newStudents: number;
  churned: { name: string; reason: string }[];
  tasksDue: { title: string; overdue: boolean }[];
  team: { name: string; count: number }[];
  month: { label: string; received: number; projected: number; goal?: number; goalPct?: number };
  activeStudents: number;
  activeStudentsGoal?: number;
};

export class DigestError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

export async function buildDigest(accountId: string, today = dateInSaoPaulo()): Promise<DigestData> {
  const admin = createSupabaseAdminClient();
  const yesterday = shiftDate(today, -1);
  const monthPrefix = today.slice(0, 7);
  const [year, month] = today.split("-").map(Number);
  const monthEnd = `${monthPrefix}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
  // Janela de "ontem" em São Paulo (UTC-3, sem horário de verão desde 2019).
  const yStart = `${yesterday}T03:00:00.000Z`;
  const yEnd = `${today}T03:00:00.000Z`;

  const [accountRes, settingsRes, studentsRes, paymentsRes, plansRes, tasksRes, activitiesRes, logRes] = await Promise.all([
    admin.from("accounts").select("id, full_name, email, company_name").eq("id", accountId).maybeSingle(),
    admin
      .from("account_settings")
      .select("revenue_goal, active_students_goal, digest_email")
      .eq("account_id", accountId)
      .maybeSingle(),
    admin.from("students").select("*").eq("account_id", accountId),
    admin.from("payments").select("*").eq("account_id", accountId),
    admin.from("plans").select("*").eq("account_id", accountId),
    admin.from("tasks").select("title, due_at, done").eq("account_id", accountId).eq("done", false).not("due_at", "is", null),
    admin
      .from("student_activities")
      .select("id, student_id, kind, title, body, metadata, created_at")
      .eq("account_id", accountId)
      .gte("created_at", new Date(Date.now() - 120 * 86_400_000).toISOString()),
    admin
      .from("team_activity_log")
      .select("actor_user_id, actor_name")
      .eq("account_id", accountId)
      .gte("created_at", yStart)
      .lt("created_at", yEnd)
      .not("actor_user_id", "is", null),
  ]);

  const failed = [accountRes, settingsRes, studentsRes, paymentsRes, plansRes, tasksRes, activitiesRes, logRes].find((r) => r.error);
  if (failed?.error) throw new DigestError(failed.error.message);
  const account = accountRes.data;
  if (!account) throw new DigestError("Conta não encontrada.", 404);

  const students = ((studentsRes.data ?? []) as StudentRow[]).map(mapStudent);
  const payments = ((paymentsRes.data ?? []) as PaymentRow[]).map(mapPayment);
  const plans = ((plansRes.data ?? []) as PlanRow[]).map(mapPlan);
  const activities = ((activitiesRes.data ?? []) as ActivityRow[]).map((r) => mapActivity(r, ""));
  const planById = new Map(plans.map((p) => [p.id, p]));
  const studentById = new Map(students.map((s) => [s.id, s]));
  const active = students.filter((s) => s.status === "ativo");
  const activeIds = new Set(active.map((s) => s.id));
  const pending = payments.filter((p) => p.status === "pendente" && activeIds.has(p.studentId));

  const paidOn = (iso?: string) => (iso ? dateInSaoPaulo(new Date(iso)) : "");

  const paidYesterday = payments.filter((p) => p.status === "pago" && paidOn(p.paidAt) === yesterday);
  const overdueRows = pending.filter((p) => p.dueAt < today);
  const overdueStudents = new Set(overdueRows.map((p) => p.studentId));

  const newlyOverdue = pending
    .filter((p) => p.dueAt === yesterday)
    .map((p) => ({ id: p.studentId, name: studentById.get(p.studentId)?.fullName ?? "Aluno", detail: formatCurrency(p.amount) }));

  const dueTodayRows = pending.filter((p) => p.dueAt === today);
  const dueToday = dueTodayRows.map((p) => ({
    id: p.studentId,
    name: studentById.get(p.studentId)?.fullName ?? "Aluno",
    detail: formatCurrency(p.amount),
  }));

  const birthdays = active
    .filter((s) => isBirthday(s.birthDate, today))
    .map((s) => ({ id: s.id, name: s.fullName, detail: s.whatsapp ?? "" }));

  const risks = active
    .map((s) => ({
      student: s,
      risk: computeChurnRisk(s, computeBilling(s, payments), payments, activities, s.planId ? planById.get(s.planId) : undefined),
    }))
    .filter((r) => r.risk.level === "alto")
    .sort((a, b) => b.risk.score - a.risk.score);

  const createdYesterday = (iso: string) => paidOn(iso) === yesterday;
  const newStudents = students.filter((s) => createdYesterday(s.createdAt)).length;
  const churned = students
    .filter((s) => s.status === "inativo" && s.churnedAt && createdYesterday(s.churnedAt))
    .map((s) => ({ name: s.fullName, reason: s.churnReason ? CHURN_REASON_LABEL[s.churnReason as ChurnReason] : "Sem motivo" }));

  const tasksDue = ((tasksRes.data ?? []) as { title: string; due_at: string }[])
    .filter((t) => paidOn(t.due_at) <= today)
    .map((t) => ({ title: t.title, overdue: paidOn(t.due_at) < today }))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue));

  const teamCounts = new Map<string, { name: string; count: number }>();
  for (const row of (logRes.data ?? []) as { actor_user_id: string; actor_name: string }[]) {
    const entry = teamCounts.get(row.actor_user_id) ?? { name: row.actor_name, count: 0 };
    entry.count += 1;
    teamCounts.set(row.actor_user_id, entry);
  }

  const receivedMonth = payments
    .filter((p) => p.status === "pago" && paidOn(p.paidAt).startsWith(monthPrefix))
    .reduce((sum, p) => sum + p.amount, 0);
  const dueRestMonth = pending.filter((p) => p.dueAt >= today && p.dueAt <= monthEnd).reduce((sum, p) => sum + p.amount, 0);
  const projected = receivedMonth + dueRestMonth;
  const goal = settingsRes.data?.revenue_goal ? Number(settingsRes.data.revenue_goal) : undefined;
  const monthName = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long" });

  return {
    accountId,
    companyName: account.company_name || "sua academia",
    ownerName: account.full_name ?? "",
    recipient: settingsRes.data?.digest_email || account.email,
    today,
    dateLabel: longDate(today),
    receivedYesterday: { amount: paidYesterday.reduce((sum, p) => sum + p.amount, 0), count: paidYesterday.length },
    overdue: { amount: overdueRows.reduce((sum, p) => sum + p.amount, 0), students: overdueStudents.size },
    newlyOverdue,
    dueToday,
    dueTodayAmount: dueTodayRows.reduce((sum, p) => sum + p.amount, 0),
    birthdays,
    highRisk: risks.slice(0, MAX_LIST).map(({ student, risk }) => ({ id: student.id, name: student.fullName, detail: risk.reasons[0] ?? "" })),
    highRiskTotal: risks.length,
    newStudents,
    churned,
    tasksDue,
    team: Array.from(teamCounts.values()).sort((a, b) => b.count - a.count),
    month: {
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      received: receivedMonth,
      projected,
      goal,
      goalPct: goal ? Math.round((projected / goal) * 100) : undefined,
    },
    activeStudents: active.length,
    activeStudentsGoal: settingsRes.data?.active_students_goal ?? undefined,
  };
}

// ───────────────────────────── e-mail ──────────────────────────────────────

const BRAND = "#01215C";
const INK = "#16181D";
const MUTED = "#6B7280";
const LINE = "#E5E7EB";
const DANGER = "#B3261E";
const SUCCESS = "#1E7A4C";

function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function digestSubject(d: DigestData) {
  const bits: string[] = [];
  if (d.receivedYesterday.count > 0) bits.push(`${formatCurrency(d.receivedYesterday.amount)} recebidos ontem`);
  if (d.dueToday.length > 0) bits.push(`${plural(d.dueToday.length, "vencimento", "vencimentos")} hoje`);
  if (d.overdue.students > 0) bits.push(`${plural(d.overdue.students, "aluno", "alunos")} em atraso`);
  return bits.length > 0 ? `Seu dia na ${d.companyName}: ${bits.join(", ")}` : `Seu dia na ${d.companyName}: tudo em ordem`;
}

export function renderDigestEmail(d: DigestData, baseUrl: string) {
  const link = (path: string) => `${baseUrl}${path}`;

  const kpi = (label: string, value: string, hint: string, color = INK) => `
    <td width="33%" valign="top" style="padding:14px 12px;border:1px solid ${LINE};border-radius:10px;background:#FFFFFF">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MUTED}">${esc(label)}</div>
      <div style="margin-top:6px;font-size:20px;font-weight:700;color:${color};letter-spacing:-.02em">${esc(value)}</div>
      <div style="margin-top:2px;font-size:12px;color:${MUTED}">${esc(hint)}</div>
    </td>`;

  const section = (title: string, body: string, cta?: { label: string; href: string }) => `
    <tr><td style="padding:22px 0 0">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MUTED}">${esc(title)}</div>
      <div style="margin-top:8px">${body}</div>
      ${cta ? `<div style="margin-top:8px"><a href="${cta.href}" style="font-size:13px;font-weight:600;color:${BRAND};text-decoration:none">${esc(cta.label)} &rarr;</a></div>` : ""}
    </td></tr>`;

  const people = (rows: DigestPerson[], total = rows.length, tone = INK) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;background:#FFFFFF">
      ${rows
        .slice(0, MAX_LIST)
        .map(
          (r, i) => `<tr><td style="padding:10px 14px;${i > 0 ? `border-top:1px solid ${LINE};` : ""}">
            <a href="${link(`/plataforma/alunos/${r.id}`)}" style="font-size:14px;font-weight:600;color:${INK};text-decoration:none">${esc(r.name)}</a>
            ${r.detail ? `<div style="font-size:12px;color:${tone === INK ? MUTED : tone}">${esc(r.detail)}</div>` : ""}
          </td></tr>`,
        )
        .join("")}
      ${total > MAX_LIST ? `<tr><td style="padding:8px 14px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">e mais ${total - MAX_LIST}</td></tr>` : ""}
    </table>`;

  const sections: string[] = [];

  if (d.dueToday.length > 0) {
    sections.push(
      section(
        `Vencem hoje · ${formatCurrency(d.dueTodayAmount)}`,
        people(d.dueToday),
        { label: "Enviar lembretes", href: link("/plataforma/alunos?situacao=a_vencer") },
      ),
    );
  }
  if (d.newlyOverdue.length > 0) {
    sections.push(
      section(
        "Atrasaram ontem",
        people(d.newlyOverdue, d.newlyOverdue.length, DANGER),
        { label: "Cobrar pelo WhatsApp", href: link("/plataforma/alunos?situacao=inadimplente") },
      ),
    );
  }
  if (d.highRiskTotal > 0) {
    sections.push(
      section(
        `Risco alto de saída · ${plural(d.highRiskTotal, "aluno", "alunos")}`,
        people(d.highRisk, d.highRiskTotal),
        { label: "Ver o radar de risco", href: link("/plataforma/alunos?risco=alto") },
      ),
    );
  }
  if (d.birthdays.length > 0) {
    sections.push(section("Aniversariantes de hoje", people(d.birthdays)));
  }
  if (d.tasksDue.length > 0) {
    const overdue = d.tasksDue.filter((t) => t.overdue).length;
    sections.push(
      section(
        `Tarefas para hoje${overdue > 0 ? ` · ${overdue} atrasada${overdue === 1 ? "" : "s"}` : ""}`,
        `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:${INK}">${d.tasksDue
          .slice(0, MAX_LIST)
          .map((t) => `<li>${esc(t.title)}${t.overdue ? ` <span style="color:${DANGER};font-size:12px">atrasada</span>` : ""}</li>`)
          .join("")}</ul>`,
        { label: "Abrir tarefas", href: link("/plataforma/tarefas") },
      ),
    );
  }

  const yesterdayLines: string[] = [];
  if (d.newStudents > 0) yesterdayLines.push(`${plural(d.newStudents, "aluno novo", "alunos novos")}`);
  if (d.churned.length > 0) {
    yesterdayLines.push(
      `${plural(d.churned.length, "saída", "saídas")}: ${d.churned.map((c) => `${esc(firstName(c.name))} (${esc(c.reason.toLowerCase())})`).join(", ")}`,
    );
  }
  if (d.team.length > 0) {
    yesterdayLines.push(
      `Equipe: ${d.team
        .slice(0, 4)
        .map((t) => `${esc(firstName(t.name))} ${plural(t.count, "ação", "ações")}`)
        .join(" · ")}`,
    );
  }
  if (yesterdayLines.length > 0) {
    sections.push(
      section(
        "Ontem",
        `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:${INK}">${yesterdayLines.map((l) => `<li>${l}</li>`).join("")}</ul>`,
        d.team.length > 0 ? { label: "Ver atividade da equipe", href: link("/plataforma/atividades") } : undefined,
      ),
    );
  }

  if (sections.length === 0) {
    sections.push(
      section(
        "Hoje",
        `<p style="margin:0;font-size:14px;line-height:1.6;color:${INK}">Nenhum vencimento, atraso novo ou aluno em risco alto. Bom dia para olhar cadastros incompletos e planos.</p>`,
      ),
    );
  }

  const monthLine = d.month.goal
    ? `${formatCurrency(d.month.projected)} previstos em ${d.month.label.toLowerCase()}, ${d.month.goalPct}% da meta de ${formatCurrency(d.month.goal)}.`
    : `${formatCurrency(d.month.projected)} previstos em ${d.month.label.toLowerCase()}, ${formatCurrency(d.month.received)} já recebidos.`;
  const studentsLine = d.activeStudentsGoal
    ? ` ${d.activeStudents} de ${d.activeStudentsGoal} alunos ativos.`
    : ` ${plural(d.activeStudents, "aluno ativo", "alunos ativos")}.`;

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(digestSubject(d))}</title></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK}">
  <div style="display:none;max-height:0;overflow:hidden">${esc(monthLine)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="padding:22px 24px;background:${BRAND};border-radius:14px 14px 0 0">
          <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8DA8E0">musclePro · resumo do dia</div>
          <div style="margin-top:6px;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-.015em">Bom dia${d.ownerName ? `, ${esc(firstName(d.ownerName))}` : ""}.</div>
          <div style="margin-top:4px;font-size:13px;color:#C9D6F2">${esc(d.dateLabel)} · ${esc(d.companyName)}</div>
        </td></tr>
        <tr><td style="padding:20px 24px 26px;background:#FFFFFF;border-radius:0 0 14px 14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:0 -6px">
            <tr>
              ${kpi("Recebido ontem", formatCurrency(d.receivedYesterday.amount), plural(d.receivedYesterday.count, "pagamento", "pagamentos"), d.receivedYesterday.amount > 0 ? SUCCESS : INK)}
              ${kpi("Em atraso", formatCurrency(d.overdue.amount), plural(d.overdue.students, "aluno", "alunos"), d.overdue.amount > 0 ? DANGER : INK)}
              ${kpi(`Previsto em ${d.month.label.toLowerCase()}`, formatCurrency(d.month.projected), d.month.goal ? `${d.month.goalPct}% da meta` : `${formatCurrency(d.month.received)} já entrou`)}
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${sections.join("")}
          </table>
          <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${MUTED}">${esc(monthLine)}${esc(studentsLine)}</p>
          <div style="margin-top:20px">
            <a href="${link("/plataforma")}" style="display:inline-block;padding:12px 20px;background:${BRAND};color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">Abrir o painel</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 8px;font-size:11.5px;line-height:1.6;color:${MUTED};text-align:center">
          Você recebe este e-mail porque ativou o resumo diário. Para parar, desative em
          <a href="${link("/plataforma/configuracoes")}" style="color:${MUTED}">Configurações</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Resumo do dia · ${d.companyName} · ${d.dateLabel}`,
    "",
    `Recebido ontem: ${formatCurrency(d.receivedYesterday.amount)} (${plural(d.receivedYesterday.count, "pagamento", "pagamentos")})`,
    `Em atraso: ${formatCurrency(d.overdue.amount)} (${plural(d.overdue.students, "aluno", "alunos")})`,
    monthLine + studentsLine,
    d.dueToday.length ? `\nVencem hoje: ${d.dueToday.map((p) => `${p.name} (${p.detail})`).join(", ")}` : "",
    d.newlyOverdue.length ? `Atrasaram ontem: ${d.newlyOverdue.map((p) => p.name).join(", ")}` : "",
    d.highRiskTotal ? `Risco alto de saída: ${d.highRisk.map((p) => p.name).join(", ")}` : "",
    d.birthdays.length ? `Aniversariantes: ${d.birthdays.map((p) => p.name).join(", ")}` : "",
    "",
    `Abrir o painel: ${link("/plataforma")}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject: digestSubject(d), html, text };
}

// ───────────────────────────── envio ───────────────────────────────────────

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(to: string, email: { subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new DigestError("O envio de e-mail ainda não está configurado.", 503);
  const from = process.env.DIGEST_FROM_EMAIL || "musclePro <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: email.subject, html: email.html, text: email.text }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    // Sem domínio verificado, o Resend só entrega para o dono da conta.
    const owner = body.message?.match(/own email address \(([^)]+)\)/)?.[1];
    if (owner) {
      throw new DigestError(
        `Enquanto nenhum domínio de envio estiver verificado, o resumo só pode ir para ${owner}.`,
        422,
      );
    }
    if (body.message && /domain is not verified/i.test(body.message)) {
      throw new DigestError("O domínio de envio ainda está em verificação. Tente de novo em alguns minutos.", 503);
    }
    throw new DigestError(body.message || `Falha no envio (${res.status}).`, 502);
  }
  return (await res.json().catch(() => ({}))) as { id?: string };
}
