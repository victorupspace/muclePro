import { onlyDigits } from "./masks";

export type BrasilApiCNPJResponse = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  ddd_telefone_1: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
};

export type CNPJData = {
  razaoSocial: string;
  nomeFantasia: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
};

export async function fetchCNPJ(cnpj: string, signal?: AbortSignal): Promise<CNPJData> {
  const clean = onlyDigits(cnpj);
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { signal });
  if (!res.ok) {
    if (res.status === 404) throw new Error("CNPJ não encontrado na Receita Federal.");
    throw new Error("Não foi possível consultar o CNPJ. Tente novamente.");
  }
  const data = (await res.json()) as BrasilApiCNPJResponse;
  return {
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia,
    email: data.email,
    endereco: formatEndereco(data),
    cidade: data.municipio,
    uf: data.uf,
  };
}

function formatEndereco(d: BrasilApiCNPJResponse): string | null {
  const rua = [d.logradouro, d.numero].filter(Boolean).join(", ");
  const bairro = d.bairro ?? "";
  const cidade = [d.municipio, d.uf].filter(Boolean).join("/");
  const cep = d.cep ? `CEP ${formatCEP(d.cep)}` : "";
  const parts = [rua, bairro, cidade, cep].filter((p) => p && p.length > 0);
  return parts.length ? parts.join(" — ") : null;
}

function formatCEP(cep: string) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return cep;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
