import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { CPFStatus } from "@/lib/cadastro/cpf-check";

// Situação da conferência do CPF, logo abaixo do campo.
export function CpfStatusLine({ status }: { status: CPFStatus }) {
  if (status.state === "checking") {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-ink-500">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
        Conferindo o CPF...
      </p>
    );
  }
  if (status.state === "invalid") {
    return (
      <p role="alert" className="mt-1 text-[11.5px] font-semibold text-danger-600">
        {status.message}
      </p>
    );
  }
  if (status.state === "ok") {
    const mismatch = status.nameMatches === false || status.birthMatches === false;
    if (status.warning || mismatch) {
      return (
        <p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-semibold leading-[1.45] text-warning-800">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" strokeWidth={2.4} />
          {status.warning ??
            (status.nameMatches === false ? "O nome não bate com o da Receita Federal. Confira o CPF." : "A data de nascimento não bate com a da Receita Federal.")}
        </p>
      );
    }
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success-700">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
        {status.source === "receita" ? "CPF confere na Receita Federal" : "CPF válido"}
      </p>
    );
  }
  return null;
}
