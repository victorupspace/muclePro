import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LayoutDashboard, LifeBuoy, Smartphone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { MARK_STROKES, MARK_STROKE_WIDTH, MARK_VIEWBOX_ATTR } from "@/lib/brand/mark";

export const metadata: Metadata = {
  title: "Página não encontrada — musclePro",
  robots: { index: false, follow: false },
};

const SHORTCUTS = [
  { href: "/plataforma", label: "Painel da academia", hint: "Alunos, cobranças e equipe", icon: LayoutDashboard },
  { href: "/app", label: "Área do aluno", hint: "Treino do dia no celular", icon: Smartphone },
  { href: "/#contact", label: "Falar com a gente", hint: "Suporte do musclePro", icon: LifeBuoy },
];

// Página padrão para endereços que não existem (404).
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col bg-surface lg:flex-row">
      <section className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:max-w-[600px] lg:px-14">
        <Link href="/" aria-label="musclePro, página inicial" className="w-fit">
          <Logo className="[&_span]:text-[1.6rem]" />
        </Link>

        <div className="my-auto py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Erro 404</p>
          <h1 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.025em] text-ink-900 sm:text-[40px]">
            Essa página não existe ou mudou de lugar.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-[1.6] text-ink-600">
            Confira o endereço digitado. Se você chegou aqui por um link, ele pode estar desatualizado.
          </p>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-brand px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
              Voltar para o início
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-btn border border-ink-200 bg-white px-5 text-[14px] font-semibold text-ink-800 transition-colors hover:border-ink-400"
            >
              Entrar no musclePro
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>

          <div className="mt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">Talvez você procure</p>
            <ul className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
              {SHORTCUTS.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-ink-900">{label}</span>
                      <span className="block text-[12px] text-ink-500">{hint}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" strokeWidth={2.2} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-[11.5px] text-ink-500">© {new Date().getFullYear()} musclePro. Todos os direitos reservados.</p>
      </section>

      <aside className="relative hidden flex-1 overflow-hidden bg-brand p-4 lg:m-4 lg:flex lg:rounded-[20px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 15%, rgb(var(--color-brand-light)/0.25), transparent 45%), radial-gradient(circle at 10% 95%, rgb(var(--color-brand-hover)/0.9), transparent 55%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative flex w-full flex-col justify-between p-8 text-white">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-light" />
            Endereço não encontrado
          </p>

          <div className="flex flex-col items-center">
            <svg viewBox={MARK_VIEWBOX_ATTR} className="h-24 w-auto opacity-90" fill="none" aria-hidden>
              {MARK_STROKES.map((stroke, i) => (
                <path
                  key={i}
                  d={stroke.d}
                  stroke={stroke.tone === "primary" ? "#FFFFFF" : "rgb(141 168 224)"}
                  strokeWidth={MARK_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={stroke.opacity}
                />
              ))}
            </svg>
            <p className="mt-6 text-[150px] font-extrabold leading-none tracking-[-0.06em] text-white xl:text-[180px]">404</p>
            <p className="mt-2 text-[15px] text-white/70">Até o melhor treino tem um dia de descanso.</p>
          </div>

          <p className="text-[12px] text-white/50">musclepro.com.br</p>
        </div>
      </aside>
    </main>
  );
}
