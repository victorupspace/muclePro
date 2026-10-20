import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Disparado pelo Vercel Cron às 6h (Brasília): gera as faturas que vencem nos
// próximos dias, atualiza a situação de cada academia (trial, atraso, leitura)
// e apaga as tarefas concluídas há mais de 7 dias.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("refresh_all_billing");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: purged, error: purgeError } = await admin.rpc("purge_done_tasks", { p_days: 7 });
  if (purgeError) console.error("purge done tasks", purgeError);
  return NextResponse.json({ accounts: data, purgedTasks: purged ?? 0 });
}
