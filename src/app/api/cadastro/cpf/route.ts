import { NextResponse, type NextRequest } from "next/server";
import { checkCPF } from "@/lib/plataforma/cpf.server";

// Conferência de CPF do cadastro público de academias (sem login).
// Limite simples por IP para a consulta à Receita não ser usada em massa.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= MAX_PER_WINDOW) {
      return NextResponse.json({ error: "Muitas consultas. Tente de novo mais tarde." }, { status: 429 });
    }
    entry.count += 1;
  } else {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  const body = (await req.json().catch(() => ({}))) as { cpf?: string; fullName?: string };
  if (!body.cpf) return NextResponse.json({ error: "Informe o CPF." }, { status: 400 });
  try {
    return NextResponse.json(await checkCPF(body.cpf, body.fullName));
  } catch (error) {
    console.error("cadastro cpf", error);
    return NextResponse.json({ error: "Não foi possível conferir o CPF agora." }, { status: 500 });
  }
}
