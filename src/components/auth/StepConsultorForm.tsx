"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Field } from "./Field";
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
import type { ConsultorForm, DocType } from "./types";

type FieldErrors = Partial<Record<keyof ConsultorForm, string | null>>;
type Touched = Partial<Record<keyof ConsultorForm, boolean>>;

type Props = {
  initial?: Partial<ConsultorForm>;
  onCancel: () => void;
  onSubmit: (data: ConsultorForm) => Promise<void> | void;
};

export function StepConsultorForm({ initial, onCancel, onSubmit }: Props) {
  const [form, setForm] = useState<ConsultorForm>({
    nome: initial?.nome ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    docType: initial?.docType ?? "cnpj",
    documento: initial?.documento ?? "",
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

  function update<K extends keyof ConsultorForm>(key: K, value: ConsultorForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function validateField(key: keyof ConsultorForm, value: string, docType: DocType): string | null {
    switch (key) {
      case "nome":
        if (!value) return "Informe seu nome.";
        if (!isValidName(value)) return "Use apenas letras.";
        return null;
      case "email":
        if (!value) return "Informe seu email.";
        if (!isValidEmail(value)) return "Email inválido.";
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

  function handleBlur(key: keyof ConsultorForm) {
    setTouched((t) => ({ ...t, [key]: true }));
    const value = String(form[key] ?? "");
    setErrors((e) => ({ ...e, [key]: validateField(key, value, form.docType) }));
  }

  // Auto-fetch CNPJ
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
        setForm((s) => ({
          ...s,
          razaoSocial: data.razaoSocial,
          endereco: data.endereco ?? undefined,
          email: s.email || (data.email ?? ""),
        }));
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
    setForm((s) => ({ ...s, docType: next, documento: "", razaoSocial: undefined, endereco: undefined }));
    setErrors((e) => ({ ...e, documento: null }));
    setTouched((t) => ({ ...t, documento: false }));
    setCnpjFetched(false);
    setCnpjError(null);
  }

  const isFormValid =
    !validateField("nome", form.nome, form.docType) &&
    !validateField("email", form.email, form.docType) &&
    !validateField("telefone", form.telefone, form.docType) &&
    !validateField("documento", form.documento, form.docType) &&
    (form.docType === "cpf" || cnpjFetched);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allKeys: (keyof ConsultorForm)[] = ["nome", "email", "telefone", "documento"];
    const next: FieldErrors = {};
    allKeys.forEach((k) => {
      next[k] = validateField(k, String(form[k] ?? ""), form.docType);
    });
    setErrors(next);
    setTouched({ nome: true, email: true, telefone: true, documento: true });
    if (Object.values(next).some(Boolean)) return;
    if (form.docType === "cnpj" && !cnpjFetched) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
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
          Passo 02 — Consultor
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
          Crie sua conta de consultor.
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
          Preencha os dados abaixo. Se preferir, informe o CNPJ e nós completamos automaticamente.
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
            label="Nome completo"
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
            label={form.docType === "cnpj" ? "CNPJ" : "CPF"}
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
            label="Email corporativo"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            error={touched.email ? errors.email : null}
            success={touched.email && !errors.email && form.email.length > 0}
            autoComplete="email"
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
          {submitting ? "Enviando..." : "Realizar cadastro"}
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
