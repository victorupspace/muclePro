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
    const tokenHash = hashPasswordSetupToken(token);

    const { data: setupToken, error: tokenError } = await adminClient
      .from("password_setup_tokens")
      .select("id,created_at,account_id,staff_id,auth_user_id,expires_at,used_at,use_count")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const row = setupToken as SetupTokenRow | null;
    const hardExpiresAt = row
      ? Math.min(
          new Date(row.expires_at).getTime(),
          new Date(row.created_at).getTime() + 12 * 60 * 60 * 1000,
        )
      : 0;

    if (!row || row.used_at || row.use_count >= 3 || hardExpiresAt < Date.now()) {
      return NextResponse.json(
        {
          error: row?.staff_id
            ? "Link inválido ou expirado. Peça um novo convite ao gestor da academia."
            : "Link inválido ou expirado. Solicite um novo link ao time musclePro.",
        },
        { status: 400 },
      );
    }

    // Convite de funcionário: o vínculo com o funcionário e a conta precisam
    // continuar valendo no momento do aceite.
    let loginEmail: string | null = null;
    if (row.staff_id) {
      const { data: staff, error: staffError } = await adminClient
        .from("staff")
        .select("id,active,auth_user_id,email,accounts!inner(status,active)")
        .eq("id", row.staff_id)
        .eq("auth_user_id", row.auth_user_id)
        .maybeSingle();

      if (staffError) {
        return NextResponse.json({ error: staffError.message }, { status: 500 });
      }

      const staffAccount = (staff as { accounts?: { status: string; active: boolean } } | null)?.accounts;
      if (!staff || !staff.active || staffAccount?.status !== "criada" || !staffAccount.active) {
        return NextResponse.json(
          { error: "Este acesso foi desativado. Fale com o gestor da academia." },
          { status: 403 },
        );
      }
      loginEmail = staff.email;
    } else {
      const { data: account, error: accountError } = await adminClient
        .from("accounts")
        .select("id,status,active,auth_user_id,email")
        .eq("id", row.account_id)
        .eq("auth_user_id", row.auth_user_id)
        .maybeSingle();

      if (accountError) {
        return NextResponse.json({ error: accountError.message }, { status: 500 });
      }

      if (!account || account.status !== "criada" || account.active !== true) {
        return NextResponse.json({ error: "Conta ainda não liberada." }, { status: 403 });
      }
      loginEmail = account.email;
    }

    const { error: updateUserError } = await adminClient.auth.admin.updateUserById(row.auth_user_id, {
      password,
      email_confirm: true,
    });

    if (updateUserError) {
      return NextResponse.json({ error: updateUserError.message }, { status: 500 });
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
