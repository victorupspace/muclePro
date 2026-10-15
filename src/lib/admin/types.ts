import type { BusinessType } from "@/lib/supabase/leads";

export type { BusinessType };

export type DocumentKind = "cnpj" | "cpf";

export type AccountStatus = "nova" | "criada";

export type PaymentStatus =
  | "em_dia"
  | "pendente"
  | "atrasado"
  | "trial"
  | "cancelado"
  | "nao_iniciado";

// Status comercial de um lead da landing (hero_form_submissions).
export type LeadStatus = "aguardando" | "em_contato" | "convertida" | "perdida";

export type HistoryEvent = {
  id: string;
  at: string;
  label: string;
  by?: string;
};

export type Account = {
  id: string;
  // responsável pela conta
  fullName: string;
  email: string;
  phone: string;
  documentKind: DocumentKind;
  document: string;
  // estabelecimento
  companyName?: string;
  businessType?: BusinessType;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  unitsRange?: string;
  activeStudentsRange?: string;
  // ciclo de vida
  createdAt: string;
  approvedAt?: string;
  status: AccountStatus;
  active: boolean;
  payment: {
    status: PaymentStatus;
    plan?: string;
    monthlyAmount?: number;
    nextDueAt?: string;
    lastPaidAt?: string;
  };
  history: HistoryEvent[];
};

export type LandingLead = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  businessType: BusinessType;
  unitsRange?: string;
  activeStudentsRange?: string;
  requestedAt: string;
  status: LeadStatus;
  handledAt?: string;
  history: HistoryEvent[];
};
