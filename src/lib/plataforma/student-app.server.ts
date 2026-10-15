import "server-only";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { buildBaseUrl, hashToken } from "@/lib/admin/access-link";
import { createSupabaseAdminClient, createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { AccessError } from "./staff-access.server";

// Área do aluno: link pessoal pelo WhatsApp, confirmação de identidade e
// criação da sessão. Roda com a service role; cada função confere a conta,
// a unidade e a permissão de quem pede.

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type AppRequester = { userId: string; accountId: string; staffId?: string };

type StudentRow = {
  id: string;
  account_id: string;
  unit_id: string | null;
  full_name: string;
  status: string;
  birth_date: string | null;
  whatsapp: string | null;
  auth_user_id: string | null;
};

const STUDENT_COLUMNS = "id, account_id, unit_id, full_name, status, birth_date, whatsapp, auth_user_id";

// Dono, gestão ou funcionário que cadastra alunos ou monta treinos.
export async function requireAppManager(req: NextRequest): Promise<AppRequester & { unitScopeId?: string }> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AccessError("Sessão ausente. Entre novamente.", 401);
  const { data, error } = await createSupabaseAuthServerClient().auth.getUser(token);
  if (error || !data.user) throw new AccessError("Sessão inválida. Entre novamente.", 401);

  const admin = createSupabaseAdminClient();
  const userId = data.user.id;
  const { data: owned } = await admin
    .from("accounts")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("status", "criada")
    .eq("active", true)
    .maybeSingle();
  if (owned) return { userId, accountId: owned.id };

  const { data: member } = await admin
    .from("staff")
    .select("id, account_id, role, active, unit_id, can_register_students, can_create_workouts, accounts!inner(status, active)")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle();
  const account = (member as { accounts?: { status: string; active: boolean } } | null)?.accounts;
  if (!member || account?.status !== "criada" || !account.active) {
    throw new AccessError("Sem acesso a esta academia.", 403);
  }
  const isManager = member.role === "gestao";
  if (!isManager && !member.can_register_students && !member.can_create_workouts) {
    throw new AccessError("Só quem cadastra alunos ou monta treinos libera a área do aluno.", 403);
  }
  return { userId, accountId: member.account_id, staffId: member.id, unitScopeId: isManager ? undefined : member.unit_id ?? undefined };
}

export async function loadStudentForApp(studentId: string, requester: AppRequester & { unitScopeId?: string }) {
  const { data, error } = await createSupabaseAdminClient()
    .from("students")
    .select(STUDENT_COLUMNS)
    .eq("id", studentId)
    .eq("account_id", requester.accountId)
    .maybeSingle();
  if (error) throw new AccessError(error.message, 500);
  if (!data) throw new AccessError("Aluno não encontrado.", 404);
  const student = data as StudentRow;
  if (requester.unitScopeId && student.unit_id && student.unit_id !== requester.unitScopeId) {
    throw new AccessError("Este aluno é de outra unidade.", 403);
  }
  return student;
}

export type VerifyMethod = "nascimento" | "whatsapp";

function verifyMethod(student: Pick<StudentRow, "birth_date" | "whatsapp">): VerifyMethod | null {
  if (student.birth_date) return "nascimento";
  if ((student.whatsapp ?? "").replace(/\D/g, "").length >= 8) return "whatsapp";
  return null;
}

export async function inviteStudentApp(req: NextRequest, requester: AppRequester, student: StudentRow) {
  if (student.status !== "ativo") throw new AccessError("Reative o aluno antes de liberar a área do aluno.", 409);
  const method = verifyMethod(student);
  if (!method) {
    throw new AccessError("Cadastre a data de nascimento ou o WhatsApp do aluno: um deles confirma a identidade no primeiro acesso.", 409);
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  // Um link novo invalida os anteriores ainda não usados.
  await admin.from("student_app_tokens").update({ used_at: now.toISOString() }).eq("student_id", student.id).is("used_at", null);

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + LINK_TTL_MS).toISOString();
  const { error } = await admin.from("student_app_tokens").insert({
    account_id: student.account_id,
    student_id: student.id,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_by: requester.userId,
  });
  if (error) throw new AccessError(error.message, 500);
  await admin.from("students").update({ app_invited_at: now.toISOString() }).eq("id", student.id);

  return { link: `${buildBaseUrl(req)}/app/acesso?t=${encodeURIComponent(token)}`, expiresAt, verify: method };
}

