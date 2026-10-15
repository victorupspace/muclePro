"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Field } from "./Field";
import { SelectField } from "./SelectField";
import {
  isValidCNPJ,
  isValidCPF,
  isValidEmail,
  isValidName,
  isValidPhone,
  maskCNPJ,
  maskCPF,
  maskPhoneBR,
  onlyDigits,
} from "@/lib/cadastro/masks";
import { fetchCNPJ } from "@/lib/cadastro/brasilapi";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import type { BusinessType } from "@/lib/supabase/leads";
import type { DocType, EstabelecimentoForm } from "./types";

export const BUSINESS_TYPE_OPTIONS: readonly { value: BusinessType; label: string }[] = [
  { value: "academia", label: "Academia de musculação" },
  { value: "estudio", label: "Estúdio (funcional, pilates, yoga)" },
  { value: "natacao", label: "Escola de natação" },
  { value: "crossfit", label: "Box de crossfit" },
  { value: "lutas", label: "Academia de lutas ou jiu-jitsu" },
  { value: "outro", label: "Outro negócio de saúde" },
];

type FieldKey = keyof EstabelecimentoForm;
type FieldErrors = Partial<Record<FieldKey, string | null>>;
type Touched = Partial<Record<FieldKey, boolean>>;

const REQUIRED_KEYS: FieldKey[] = [
  "nome",
  "documento",
  "nomeEstabelecimento",
  "tipo",
  "email",
  "telefone",
];

type Props = {
  initial?: Partial<EstabelecimentoForm>;
  onCancel: () => void;
  onSubmit: (data: EstabelecimentoForm) => Promise<void> | void;
};

