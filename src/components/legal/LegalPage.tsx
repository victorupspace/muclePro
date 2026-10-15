import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

type LegalPageProps = {
  title: string;
  intro: React.ReactNode;
  updatedAt: string;
  sections: LegalSection[];
  related: { href: string; label: string };
};

export const LEGAL_CONTACT_EMAIL = "contato@musclepro.com.br";

// Estilos de leitura aplicados ao conteúdo de cada seção (parágrafos, listas,
// links e subtítulos), sem depender do plugin de tipografia.
const PROSE =
  "break-words text-[15px] leading-[1.75] text-ink-600 " +
  "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:mt-2 [&_li]:pl-1 marker:text-ink-400 " +
  "[&_h3]:mt-7 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:leading-[1.4] [&_h3]:text-ink-900 " +
  "[&_strong]:font-semibold [&_strong]:text-ink-900 " +
  "[&_a]:font-semibold [&_a]:text-ink-900 [&_a]:underline [&_a]:decoration-brand [&_a]:decoration-2 [&_a]:underline-offset-4 [&_a:hover]:text-brand";

export function LegalPage({ title, intro, updatedAt, sections, related }: LegalPageProps) {
  return (
    <div className="min-h-svh bg-white text-ink-900">
      <header className="border-b border-ink-200/70">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-10 md:py-6">
          <Link href="/" aria-label="Ir para a página inicial" className="inline-flex">
            <Logo variant="dark" className="origin-left scale-[0.78]" />
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-btn px-3 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
            Início
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-12 md:px-10 md:pt-16">
        <div className="max-w-[720px] lg:ml-[284px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">Legal</p>
          <h1 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900 md:text-[44px]">
            {title}
          </h1>
          <p className="mt-4 text-[13px] font-medium text-ink-500">
            Última atualização: {updatedAt}
          </p>
          <div className="mt-6 text-[16px] leading-[1.7] text-ink-600 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink-900">
            {intro}
          </div>
        </div>

        <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[220px_minmax(0,720px)] lg:gap-16">
          <aside className="hidden lg:block">
            <nav aria-label="Seções" className="sticky top-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                Nesta página
              </p>
              <TocList sections={sections} className="mt-4" />
            </nav>
          </aside>

          <details className="group mb-10 rounded-card border border-ink-200 bg-ink-50/60 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
              Nesta página
              <ArrowRight
                className="h-4 w-4 text-ink-500 transition-transform duration-200 group-open:rotate-90"
                strokeWidth={2.2}
              />
            </summary>
            <nav aria-label="Seções" className="border-t border-ink-200 px-4 pb-4 pt-3">
              <TocList sections={sections} />
            </nav>
          </details>

          <article className="min-w-0">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-8 border-t border-ink-200/70 pt-8 first:border-t-0 first:pt-0 [&+section]:mt-10"
              >
                <h2 className="text-[20px] font-bold leading-[1.3] tracking-[-0.01em] text-ink-900 md:text-[22px]">
                  <span className="mr-2 text-brand">{index + 1}.</span>
                  {section.title}
                </h2>
                <div className={PROSE}>{section.content}</div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <footer className="border-t border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="space-y-2">
            <p className="text-[13px] text-ink-500">Leia também</p>
            <Link
              href={related.href}
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink-900 underline decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand"
            >
              {related.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.2} />
            </Link>
          </div>
          <div className="space-y-2 md:text-right">
            <p className="text-[13px] text-ink-500">Dúvidas sobre este documento?</p>
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-900 transition-colors hover:text-brand"
            >
              <Mail className="h-4 w-4" strokeWidth={2.2} />
              {LEGAL_CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1120px] px-5 pb-8 md:px-10">
          <p className="text-[11px] text-ink-400">
            © {new Date().getFullYear()} musclePro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function TocList({ sections, className }: { sections: LegalSection[]; className?: string }) {
  return (
    <ol className={className ? `space-y-2.5 ${className}` : "space-y-2.5"}>
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex gap-2 text-[13px] leading-[1.45] text-ink-600 transition-colors hover:text-ink-900"
          >
            <span className="w-5 shrink-0 tabular-nums text-ink-400">{index + 1}.</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
