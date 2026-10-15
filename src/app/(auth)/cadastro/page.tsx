"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { StepEstabelecimentoForm } from "@/components/auth/StepEstabelecimentoForm";
import { StepSuccess } from "@/components/auth/StepSuccess";
import type { EstabelecimentoForm } from "@/components/auth/types";
import { createAccountRegistration, isDuplicateEmailError } from "@/lib/supabase/leads";

type StepIndex = 1 | 2;

type SubmitError = {
  message: string;
  // e-mail já cadastrado: oferece o atalho para o login
  duplicateEmail: boolean;
};

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(1);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  async function handleSubmit(data: EstabelecimentoForm) {
    setSubmitError(null);
    if (!data.tipo) return;

    try {
      await createAccountRegistration({
        fullName: data.nome,
        phone: data.telefone,
        email: data.email,
        documentType: data.docType,
        document: data.documento,
        companyName: data.nomeEstabelecimento,
        businessType: data.tipo,
        address: data.endereco ?? null,
      });
      setStep(2);
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        setSubmitError({
          message: "Já existe um cadastro com este e-mail. Se for você, entre pelo login.",
          duplicateEmail: true,
        });
        return;
      }
      setSubmitError({
        message: "Não foi possível enviar seu cadastro agora. Tente novamente em instantes.",
        duplicateEmail: false,
      });
    }
  }

  return (
    <AuthShell
      step={step}
      totalSteps={2}
      mediaVariant={step === 1 ? "form" : "success"}
    >
      {submitError && (
        <div className="mb-4 rounded-card border border-danger-200 bg-danger-50/80 px-4 py-3 text-[13px] leading-[1.5] text-danger-700">
          {submitError.message}
          {submitError.duplicateEmail && (
            <>
              {" "}
              <Link
                href="/login"
                className="font-bold underline decoration-2 underline-offset-4 transition-colors hover:text-danger-900"
              >
                Ir para o login
              </Link>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <StepEstabelecimentoForm onCancel={() => router.push("/")} onSubmit={handleSubmit} />
      )}

      {step === 2 && <StepSuccess />}
    </AuthShell>
  );
}
