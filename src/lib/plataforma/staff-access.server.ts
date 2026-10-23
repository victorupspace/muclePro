import "server-only";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { SETUP_LINK_TTL_MS, buildBaseUrl, findUserIdByEmail, hashToken } from "@/lib/admin/access-link";
import { createSupabaseAdminClient, createSupabaseAuthServerClient } from "@/lib/supabase/server";

// Acesso de funcionários: resolve quem está pedindo, cria o login e gera o
// link de definição de senha. Tudo roda com a service role, então cada
// função confere explicitamente se o pedido vem de um gestor da mesma conta.

export class AccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type Requester = {
  userId: string;
  email: string;
  accountId: string;
  staffId?: string;
};

const LINK_TTL_MS = SETUP_LINK_TTL_MS;

// Modo leitura (assinatura em atraso): nada de novos acessos ou alterações.
export async function assertAccountWritable(accountId: string) {
  const { data } = await createSupabaseAdminClient().rpc("account_read_only", { p_account: accountId });
  if (data === true) {
    throw new AccessError("Assinatura em atraso: o sistema está em modo leitura. Regularize o pagamento para voltar a cadastrar e editar.", 402);
  }
}

export async function requireManager(req: NextRequest): Promise<Requester> {
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
  if (owned) return { userId, email: data.user.email ?? "", accountId: owned.id };

  const { data: member } = await admin
    .from("staff")
    .select("id, account_id, role, active, accounts!inner(status, active)")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  const account = (member as { accounts?: { status: string; active: boolean } } | null)?.accounts;
  if (member && member.role === "gestao" && account?.status === "criada" && account.active) {
    return { userId, email: data.user.email ?? "", accountId: member.account_id, staffId: member.id };
  }

  throw new AccessError("Só o responsável pela conta ou a gestão gerenciam acessos.", 403);
}

type StaffRow = {
  id: string;
  account_id: string;
  full_name: string;
  email: string | null;
  active: boolean;
  auth_user_id: string | null;
  access_accepted_at: string | null;
};

export async function loadStaffOfAccount(staffId: string, accountId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("staff")
    .select("id, account_id, full_name, email, active, auth_user_id, access_accepted_at")
    .eq("id", staffId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw new AccessError(error.message, 500);
  if (!data) throw new AccessError("Funcionário não encontrado nesta conta.", 404);
  return data as StaffRow;
}

// O auth user está ligado a algo além deste funcionário?
async function isLinkedElsewhere(authUserId: string, staffId: string) {
  const admin = createSupabaseAdminClient();
  const [owner, otherStaff, adminProfile] = await Promise.all([
    admin.from("accounts").select("id").eq("auth_user_id", authUserId).limit(1),
    admin.from("staff").select("id").eq("auth_user_id", authUserId).neq("id", staffId).limit(1),
    admin.from("admin_profiles").select("user_id").eq("user_id", authUserId).limit(1),
  ]);
  return Boolean(owner.data?.length || otherStaff.data?.length || adminProfile.data?.length);
}

export async function inviteStaff(
  req: NextRequest,
  requester: Requester,
  staff: StaffRow,
  rawEmail: string,
): Promise<{ setupLink: string; email: string; expiresAt: string }> {
  const admin = createSupabaseAdminClient();
  const email = rawEmail.trim().toLowerCase();

  if (!staff.active) throw new AccessError("Reative o funcionário antes de liberar o acesso.", 409);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError("Informe um e-mail válido.", 400);
  if (requester.staffId === staff.id) throw new AccessError("Você não pode gerar convite para si mesmo.", 409);

  let authUserId = staff.auth_user_id;

  // E-mail trocado: o login antigo deixa de valer.
  if (authUserId) {
    const { data: current } = await admin.auth.admin.getUserById(authUserId);
    if (current.user?.email?.toLowerCase() !== email) {
      await revokeAuthUser(authUserId, staff.id);
      authUserId = null;
    }
  }

  if (!authUserId) {
    const existing = await findUserIdByEmail(email);
    if (existing) {
      if (await isLinkedElsewhere(existing, staff.id)) {
        throw new AccessError(
          "Este e-mail já é usado por outro acesso do musclePro. Use um e-mail diferente para o funcionário.",
          409,
        );
      }
      authUserId = existing;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: randomBytes(32).toString("base64url"),
        email_confirm: true,
        user_metadata: { full_name: staff.full_name, staff_id: staff.id, account_id: staff.account_id },
      });
      if (error || !data.user) throw new AccessError(error?.message ?? "Não foi possível criar o acesso.", 500);
      authUserId = data.user.id;
    }
  }

  const now = new Date();
  const { error: linkError } = await admin
    .from("staff")
    .update({
      auth_user_id: authUserId,
      email,
      access_invited_at: now.toISOString(),
    })
    .eq("id", staff.id);
  if (linkError) {
    if (linkError.code === "23505") {
      throw new AccessError("Este e-mail já é usado por outro funcionário.", 409);
    }
    throw new AccessError(linkError.message, 500);
  }

  // Um convite novo invalida os anteriores.
  await admin
    .from("password_setup_tokens")
    .update({ used_at: now.toISOString(), use_count: 3 })
    .eq("staff_id", staff.id)
    .is("used_at", null);

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(now.getTime() + LINK_TTL_MS).toISOString();
  const { error: tokenError } = await admin.from("password_setup_tokens").insert({
    account_id: staff.account_id,
    staff_id: staff.id,
    auth_user_id: authUserId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_by: requester.userId,
  });
  if (tokenError) throw new AccessError(tokenError.message, 500);

  return {
    setupLink: `${buildBaseUrl(req)}/definir-senha?token=${encodeURIComponent(token)}`,
    email,
    expiresAt,
  };
}

// Apaga o login (encerra as sessões) se ele não for usado em outro lugar;
// caso contrário só desfaz o vínculo com o funcionário.
async function revokeAuthUser(authUserId: string, staffId: string) {
  const admin = createSupabaseAdminClient();
  await admin
    .from("staff")
    .update({ auth_user_id: null, access_invited_at: null, access_accepted_at: null })
    .eq("id", staffId);

  if (await isLinkedElsewhere(authUserId, staffId)) {
    await admin.from("password_setup_tokens").delete().eq("staff_id", staffId);
    return;
  }

  const { error } = await admin.auth.admin.deleteUser(authUserId);
  if (error && !/not found/i.test(error.message)) throw new AccessError(error.message, 500);
}

export async function revokeStaff(requester: Requester, staff: StaffRow) {
  if (requester.staffId === staff.id) throw new AccessError("Você não pode remover o seu próprio acesso.", 409);
  if (!staff.auth_user_id) {
    await createSupabaseAdminClient()
      .from("staff")
      .update({ access_invited_at: null, access_accepted_at: null })
      .eq("id", staff.id);
    return;
  }
  await revokeAuthUser(staff.auth_user_id, staff.id);
}
