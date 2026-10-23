import "server-only";
import { isValidCPF, onlyDigits } from "@/lib/cadastro/masks";

// Validação de CPF do cadastro de aluno.
//   1. Sempre: dígitos verificadores e sequências inválidas.
//   2. Com contrato Serpro (API Consulta CPF da Receita Federal), confere se o
//      CPF existe, a situação cadastral e se nome e nascimento batem.
//      Variáveis: SERPRO_CONSUMER_KEY e SERPRO_CONSUMER_SECRET. Para testar
//      com os CPFs de demonstração do Serpro: SERPRO_MODE=trial.
// Se a Receita não responder, o cadastro segue só com a validação dos dígitos.

const GATEWAY = "https://gateway.apiserpro.serpro.gov.br";
const TRIAL_TOKEN = "06aef429-a981-3ec5-a1f8-71d38d86481e";

export type CPFCheck = {
  valid: boolean;
  source: "receita" | "algoritmo";
  message?: string;
  warning?: string;
  nameMatches?: boolean;
  birthMatches?: boolean;
};

// Situações da Receita: 0 regular; 2 suspensa e 4 pendente existem, mas
// merecem aviso; as demais indicam CPF que não pode ser usado.
const BLOCKING: Record<string, string> = {
  "3": "Este CPF é de um titular falecido.",
  "5": "Este CPF foi cancelado por multiplicidade na Receita Federal.",
  "8": "Este CPF é nulo na Receita Federal.",
  "9": "Este CPF foi cancelado pela Receita Federal.",
};
const WARNING: Record<string, string> = {
  "2": "CPF suspenso na Receita Federal. O cadastro pode seguir, mas vale avisar o aluno.",
  "4": "CPF pendente de regularização na Receita Federal.",
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function serproMode(): "producao" | "trial" | null {
  if (process.env.SERPRO_MODE === "trial") return "trial";
  if (process.env.SERPRO_CONSUMER_KEY && process.env.SERPRO_CONSUMER_SECRET) return "producao";
  return null;
}

async function serproToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const basic = Buffer.from(`${process.env.SERPRO_CONSUMER_KEY}:${process.env.SERPRO_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${GATEWAY}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Serpro token ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Primeiro e último nome iguais bastam: abreviações no meio são comuns.
function namesMatch(typed: string, official: string) {
  const a = normalizeName(typed);
  const b = normalizeName(official);
  if (!a.length || !b.length) return false;
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1];
}

export async function checkCPF(cpf: string, fullName?: string, birthDate?: string): Promise<CPFCheck> {
  const digits = onlyDigits(cpf);
  if (!isValidCPF(digits)) {
    return { valid: false, source: "algoritmo", message: "CPF inválido. Confira os números digitados." };
  }

  const mode = serproMode();
  if (!mode) return { valid: true, source: "algoritmo" };

  try {
    const token = mode === "trial" ? TRIAL_TOKEN : await serproToken();
    const path = mode === "trial" ? "consulta-cpf-df-trial" : "consulta-cpf-df";
    const res = await fetch(`${GATEWAY}/${path}/v1/cpf/${digits}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) {
      return { valid: false, source: "receita", message: "Este CPF não existe na Receita Federal." };
    }
    if (!res.ok) throw new Error(`Serpro ${res.status}`);
    const data = (await res.json()) as { nome?: string; nascimento?: string; situacao?: { codigo?: string } };
    const code = data.situacao?.codigo ?? "0";
    if (BLOCKING[code]) return { valid: false, source: "receita", message: BLOCKING[code] };

    // nascimento vem como ddmmaaaa.
    const birth = data.nascimento && /^\d{8}$/.test(data.nascimento)
      ? `${data.nascimento.slice(4)}-${data.nascimento.slice(2, 4)}-${data.nascimento.slice(0, 2)}`
      : null;
    return {
      valid: true,
      source: "receita",
      warning: WARNING[code],
      nameMatches: fullName && data.nome ? namesMatch(fullName, data.nome) : undefined,
      birthMatches: birthDate && birth ? birthDate === birth : undefined,
    };
  } catch (error) {
    console.error("consulta cpf serpro", error);
    return { valid: true, source: "algoritmo" };
  }
}
