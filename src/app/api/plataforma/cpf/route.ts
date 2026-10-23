import { NextResponse, type NextRequest } from "next/server";
import { checkCPF } from "@/lib/plataforma/cpf.server";
import { AccessError } from "@/lib/plataforma/staff-access.server";
import { requireAppManager } from "@/lib/plataforma/student-app.server";

// Confere o CPF de um aluno no cadastro. Só para quem cadastra alunos.
export async function POST(req: NextRequest) {
  try {
    await requireAppManager(req);
    const body = (await req.json().catch(() => ({}))) as { cpf?: string; fullName?: string; birthDate?: string };
    if (!body.cpf) return NextResponse.json({ error: "Informe o CPF." }, { status: 400 });
    return NextResponse.json(await checkCPF(body.cpf, body.fullName, body.birthDate));
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("cpf check", error);
    return NextResponse.json({ error: "Não foi possível conferir o CPF agora." }, { status: 500 });
  }
}
