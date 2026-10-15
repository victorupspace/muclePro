import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Disparado pelo Vercel Cron às 6h (Brasília): gera as faturas que vencem nos
// próximos dias e atualiza a situação de cada academia (trial, atraso, leitura).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { data, error } = await createSupabaseAdminClient().rpc("refresh_all_billing");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data });
}
