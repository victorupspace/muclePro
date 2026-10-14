"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Field } from "./Field";
import {
  isValidEmail,
  isValidName,
  isValidPhone,
  maskPhoneBR,
} from "@/lib/cadastro/masks";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import type { ComercializadoraForm } from "./types";

type FieldErrors = Partial<Record<keyof ComercializadoraForm, string | null>>;
type Touched = Partial<Record<keyof ComercializadoraForm, boolean>>;

type Props = {
  initial?: Partial<ComercializadoraForm>;
  onCancel: () => void;
  onSubmit: (data: ComercializadoraForm) => Promise<void> | void;
};

export function StepComercializadoraForm({ initial, onCancel, onSubmit }: Props) {
  const [form, setForm] = useState<ComercializadoraForm>({
    nome: initial?.nome ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
  });
  const [touched, setTouched] = useState<Touched>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof ComercializadoraForm>(key: K, value: ComercializadoraForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function validate(key: keyof ComercializadoraForm, value: string): string | null {
    if (key === "nome") {
      if (!value) return "Informe seu nome.";
      if (!isValidName(value)) return "Use apenas letras.";
    }
    if (key === "email") {
      if (!value) return "Informe seu email.";
      if (!isValidEmail(value)) return "Email inválido.";
    }
    if (key === "telefone") {
      if (!value) return "Informe seu telefone.";
      if (!isValidPhone(value)) return "Telefone incompleto.";
    }
    return null;
  }

  function handleBlur(key: keyof ComercializadoraForm) {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((e) => ({ ...e, [key]: validate(key, String(form[key] ?? "")) }));
  }

  const isValidForm =
    !validate("nome", form.nome) &&
    !validate("email", form.email) &&
    !validate("telefone", form.telefone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {
      nome: validate("nome", form.nome),
      email: validate("email", form.email),
      telefone: validate("telefone", form.telefone),
    };
    setErrors(next);
    setTouched({ nome: true, email: true, telefone: true });
    if (Object.values(next).some(Boolean)) return;
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
          Passo 02 — Comercializadora
        </p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">
          Vamos conversar.
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-500">
          O cadastro de comercializadoras é personalizado, pois envolve um processo consultivo e
          alinhado às necessidades específicas da sua operação.
        </p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-card border border-ink-200 bg-ink-50/60 px-4 py-3.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <p className="text-[12.5px] leading-[1.55] text-ink-600">
          Após o envio, um especialista do musclePro entra em contato em até <strong className="text-ink-900">1 dia útil</strong>{" "}
          para uma conversa rápida sobre sua operação.
        </p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
        }}
        className="mt-6 space-y-3"
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
          disabled={!isValidForm || submitting}
          whileHover={isValidForm && !submitting ? { scale: 1.005 } : {}}
          whileTap={isValidForm && !submitting ? { scale: 0.99 } : {}}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn text-[14px] font-semibold transition-all duration-300",
            isValidForm && !submitting
              ? "bg-brand text-white shadow-[0_18px_42px_-22px_rgb(var(--color-brand)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-brand-hover"
              : "cursor-not-allowed bg-ink-100 text-ink-400",
          )}
        >
          {submitting ? "Enviando..." : "Solicitar contato imediato"}
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
