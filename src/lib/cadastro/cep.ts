import { onlyDigits } from "./masks";

export type CEPAddress = {
  zip: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

// Endereço a partir do CEP: BrasilAPI (base dos Correios) e, se ela falhar,
// ViaCEP. Lança erro com mensagem pronta para a tela.
export async function fetchCEP(cep: string, signal?: AbortSignal): Promise<CEPAddress> {
  const clean = onlyDigits(cep);
  if (clean.length !== 8) throw new Error("O CEP tem 8 números.");

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, { signal });
    if (res.ok) {
      const d = (await res.json()) as { cep: string; street?: string; neighborhood?: string; city?: string; state?: string };
      return { zip: clean, street: d.street ?? "", district: d.neighborhood ?? "", city: d.city ?? "", state: d.state ?? "" };
    }
    if (res.status !== 404) throw new Error("fallback");
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
  }

  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { signal });
  if (!res.ok) throw new Error("Não foi possível consultar o CEP agora. Preencha o endereço à mão.");
  const d = (await res.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
  if (d.erro) throw new Error("CEP não encontrado. Confira os números.");
  return { zip: clean, street: d.logradouro ?? "", district: d.bairro ?? "", city: d.localidade ?? "", state: d.uf ?? "" };
}
