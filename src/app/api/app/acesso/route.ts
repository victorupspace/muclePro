import { NextResponse, type NextRequest } from "next/server";
import { AccessError } from "@/lib/plataforma/staff-access.server";
import { describeStudentToken, redeemStudentToken } from "@/lib/plataforma/student-app.server";

export const dynamic = "force-dynamic";

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("student app redeem", error);
  return NextResponse.json({ error: "Não foi possível entrar agora. Tente de novo em instantes." }, { status: 500 });
}

// O que mostrar na tela do link (primeiro nome, academia e o que confirmar).
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("t") ?? "";
    if (!token) throw new AccessError("Link incompleto. Abra o link que a academia enviou.", 400);
    return NextResponse.json(await describeStudentToken(token));
  } catch (error) {
    return fail(error);
  }
}

// Confere a resposta e devolve o token que abre a sessão no navegador.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string; answer?: string };
    if (!body.token || !body.answer) throw new AccessError("Preencha a confirmação.", 400);
    return NextResponse.json(await redeemStudentToken(body.token, body.answer));
  } catch (error) {
    return fail(error);
  }
}