export function StepEstabelecimentoForm({ initial, onCancel, onSubmit }: Props) {
  const [form, setForm] = useState<EstabelecimentoForm>({
    nome: initial?.nome ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    docType: initial?.docType ?? "cnpj",
    documento: initial?.documento ?? "",
    nomeEstabelecimento: initial?.nomeEstabelecimento ?? "",
    tipo: initial?.tipo ?? "",
    razaoSocial: initial?.razaoSocial,
    endereco: initial?.endereco,
  });
  const [touched, setTouched] = useState<Touched>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjFetched, setCnpjFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  // Último nome sugerido pela consulta de CNPJ. Só sobrescrevemos o nome do
  // estabelecimento quando ele ainda está vazio ou veio de uma sugestão.
  const autofilledNameRef = useRef<string | null>(null);

  function update<K extends FieldKey>(key: K, value: EstabelecimentoForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function validateField(key: FieldKey, value: string, docType: DocType): string | null {
    switch (key) {
      case "nome":
        if (!value.trim()) return "Informe o nome do responsável.";
        if (!isValidName(value)) return "Use apenas letras.";
        return null;
      case "nomeEstabelecimento":
        if (!value.trim()) return "Informe o nome do estabelecimento.";
        if (value.trim().length < 2) return "Nome muito curto.";
        return null;
      case "tipo":
        if (!value) return "Selecione o tipo de estabelecimento.";
        return null;
      case "email":
        if (!value) return "Informe seu e-mail.";
        if (!isValidEmail(value)) return "E-mail inválido.";
        return null;
      case "telefone":
        if (!value) return "Informe seu telefone.";
        if (!isValidPhone(value)) return "Telefone incompleto.";
        return null;
      case "documento":
        if (!value) return docType === "cnpj" ? "Informe o CNPJ." : "Informe o CPF.";
        if (docType === "cnpj" && !isValidCNPJ(value)) return "CNPJ inválido.";
        if (docType === "cpf" && !isValidCPF(value)) return "CPF inválido.";
        return null;
      default:
        return null;
    }
  }

  function handleBlur(key: FieldKey) {
    setTouched((t) => ({ ...t, [key]: true }));
    const value = String(form[key] ?? "");
    setErrors((e) => ({ ...e, [key]: validateField(key, value, form.docType) }));
  }

  // Consulta automática do CNPJ na BrasilAPI
  useEffect(() => {
    if (form.docType !== "cnpj") return;
    const digits = onlyDigits(form.documento);
    if (digits.length !== 14) {
      setCnpjFetched(false);
      setCnpjError(null);
      return;
    }
    if (!isValidCNPJ(form.documento)) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setCnpjLoading(true);
    setCnpjError(null);
    fetchCNPJ(form.documento, ctrl.signal)
      .then((data) => {
        setCnpjFetched(true);
        const suggestedName = data.nomeFantasia?.trim() || data.razaoSocial;
        const previousSuggestion = autofilledNameRef.current;
        autofilledNameRef.current = suggestedName;
        setForm((s) => {
          const keepTyped =
            s.nomeEstabelecimento.length > 0 && s.nomeEstabelecimento !== previousSuggestion;
          return {
            ...s,
            razaoSocial: data.razaoSocial,
            endereco: data.endereco ?? undefined,
            email: s.email || (data.email ?? ""),
            nomeEstabelecimento: keepTyped ? s.nomeEstabelecimento : suggestedName,
          };
        });
        setErrors((e) => ({ ...e, nomeEstabelecimento: null }));
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setCnpjError(err.message);
        setCnpjFetched(false);
      })
      .finally(() => setCnpjLoading(false));

    return () => ctrl.abort();
  }, [form.documento, form.docType]);

  function toggleDocType(next: DocType) {
    if (next === form.docType) return;
    const previousSuggestion = autofilledNameRef.current;
    autofilledNameRef.current = null;
    setForm((s) => ({
      ...s,
      docType: next,
      documento: "",
      razaoSocial: undefined,
      endereco: undefined,
      nomeEstabelecimento:
        previousSuggestion && s.nomeEstabelecimento === previousSuggestion
          ? ""
          : s.nomeEstabelecimento,
    }));
    setErrors((e) => ({ ...e, documento: null }));
    setTouched((t) => ({ ...t, documento: false }));
    setCnpjFetched(false);
    setCnpjError(null);
  }

  const isFormValid =
    REQUIRED_KEYS.every((key) => !validateField(key, String(form[key] ?? ""), form.docType)) &&
    (form.docType === "cpf" || cnpjFetched);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    REQUIRED_KEYS.forEach((key) => {
      next[key] = validateField(key, String(form[key] ?? ""), form.docType);
    });
    setErrors(next);
    setTouched(Object.fromEntries(REQUIRED_KEYS.map((key) => [key, true])) as Touched);
    if (Object.values(next).some(Boolean)) return;
    if (form.docType === "cnpj" && !cnpjFetched) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        nome: form.nome.trim(),
        email: form.email.trim(),
        nomeEstabelecimento: form.nomeEstabelecimento.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex h-full flex-col"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Passo 01 — Dados do estabelecimento
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
          Peça a conta do seu estabelecimento.
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
          Preencha os dados do responsável e do espaço. Se informar o CNPJ, completamos razão
          social e endereço automaticamente. Todo cadastro passa por uma avaliação da nossa equipe
          antes da liberação.
        </p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
        }}
        className="mt-7 space-y-3"
      >
        <Stagger>
          <Field
            label="Nome do responsável"
            value={form.nome}
            onChange={(e) => {
              const v = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "");
              update("nome", v);
            }}
            onBlur={() => handleBlur("nome")}
            error={touched.nome ? errors.nome : null}
            success={touched.nome && !errors.nome && form.nome.length > 0}
            autoComplete="name"
          />
        </Stagger>

        <Stagger>
          <DocSwitcher value={form.docType} onChange={toggleDocType} />
          <Field
            label={form.docType === "cnpj" ? "CNPJ do estabelecimento" : "CPF do responsável"}
            value={form.documento}
            onChange={(e) => {
              const masked = form.docType === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value);
              update("documento", masked);
              setCnpjError(null);
            }}
            onBlur={() => handleBlur("documento")}
            error={touched.documento ? errors.documento ?? cnpjError : cnpjError}
            success={
              form.docType === "cpf"
                ? touched.documento && !errors.documento && isValidCPF(form.documento)
                : cnpjFetched
            }
            loading={cnpjLoading}
            inputMode="numeric"
            placeholder={form.docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
          />
          {form.docType === "cnpj" && form.razaoSocial && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 space-y-3 rounded-card border border-ink-200 bg-ink-50/60 px-4 py-3.5"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  Razão social
                </p>
                <p className="mt-1 text-[13px] font-semibold text-ink-900">{form.razaoSocial}</p>
              </div>
              {form.endereco && (
                <div className="border-t border-ink-200/70 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                    Endereço
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-ink-700">{form.endereco}</p>
                </div>
              )}
            </motion.div>
          )}
        </Stagger>

        <Stagger>
          <Field
            label="Nome do estabelecimento"
            value={form.nomeEstabelecimento}
            onChange={(e) => update("nomeEstabelecimento", e.target.value)}
            onBlur={() => handleBlur("nomeEstabelecimento")}
            error={touched.nomeEstabelecimento ? errors.nomeEstabelecimento : null}
            success={
              touched.nomeEstabelecimento &&
              !errors.nomeEstabelecimento &&
              form.nomeEstabelecimento.length > 0
            }
            autoComplete="organization"
          />
        </Stagger>

        <Stagger>
          <SelectField
            label="Tipo de estabelecimento"
            value={form.tipo}
            options={BUSINESS_TYPE_OPTIONS}
            onChange={(value) => {
              update("tipo", value as BusinessType | "");
              setTouched((t) => ({ ...t, tipo: true }));
              setErrors((e) => ({ ...e, tipo: validateField("tipo", value, form.docType) }));
            }}
            onBlur={() => handleBlur("tipo")}
            error={touched.tipo ? errors.tipo : null}
            success={touched.tipo && !errors.tipo && form.tipo.length > 0}
          />
        </Stagger>

        <Stagger>
          <Field
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            error={touched.email ? errors.email : null}
            success={touched.email && !errors.email && form.email.length > 0}
            autoComplete="email"
            hint="Será o seu e-mail de acesso ao musclePro."
          />
        </Stagger>

        <Stagger>
          <Field
            label="Telefone"
            value={form.telefone}
            onChange={(e) => update("telefone", maskPhoneBR(e.target.value))}
            onBlur={() => handleBlur("telefone")}
            error={touched.telefone ? errors.telefone : null}
            success={touched.telefone && !errors.telefone && form.telefone.length > 0}
            inputMode="tel"
            placeholder="(00) 00000-0000"
            autoComplete="tel"
          />
        </Stagger>
      </motion.div>

      <div className="mt-auto space-y-3 pt-10">
        <ApprovalSteps />
        <motion.button
          type="submit"
          disabled={!isFormValid || submitting}
          whileHover={isFormValid && !submitting ? { scale: 1.005 } : {}}
          whileTap={isFormValid && !submitting ? { scale: 0.99 } : {}}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn text-[14px] font-semibold transition-all duration-300",
            isFormValid && !submitting
              ? "bg-brand text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-brand-hover"
              : "cursor-not-allowed bg-ink-100 text-ink-400",
          )}
        >
          {submitting ? "Enviando..." : "Enviar cadastro para avaliação"}
        </motion.button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 w-full items-center justify-center text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
        >
          Cancelar
        </button>
      </div>
    </motion.form>
  );
}

