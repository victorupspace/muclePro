import { NextResponse, type NextRequest } from "next/server";
import { buildBaseUrl } from "@/lib/admin/access-link";
import { buildDigest, dateInSaoPaulo, emailConfigured, renderDigestEmail, sendEmail } from "@/lib/plataforma/digest.server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Disparado pelo Vercel Cron às 7h (horário de Brasília). Envia o resumo
// para cada conta com o recurso ligado, uma única vez por dia.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "RESEND_API_KEY ausente." }, { status: 503 });
  }

  const today = dateInSaoPaulo();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("account_settings")
    .select("account_id, digest_last_sent_on, accounts!inner(status, active)")
    .eq("digest_enabled", true)
    .eq("accounts.status", "criada")
    .eq("accounts.active", true)
    .or(`digest_last_sent_on.is.null,digest_last_sent_on.lt.${today}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = buildBaseUrl(req);
  const results: { accountId: string; ok: boolean; error?: string }[] = [];

  for (const row of data ?? []) {
    try {
      const digest = await buildDigest(row.account_id, today);
      await sendEmail(digest.recipient, renderDigestEmail(digest, baseUrl));
      await admin.from("account_settings").update({ digest_last_sent_on: today }).eq("account_id", row.account_id);
      results.push({ accountId: row.account_id, ok: true });
    } catch (err) {
      console.error("daily digest", row.account_id, err);
      results.push({ accountId: row.account_id, ok: false, error: err instanceof Error ? err.message : "erro" });
    }
  }

  return NextResponse.json({ date: today, sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
}
