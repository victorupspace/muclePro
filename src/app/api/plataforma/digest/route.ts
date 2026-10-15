import { NextResponse, type NextRequest } from "next/server";
import { buildBaseUrl } from "@/lib/admin/access-link";
import { DigestError, buildDigest, emailConfigured, renderDigestEmail, sendEmail } from "@/lib/plataforma/digest.server";
import { AccessError, requireManager } from "@/lib/plataforma/staff-access.server";

export const dynamic = "force-dynamic";

function fail(error: unknown) {
  if (error instanceof AccessError || error instanceof DigestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("digest", error);
  return NextResponse.json({ error: "Não foi possível montar o resumo. Tente novamente." }, { status: 500 });
}

// Prévia do resumo de hoje, como o dono vai receber.
export async function GET(req: NextRequest) {
  try {
    const requester = await requireManager(req);
    const digest = await buildDigest(requester.accountId);
    const email = renderDigestEmail(digest, buildBaseUrl(req));
    return NextResponse.json({ subject: email.subject, html: email.html, recipient: digest.recipient, configured: emailConfigured() });
  } catch (error) {
    return fail(error);
  }
}

// Envia o resumo de hoje agora, para conferir na caixa de entrada.
export async function POST(req: NextRequest) {
  try {
    const requester = await requireManager(req);
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const digest = await buildDigest(requester.accountId);
    const to = body.email?.trim() || digest.recipient;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new DigestError("Informe um e-mail válido.", 400);
    const email = renderDigestEmail(digest, buildBaseUrl(req));
    await sendEmail(to, { ...email, subject: `[Teste] ${email.subject}` });
    return NextResponse.json({ ok: true, to });
  } catch (error) {
    return fail(error);
  }
}
