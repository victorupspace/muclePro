"use client";

import { AccountsTableView } from "@/components/admin/AccountsTableView";
import { PageHeader } from "@/components/admin/PageHeader";

export default function ContasAtivasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas ativas"
        description="Contas verificadas e aprovadas pelo time. Aqui você gerencia atividade, pagamentos e exclusões."
      />
      <AccountsTableView filterStatus="criada" />
    </div>
  );
}
