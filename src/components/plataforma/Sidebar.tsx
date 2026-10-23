"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BadgeCheck,
  CreditCard,
  Dumbbell,
  HeadphonesIcon,
  History,
  LayoutDashboard,
  ListTodo,
  KanbanSquare,
  LogOut,
  Settings,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

type Item = { label: string; href: string; icon: LucideIcon; external?: boolean };

const PRIMARY: Item[] = [
  { label: "Dashboard", href: "/plataforma", icon: LayoutDashboard },
  { label: "Alunos", href: "/plataforma/alunos", icon: Users },
  { label: "Matrículas", href: "/plataforma/matriculas", icon: KanbanSquare },
  { label: "Treinos", href: "/plataforma/treinos", icon: Dumbbell },
  { label: "Equipe", href: "/plataforma/equipe", icon: UserCog },
  { label: "Planos", href: "/plataforma/planos", icon: CreditCard },
  { label: "Tarefas", href: "/plataforma/tarefas", icon: ListTodo },
];

const BILLING: Item = { label: "Assinatura", href: "/plataforma/assinatura", icon: BadgeCheck };
const REPORTS: Item = { label: "Relatórios", href: "/plataforma/relatorios", icon: BarChart3 };
const TEAM_LOG: Item = { label: "Atividade da equipe", href: "/plataforma/atividades", icon: History };

const SECONDARY: Item[] = [
  { label: "Configurações", href: "/plataforma/configuracoes", icon: Settings },
  { label: "Fale conosco", href: "/plataforma/fale-conosco", icon: HeadphonesIcon },
];

type Props = {
  fullName: string;
  companyName?: string;
  // Ex.: "Recepção · Centro" para funcionários; vazio para o dono.
  roleLine?: React.ReactNode;
  // Gestores veem o registro da equipe; gestão e contabilidade, os relatórios.
  showTeamLog?: boolean;
  showReports?: boolean;
  showBilling?: boolean;
  onSignOut: () => void;
  onClose?: () => void;
};

export function Sidebar({ fullName, companyName, roleLine, showTeamLog, showReports, showBilling, onSignOut, onClose }: Props) {
  const pathname = usePathname();
  const firstName = fullName.split(" ")[0] ?? fullName;

  return (
    <>
      <div className="flex h-[77px] shrink-0 items-center justify-between border-b border-ink-200 px-5">
        <Link href="/plataforma" className="inline-flex">
          <Logo variant="dark" className="scale-[0.7] origin-left" />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        )}
      </div>

      <div className="px-5 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
          Bem-vindo
        </p>
        <p className="mt-1 truncate text-[14px] font-bold text-ink-900">{firstName}</p>
        {companyName && (
          <p className="truncate text-[11.5px] text-ink-500">{companyName}</p>
        )}
        {roleLine && (
          <p className="mt-1.5 inline-flex max-w-full items-center truncate rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-600">
            {roleLine}
          </p>
        )}
      </div>

      <nav className="mt-5 flex-1 space-y-0.5 px-3">
        <p className="px-3 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-400">
          Operação
        </p>
        {PRIMARY.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="mt-5 px-3 pb-1.5 pt-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-400">
          Conta
        </div>
        {[...(showReports ? [REPORTS] : []), ...(showTeamLog ? [TEAM_LOG] : []), ...(showBilling ? [BILLING] : []), ...SECONDARY].map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-ink-200 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-btn border border-ink-200 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
          Sair
        </button>
      </div>
    </>
  );
}

function NavItem({ item, pathname }: { item: Item; pathname: string | null }) {
  const active =
    !item.external &&
    (item.href === "/plataforma" ? pathname === "/plataforma" : pathname?.startsWith(item.href));
  const Icon = item.icon;
  const className = cn(
    "group relative flex items-center gap-2.5 rounded-btn px-3 py-2.5 text-[13px] font-medium transition-colors",
    active ? "bg-brand text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  );

  const content = (
    <>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {item.label}
      {active && (
        <span className="absolute right-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-brand-light" />
      )}
    </>
  );

  if (item.external) {
    return (
      <a href={item.href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}
