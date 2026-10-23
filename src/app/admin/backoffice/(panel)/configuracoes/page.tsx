"use client";

import { Database, Lock, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

const ITEMS = [
  {
    icon: Lock,
    title: "Autenticação Supabase",
    body:
      "Login interno conectado ao Supabase Auth, com acesso limitado aos usuários ativos em admin_profiles.",
  },
  {
    icon: Users,
    title: "Roles & permissões",
    body:
      "Base preparada para papéis Admin e Operador; o próximo passo é granular ações sensíveis por role.",
  },
  {
    icon: ShieldCheck,
    title: "Logs de auditoria",
    body:
      "Ações administrativas são persistidas em audit_events e exibidas no histórico de cada registro.",
  },
  {
    icon: Database,
    title: "Row Level Security",
    body:
      "Políticas RLS separam inserts públicos dos formulários e leitura/escrita restrita ao backoffice.",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Área reservada para evoluções futuras do backoffice. Estrutura preparada para receber integrações reais quando o time estiver pronto."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-card border border-dashed border-ink-200 bg-white p-5"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-ink-100 text-ink-700">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink-900">{item.title}</p>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-500">{item.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-card border border-ink-200 bg-ink-50/60 px-5 py-4 text-[12.5px] leading-[1.55] text-ink-600">
        <strong className="font-semibold text-ink-900">Status atual:</strong>{" "}
        backoffice conectado ao Supabase. Cadastros, aprovações, status e histórico passam a ser persistidos.
      </div>
    </div>
  );
}
