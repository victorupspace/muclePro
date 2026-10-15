import { supabase } from "./client";

// Tipo de estabelecimento informado no formulário da home.
export type BusinessType = "academia" | "estudio" | "natacao" | "crossfit" | "lutas" | "outro";

export type HeroFormPayload = {
  fullName: string;
  phone: string;
  email: string;
  businessType: BusinessType;
  // Faixas, não números exatos: "1" | "2-5" | "6+" e "ate-100" | "100-300" | ...
  unitsRange: string;
  activeStudentsRange: string;
};

export type AccountRegistrationPayload = {
  // responsável pela conta
  fullName: string;
  phone: string;
  email: string;
  documentType: "cnpj" | "cpf";
  document: string;
  // estabelecimento
  companyName: string;
  businessType: BusinessType;
  address?: string | null;
};

// Lead da home. A tabela hero_form_submissions precisa ser recriada no banco
// novo com estas colunas (business_type, units_range, active_students_range).
export async function createHeroFormSubmission(payload: HeroFormPayload) {
  const { error } = await supabase.from("hero_form_submissions").insert({
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    business_type: payload.businessType,
    units_range: payload.unitsRange,
    active_students_range: payload.activeStudentsRange,
  });

  if (error) throw error;
}

// Cadastro de um estabelecimento (tela /cadastro). A conta nasce com
// status "nova" e é aprovada manualmente no backoffice.
export async function createAccountRegistration(payload: AccountRegistrationPayload) {
  const { error } = await supabase.from("accounts").insert({
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    document_type: payload.documentType,
    document: payload.document,
    company_name: payload.companyName,
    business_type: payload.businessType,
    address: payload.address ?? null,
    source: "cadastro",
  });

  if (error) throw error;
}

// Violação de unicidade (Postgres 23505). Em accounts só existe o índice
// único em lower(email), então equivale a "e-mail já cadastrado".
export function isDuplicateEmailError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
