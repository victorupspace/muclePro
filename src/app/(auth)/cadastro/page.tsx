"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { StepAccountType } from "@/components/auth/StepAccountType";
import { StepConsultorForm } from "@/components/auth/StepConsultorForm";
import { StepComercializadoraForm } from "@/components/auth/StepComercializadoraForm";
import { StepSuccess } from "@/components/auth/StepSuccess";
import type {
  AccountType,
  ComercializadoraForm,
  ConsultorForm,
} from "@/components/auth/types";
import {
  createComercializadoraRegistration,
  createConsultorRegistration,
} from "@/lib/supabase/leads";

type StepIndex = 1 | 2 | 3;

export default function CadastroPage() {
  const [step, setStep] = useState<StepIndex>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [submittedAccountType, setSubmittedAccountType] = useState<AccountType | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function goToStep2() {
    if (!accountType) return;
    setSubmitError(null);
    setSubmittedAccountType(null);
    setStep(2);
  }

  function backToStep1() {
    setSubmitError(null);
    setSubmittedAccountType(null);
    setStep(1);
  }

  async function handleConsultorSubmit(data: ConsultorForm) {
    setSubmitError(null);
    try {
      await createConsultorRegistration({
        fullName: data.nome,
        phone: data.telefone,
        email: data.email,
        documentType: data.docType,
        document: data.documento,
        companyName: data.razaoSocial,
        address: data.endereco,
      });
      setSubmittedAccountType("consultor");
      setStep(3);
    } catch {
      setSubmitError("Não foi possível enviar seu cadastro agora. Tente novamente em instantes.");
    }
  }

  async function handleComercializadoraSubmit(data: ComercializadoraForm) {
    setSubmitError(null);
    try {
      await createComercializadoraRegistration({
        fullName: data.nome,
        phone: data.telefone,
        email: data.email,
      });
      setSubmittedAccountType("comercializadora");
      setStep(3);
    } catch {
      setSubmitError("Não foi possível enviar seu cadastro agora. Tente novamente em instantes.");
    }
  }

  const mediaVariant = step === 1 ? "intro" : step === 2 ? "form" : "success";
  const successAccountType = submittedAccountType ?? accountType ?? "consultor";

  return (
    <AuthShell
      step={step}
      onBack={step === 2 ? backToStep1 : undefined}
      mediaVariant={mediaVariant}
    >
      {submitError && (
        <div className="mb-4 rounded-card border border-danger-200 bg-danger-50/80 px-4 py-3 text-[13px] leading-[1.5] text-danger-700">
          {submitError}
        </div>
      )}

      {step === 1 && (
        <StepAccountType
          selected={accountType}
          onSelect={setAccountType}
          onContinue={goToStep2}
        />
      )}

      {step === 2 && accountType === "consultor" && (
        <StepConsultorForm
          onCancel={backToStep1}
          onSubmit={handleConsultorSubmit}
        />
      )}

      {step === 2 && accountType === "comercializadora" && (
        <StepComercializadoraForm
          onCancel={backToStep1}
          onSubmit={handleComercializadoraSubmit}
        />
      )}

      {step === 3 && <StepSuccess accountType={successAccountType} />}
    </AuthShell>
  );
}
