import type { BusinessType } from "@/lib/supabase/leads";

export type DocType = "cnpj" | "cpf";

export type EstabelecimentoForm = {
  // responsável pela conta
  nome: string;
  telefone: string;
  email: string;
  docType: DocType;
  documento: string;
  // estabelecimento
  nomeEstabelecimento: string;
  tipo: BusinessType | "";
  // preenchidos pela consulta de CNPJ (BrasilAPI)
  razaoSocial?: string;
  endereco?: string;
};
