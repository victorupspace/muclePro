export type AccountType = "consultor" | "comercializadora";

export type DocType = "cnpj" | "cpf";

export type ConsultorForm = {
  nome: string;
  telefone: string;
  email: string;
  docType: DocType;
  documento: string;
  razaoSocial?: string;
  endereco?: string;
};

export type ComercializadoraForm = {
  nome: string;
  email: string;
  telefone: string;
};
