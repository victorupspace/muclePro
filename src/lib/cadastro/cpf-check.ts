import { isValidCPF, onlyDigits } from "./masks";
import { supabase } from "@/lib/supabase/client";

export type CPFStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; source: "receita" | "algoritmo"; warning?: string; nameMatches?: boolean; birthMatches?: boolean }
  | { state: "invalid"; message: string };

// Confere um CPF: os dígitos aqui mesmo e, no servidor, a Receita Federal
// (quando a integração com o Serpro estiver ativa). `publicSignup` usa a rota
// aberta do cadastro de academias; as demais exigem login da equipe.
export async function checkCpf(
  cpf: string,
  opts: { fullName?: string; birthDate?: string; publicSignup?: boolean } = {},
): Promise<CPFStatus> {
  const digits = onlyDigits(cpf);
  if (digits.length < 11) return { state: "invalid", message: "O CPF tem 11 números." };
  if (!isValidCPF(digits)) return { state: "invalid", message: "CPF inválido. Confira os números digitados." };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!opts.publicSignup) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(opts.publicSignup ? "/api/cadastro/cpf" : "/api/plataforma/cpf", {
    method: "POST",
    headers,
    body: JSON.stringify({ cpf: digits, fullName: opts.fullName, birthDate: opts.birthDate }),
  }).catch(() => null);
  const result = (await response?.json().catch(() => null)) as
    | { valid?: boolean; source?: "receita" | "algoritmo"; message?: string; warning?: string; nameMatches?: boolean; birthMatches?: boolean }
    | null;
  // Sem resposta do servidor, vale a conferência dos dígitos.
  if (!response?.ok || !result) return { state: "ok", source: "algoritmo" };
  if (!result.valid) return { state: "invalid", message: result.message ?? "CPF inválido." };
  return {
    state: "ok",
    source: result.source ?? "algoritmo",
    warning: result.warning,
    nameMatches: result.nameMatches,
    birthMatches: result.birthMatches,
  };
}
