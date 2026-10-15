import { NextResponse, type NextRequest } from "next/server";
import {
  AccessError,
  inviteStaff,
  loadStaffOfAccount,
  requireManager,
  revokeStaff,
} from "@/lib/plataforma/staff-access.server";

type RouteContext = { params: { id: string } };

function fail(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("staff access", error);
  return NextResponse.json({ error: "Não foi possível concluir. Tente novamente em instantes." }, { status: 500 });
}

// Gera (ou regenera) o convite de acesso do funcionário.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const requester = await requireManager(req);
    const staff = await loadStaffOfAccount(params.id, requester.accountId);
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const result = await inviteStaff(req, requester, staff, body.email ?? staff.email ?? "");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return fail(error);
  }
}

// Remove o acesso: o login é apagado e as sessões deixam de valer.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const requester = await requireManager(req);
    const staff = await loadStaffOfAccount(params.id, requester.accountId);
    await revokeStaff(requester, staff);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
