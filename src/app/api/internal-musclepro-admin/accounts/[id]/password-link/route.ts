import { NextResponse, type NextRequest } from "next/server";
import { generateManualAccessLink } from "@/lib/admin/access-link";
import {
  createSupabaseAdminClient,
  createSupabaseAuthServerClient,
} from "@/lib/supabase/server";

type RouteContext = {
  params: {
    id: string;
  };
};

type AccountRow = {
  id: string;
  email: string;
  full_name: string;
  auth_user_id: string | null;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Sessão ausente." }, { status: 401 });
    }

    const authClient = createSupabaseAuthServerClient();
    const adminClient = createSupabaseAdminClient();

    const { data: requesterData, error: requesterError } = await authClient.auth.getUser(token);
    if (requesterError || !requesterData.user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await adminClient
      .from("admin_profiles")
      .select("user_id,active,role")
      .eq("user_id", requesterData.user.id)
      .eq("active", true)
      .maybeSingle();

    if (adminError || !adminProfile) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("id,email,full_name,auth_user_id")
      .eq("id", params.id)
      .maybeSingle();

    if (accountError) {
      return NextResponse.json({ error: accountError.message }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    const accountRow = account as AccountRow;
    const access = await generateManualAccessLink(req, accountRow, {
      createdBy: requesterData.user.id,
    });

    if (!accountRow.auth_user_id) {
      const { error: updateError } = await adminClient
        .from("accounts")
        .update({
          auth_user_id: access.authUserId,
          invited_at: new Date().toISOString(),
        })
        .eq("id", accountRow.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    const { error: eventError } = await adminClient.from("audit_events").insert({
      resource_type: "account",
      resource_id: accountRow.id,
      label: "Novo link de definição de senha gerado",
      actor_id: requesterData.user.id,
      actor_label: requesterData.user.email ?? "admin",
    });

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      authUserId: access.authUserId,
      setupLink: access.actionLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
