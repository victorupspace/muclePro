import { NextResponse, type NextRequest } from "next/server";

// Em produção o sistema só responde em musclepro.com.br: o www e os
// endereços *.vercel.app redirecionam para o domínio oficial.
const CANONICAL_HOST = "musclepro.com.br";

export function middleware(req: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") return;
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (host === CANONICAL_HOST) return;
  if (host === `www.${CANONICAL_HOST}` || host.endsWith(".vercel.app")) {
    const url = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(url, 308);
  }
}

export const config = {
  // O cron da Vercel chama o endereço interno do deploy: fica de fora.
  matcher: ["/((?!_next/static|_next/image|api/cron).*)"],
};