export async function revokeStudentApp(student: StudentRow) {
  const admin = createSupabaseAdminClient();
  await admin.from("student_app_tokens").update({ used_at: new Date().toISOString() }).eq("student_id", student.id).is("used_at", null);
  await admin
    .from("students")
    .update({ auth_user_id: null, app_invited_at: null, app_connected_at: null, app_last_seen_at: null })
    .eq("id", student.id);
  if (student.auth_user_id) {
    // O login do aluno só existe para a área do aluno: apagar encerra as sessões.
    const { error } = await admin.auth.admin.deleteUser(student.auth_user_id);
    if (error && !/not found/i.test(error.message)) throw new AccessError(error.message, 500);
  }
}

// ───────────────────────────── primeiro acesso do aluno ────────────────────

type TokenRow = {
  id: string;
  student_id: string;
  expires_at: string;
  used_at: string | null;
  failed_attempts: number;
};

async function loadToken(rawToken: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("student_app_tokens")
    .select("id, student_id, expires_at, used_at, failed_attempts")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();
  const token = data as TokenRow | null;
  if (!token || token.used_at || new Date(token.expires_at).getTime() < Date.now() || token.failed_attempts >= MAX_ATTEMPTS) {
    throw new AccessError("Este link não vale mais. Peça um novo para a academia.", 410);
  }
  const { data: student } = await admin
    .from("students")
    .select(`${STUDENT_COLUMNS}, accounts!inner(company_name, status, active)`)
    .eq("id", token.student_id)
    .maybeSingle();
  const account = (student as { accounts?: { company_name: string | null; status: string; active: boolean } } | null)?.accounts;
  if (!student || (student as StudentRow).status !== "ativo" || account?.status !== "criada" || !account.active) {
    throw new AccessError("Este acesso está suspenso. Fale com a recepção da academia.", 403);
  }
  return { token, student: student as StudentRow, companyName: account.company_name || "sua academia" };
}

export async function describeStudentToken(rawToken: string) {
  const { student, companyName } = await loadToken(rawToken);
  const method = verifyMethod(student);
  if (!method) throw new AccessError("Este acesso está incompleto. Peça um novo link para a academia.", 409);
  return { firstName: student.full_name.trim().split(/\s+/)[0], companyName, verify: method };
}

function answerMatches(student: StudentRow, method: VerifyMethod, answer: string) {
  if (method === "nascimento") return answer.slice(0, 10) === student.birth_date?.slice(0, 10);
  const digits = (student.whatsapp ?? "").replace(/\D/g, "");
  return answer.replace(/\D/g, "") === digits.slice(-4);
}

// Confere a resposta e devolve o token de uma sessão para o navegador do aluno.
export async function redeemStudentToken(rawToken: string, answer: string) {
  const { token, student } = await loadToken(rawToken);
  const method = verifyMethod(student);
  const admin = createSupabaseAdminClient();

  if (!method || !answerMatches(student, method, answer)) {
    const attempts = token.failed_attempts + 1;
    await admin.from("student_app_tokens").update({ failed_attempts: attempts }).eq("id", token.id);
    const left = MAX_ATTEMPTS - attempts;
    throw new AccessError(
      left > 0
        ? `${method === "nascimento" ? "A data de nascimento não confere" : "Os números não conferem"}. Você tem mais ${left} tentativa${left === 1 ? "" : "s"}.`
        : "Muitas tentativas. Peça um novo link para a academia.",
      401,
    );
  }

  const email = `aluno-${student.id}@app.musclepro.com.br`;
  let authUserId = student.auth_user_id;
  if (!authUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      user_metadata: { role: "aluno", student_id: student.id, full_name: student.full_name },
    });
    if (error || !data.user) throw new AccessError(error?.message ?? "Não foi possível criar o acesso.", 500);
    authUserId = data.user.id;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token) throw new AccessError(linkError?.message ?? "Não foi possível entrar.", 500);

  const now = new Date().toISOString();
  await admin.from("student_app_tokens").update({ used_at: now }).eq("id", token.id);
  await admin.from("students").update({ auth_user_id: authUserId, app_connected_at: now }).eq("id", student.id);

  return { tokenHash: link.properties.hashed_token };
}
