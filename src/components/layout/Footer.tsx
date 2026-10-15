"use client";

import { Logo } from "@/components/ui/Logo";
import { Container } from "@/components/ui/Container";
import { Instagram, Linkedin, Youtube, Mail } from "lucide-react";

const LINKS = {
  produto: [
    { label: "Visão geral", href: "#produto" },
    { label: "Base de alunos", href: "#alunos" },
    { label: "Comercial e controle", href: "#financeiro" },
    { label: "Equipe e permissões", href: "#equipe" },
  ],
  empresa: [
    { label: "Sobre o musclePro", href: "#about" },
    { label: "Contato", href: "#contact" },
    { label: "Trabalhe conosco", href: "#careers" },
  ],
  legal: [
    { label: "Política de privacidade", href: "/privacidade" },
    { label: "Termos de uso", href: "/termos" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-ink-900 text-white">
      <Container className="py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-6 max-w-xs text-body text-white/60">
              Sistema de gestão para academias, estúdios, escolas de natação,
              boxes e outros negócios de atividade física.
            </p>
            <div className="mt-8 flex gap-3">
              <SocialLink href="#linkedin" icon={<Linkedin size={16} />} label="LinkedIn" />
              <SocialLink href="#instagram" icon={<Instagram size={16} />} label="Instagram" />
              <SocialLink href="#youtube" icon={<Youtube size={16} />} label="YouTube" />
              <SocialLink href="mailto:contato@musclepro.com.br" icon={<Mail size={16} />} label="E-mail" />
            </div>
          </div>

          <FooterColumn title="Produto" links={LINKS.produto} />
          <FooterColumn title="Empresa" links={LINKS.empresa} />
          <FooterColumn title="Legal" links={LINKS.legal} />
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-[13px] text-white/50 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} musclePro. Todos os direitos reservados.</p>
          <p>Feito para quem opera, não para quem treina.</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-overline font-semibold uppercase text-white/50">{title}</h4>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-body text-white/80 transition-colors hover:text-brand-light"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-btn border border-white/10 text-white/70 transition-all hover:border-brand hover:text-brand-light"
    >
      {icon}
    </a>
  );
}
