import { NextResponse, type NextRequest } from "next/server";
import { hashPasswordSetupToken } from "@/lib/admin/access-link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type SetupTokenRow = {
  id: string;
  created_at: string;
  account_id: string;
  staff_id: string | null;
  auth_user_id: string;
  expires_at: string;
  used_at: string | null;
  use_count: number;
};

type CheckResult =
  | { ok: true; row: SetupTokenRow; loginEmail: string; companyName: string | null }
  | { ok: false; status: number; reason: "invalido" | "expirado" | "usado" | "desativado" | "pendente"; error: string };

// Confere o link de criar senha: existe, ainda vale, não foi usado demais e a
// conta (ou o funcionário) continua liberada.
async function checkSetupToken(token: string): Promise<CheckResult> {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("password_setup_tokens")
    .select("id,created_at,account_id,staff_id,auth_user_id,expires_at,used_at,use_count")
    .eq("token_hash", hashPasswordSetupToken(token))
    .maybeSingle();
  if (error) throw new Error(error.message);

  const row = data as SetupTokenRow | null;
  const who = row?.staff_id ? "ao gestor da academia" : "ao time musclePro";
  const askNew = `Peça um novo link ${who}.`;
  if (!row) {
    return { ok: false, status: 400, reason: "invalido", error: `Este link não é válido. Confira se ele foi copiado inteiro ou peça um novo ${who}.` };
  }
  if (row.used_at || row.use_count >= 3) {
    return { ok: false, status: 400, reason: "usado", error: `Este link já foi usado. Entre com seu e-mail e senha ou peça um novo ${who}.` };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 400, reason: "expirado", error: `Este link venceu. ${askNew}` };
  }

  if (row.staff_id) {
    const { data: staff, error: staffError } = await adminClient
      .from("staff")
      .select("id,active,auth_user_id,email,accounts!inner(status,active,company_name)")
      .eq("id", row.staff_id)
      .eq("auth_user_id", row.auth_user_id)
      .maybeSingle();
    if (staffError) throw new Error(staffError.message);
    const staffAccount = (staff as { accounts?: { status: string; active: boolean; company_name: string | null } } | null)?.accounts;
    if (!staff || !staff.active || staffAccount?.status !== "criada" || !staffAccount.active) {
      return { ok: false, status: 403, reason: "desativado", error: "Este acesso foi desativado. Fale com o gestor da academia." };
    }
    return { ok: true, row, loginEmail: staff.email, companyName: staffAccount.company_name };
  }

  const { data: account, error: accountError } = await adminClient
    .from("accounts")
    .select("id,status,active,auth_user_id,email,company_name")
    .eq("id", row.account_id)
    .eq("auth_user_id", row.auth_user_id)
    .maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account || account.status !== "criada" || account.active !== true) {
    return { ok: false, status: 403, reason: "pendente", error: "Esta conta ainda não foi liberada. Fale com o time musclePro." };
  }
  return { ok: true, row, loginEmail: account.email, companyName: account.company_name };
}

// Valida o link quando a página abre, antes de a pessoa digitar a senha.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token) return NextResponse.json({ error: "Link incompleto.", reason: "invalido" }, { status: 400 });
    const checked = await checkSetupToken(token);
    if (!checked.ok) return NextResponse.json({ error: checked.error, reason: checked.reason }, { status: checked.status });
    return NextResponse.json({
      ok: true,
      email: checked.loginEmail,
      companyName: checked.companyName,
      kind: checked.row.staff_id ? "equipe" : "conta",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; password?: string };
    const token = body.token?.trim();
    const password = body.password ?? "";

    if (!token) {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Use pelo menos 8 caracteres." }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const checked = await checkSetupToken(token);
    if (!checked.ok) return NextResponse.json({ error: checked.error, reason: checked.reason }, { status: checked.status });
    const { row, loginEmail } = checked;

    const { error: updateUserError } = await adminClient.auth.admin.updateUserById(row.auth_user_id, {
      password,
      email_confirm: true,
    });

    if (updateUserError) {
      console.error("setup password", updateUserError);
      return NextResponse.json(
        { error: "Não foi possível salvar a senha. Tente de novo ou use outra senha." },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();
    const nextUseCount = row.use_count + 1;

    const { error: markUsedError } = await adminClient
      .from("password_setup_tokens")
      .update({
        use_count: nextUseCount,
        last_used_at: now,
        used_at: nextUseCount >= 3 ? now : null,
      })
      .eq("id", row.id);

    if (markUsedError) {
      return NextResponse.json({ error: markUsedError.message }, { status: 500 });
    }

    if (row.staff_id) {
      await adminClient.from("staff").update({ access_accepted_at: now }).eq("id", row.staff_id);
    }

    await adminClient.from("audit_events").insert({
      resource_type: "account",
      resource_id: row.account_id,
      label: row.staff_id ? "Funcionário definiu a senha de acesso" : "Senha definida pelo usuário",
      actor_id: row.auth_user_id,
      actor_label: loginEmail ?? "usuario",
    });

    return NextResponse.json({
      ok: true,
      email: loginEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
