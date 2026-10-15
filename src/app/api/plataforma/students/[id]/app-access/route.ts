import { NextResponse, type NextRequest } from "next/server";
import { AccessError, assertAccountWritable } from "@/lib/plataforma/staff-access.server";
import { inviteStudentApp, loadStudentForApp, requireAppManager, revokeStudentApp } from "@/lib/plataforma/student-app.server";

type RouteContext = { params: { id: string } };

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("student app access", error);
  return NextResponse.json({ error: "Não foi possível concluir. Tente novamente em instantes." }, { status: 500 });
}

// Gera (ou regenera) o link pessoal da área do aluno.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const requester = await requireAppManager(req);
    await assertAccountWritable(requester.accountId);
    const student = await loadStudentForApp(params.id, requester);
    return NextResponse.json({ ok: true, ...(await inviteStudentApp(req, requester, student)) });
  } catch (error) {
    return fail(error);
  }
}

// Remove o acesso: o aluno sai de todos os aparelhos.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const requester = await requireAppManager(req);
    const student = await loadStudentForApp(params.id, requester);
    await revokeStudentApp(student);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
