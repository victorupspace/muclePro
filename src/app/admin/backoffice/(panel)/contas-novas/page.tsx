"use client";

import { AccountsTableView } from "@/components/admin/AccountsTableView";
import { PageHeader } from "@/components/admin/PageHeader";

export default function ContasNovasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas novas"
        description="Cadastros recém-recebidos que ainda precisam de revisão e aprovação manual do time."
      />
      <AccountsTableView filterStatus="nova" />
    </div>
  );
}
