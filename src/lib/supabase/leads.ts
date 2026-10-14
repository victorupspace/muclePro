import { supabase } from "./client";

export type ClientType = "consultor" | "comercializadora" | "consumidor";

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

export type ConsultorRegistrationPayload = {
  fullName: string;
  phone: string;
  email: string;
  documentType: string;
  document: string;
  companyName?: string | null;
  address?: string | null;
};

export type ComercializadoraRegistrationPayload = {
  fullName: string;
  phone: string;
  email: string;
};

export type ConsumidorRegistrationPayload = {
  fullName: string;
  phone: string;
  email: string;
  segment?: string | null;
  monthlyEnergySpend?: string | null;
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

export async function createConsultorRegistration(payload: ConsultorRegistrationPayload) {
  const { error: legacyError } = await supabase.from("consultor_registrations").insert({
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    document_type: payload.documentType,
    document: payload.document,
    company_name: payload.companyName,
    address: payload.address,
  });

  if (legacyError) throw legacyError;

  const { error } = await supabase.from("accounts").insert({
    kind: "consultor",
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    document_type: payload.documentType,
    document: payload.document,
    company_name: payload.companyName,
    address: payload.address,
    source: "cadastro",
    metadata: {
      origin_table: "consultor_registrations",
    },
  });

  if (error) throw error;
}

export async function createComercializadoraRegistration(
  payload: ComercializadoraRegistrationPayload,
) {
  const { error: legacyError } = await supabase.from("comercializadora_registrations").insert({
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
  });

  if (legacyError) throw legacyError;

  const { error } = await supabase.from("commercializer_leads").insert({
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    source: "cadastro",
    metadata: {
      origin_table: "comercializadora_registrations",
    },
  });

  if (error) throw error;
}

export async function createConsumidorRegistration(payload: ConsumidorRegistrationPayload) {
  const { error } = await supabase.from("consumidor_registrations").insert({
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    segment: payload.segment,
    monthly_energy_spend: payload.monthlyEnergySpend,
  });

  if (error) throw error;
}