// Deixa claro, antes de enviar, que a conta só é liberada depois da avaliação.
function ApprovalSteps() {
  const steps = [
    { title: "Avaliação do cadastro", body: "Nossa equipe confere os dados em até 48 horas úteis." },
    { title: "Confirmação por e-mail e WhatsApp", body: "Se aprovado, você recebe o link para criar sua senha." },
    { title: "14 dias de teste grátis", body: "O teste começa na aprovação. Depois, você escolhe o plano." },
  ];
  return (
    <div className="rounded-card border border-ink-200 bg-ink-50/60 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Como funciona a liberação</p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink-900">{step.title}</span>
              <span className="block text-[12.5px] leading-[1.5] text-ink-500">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stagger({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

function DocSwitcher({ value, onChange }: { value: DocType; onChange: (v: DocType) => void }) {
  return (
    <div className="mb-2 inline-flex items-center gap-1 rounded-btn bg-ink-100 p-1">
      {(["cnpj", "cpf"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "relative inline-flex h-8 items-center justify-center rounded-[5px] px-3 text-[12px] font-semibold transition-colors",
            value === opt ? "text-ink-900" : "text-ink-500 hover:text-ink-700",
          )}
        >
          {value === opt && (
            <motion.span
              layoutId="docswitcher-pill"
              className="absolute inset-0 rounded-[5px] bg-white shadow-[0_2px_8px_-2px_rgba(17,17,17,0.18)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative">
            {opt === "cnpj" ? "Cadastrar com CNPJ" : "Cadastrar com CPF"}
          </span>
        </button>
      ))}
    </div>
  );
}
