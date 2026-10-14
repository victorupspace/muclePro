"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, Users, Wallet } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CTA } from "@/components/ui/CTA";
import { cn } from "@/lib/cn";
import { maskPhoneBR } from "@/lib/cadastro/masks";
import { fadeUp, stagger, EASE } from "@/lib/motion";
import { createHeroFormSubmission, type BusinessType } from "@/lib/supabase/leads";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const BUSINESS_TYPES: readonly { value: BusinessType; label: string }[] = [
  { value: "academia", label: "Academia de musculação" },
  { value: "estudio", label: "Estúdio (funcional, pilates, yoga)" },
  { value: "natacao", label: "Escola de natação" },
  { value: "crossfit", label: "Box de crossfit" },
  { value: "lutas", label: "Academia de lutas ou jiu-jitsu" },
  { value: "outro", label: "Outro negócio de saúde" },
];

const UNIT_RANGES = [
  { value: "1", label: "1 unidade" },
  { value: "2-5", label: "2 a 5" },
  { value: "6+", label: "6 ou mais" },
] as const;

const STUDENT_RANGES = [
  { value: "ate-100", label: "Até 100" },
  { value: "100-300", label: "100 a 300" },
  { value: "300-1000", label: "300 a 1.000" },
  { value: "1000+", label: "Mais de 1.000" },
] as const;

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!rootRef.current || !videoWrapRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(videoWrapRef.current, {
        yPercent: 12,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);

    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {});
    }

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative min-h-[100svh] w-full overflow-hidden bg-ink-900 text-white"
    >
      <div
        ref={videoWrapRef}
        className="absolute inset-0 h-full w-full will-change-transform"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/assets/images/hero-poster.jpg"
        >
          <source src="/assets/videos/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/50 to-ink-900/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_90%)]" />
      </div>

      <Container className="relative z-10 flex min-h-[100svh] max-w-[1280px] flex-col justify-center px-4 pb-20 pt-32 md:px-6 lg:px-6 lg:pb-24">
        <div className="grid gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(400px,440px)] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-20 lg:gap-y-14 xl:gap-x-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-[660px] lg:col-start-1 lg:row-start-1"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-sm"
            >
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand-light animate-pulseDot" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-light" />
              </span>
              <span className="text-overline font-semibold uppercase text-white/80">
                Gestão para negócios de atividade física
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-7 text-h1-m md:text-h1-d font-extrabold leading-[1.03] tracking-[-0.03em] text-white"
            >
              Alunos, equipe e financeiro,{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-brand-light">sob</span>{" "}
                <span className="relative z-10">controle</span>
              </span>
              .
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-body-lg text-white/70"
            >
              O musclePro é o sistema de gestão para quem opera academias,
              estúdios, escolas de natação e boxes: cadastro de alunos, planos,
              equipe com permissões e a inadimplência sempre à vista. Tudo em um
              só lugar, no lugar da planilha, do caderno e da memória.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 w-full max-w-[620px]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                O que você quer resolver primeiro
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <CTA
                  href="#alunos"
                  variant="glass"
                  size="sm"
                  icon={false}
                  leadingIcon={<Users className="h-4 w-4" strokeWidth={2.3} />}
                  className="min-w-0"
                >
                  Alunos
                </CTA>
                <CTA
                  href="#financeiro"
                  variant="glass"
                  icon={false}
                  size="sm"
                  leadingIcon={<Wallet className="h-4 w-4" strokeWidth={2.3} />}
                  className="min-w-0"
                >
                  Financeiro
                </CTA>
                <CTA
                  href="#equipe"
                  variant="glass"
                  size="sm"
                  icon={false}
                  leadingIcon={<ShieldCheck className="h-4 w-4" strokeWidth={2.3} />}
                  className="min-w-0"
                >
                  Equipe
                </CTA>
              </div>
            </motion.div>

          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid w-full max-w-[620px] grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)] items-stretch overflow-hidden rounded-lg2 bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm lg:col-start-1 lg:row-start-2"
          >
            <Metric label="Frentes de gestão" value="4" />
            <div className="my-4 w-px bg-white/[0.12]" />
            <Metric label="Lugar para toda a operação" value="1" />
            <div className="my-4 w-px bg-white/[0.12]" />
            <Metric label="Unidades na mesma conta" value="Multi" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="relative w-full max-w-[440px] justify-self-start lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end lg:justify-self-end"
          >
            <ContactForm />
          </motion.div>
        </div>
      </Container>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 md:flex"
      >
        <ScrollHint />
      </motion.div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-4">
      <div className="text-xl font-bold leading-none text-white sm:text-2xl">{value}</div>
      <div className="mt-2 text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-white/50 sm:text-[10px]">
        {label}
      </div>
    </div>
  );
}

function ContactForm() {
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [unitsRange, setUnitsRange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!businessType) {
      setSubmitError("Selecione o tipo do seu estabelecimento.");
      return;
    }

    if (!unitsRange) {
      setSubmitError("Informe quantas unidades você opera.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const value = (name: string) => String(formData.get(name) ?? "").trim();

    setSubmitting(true);
    try {
      await createHeroFormSubmission({
        fullName: value("name"),
        phone: value("phone"),
        email: value("email"),
        businessType,
        unitsRange,
        activeStudentsRange: value("activeStudents"),
      });

      form.reset();
      setBusinessType("");
      setUnitsRange("");
      setSubmitSuccess("Recebemos seus dados. Nosso time entra em contato em até 1 dia útil.");
    } catch {
      setSubmitError("Não foi possível enviar seus dados agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="contact"
      onSubmit={handleSubmit}
      className="relative rounded-panel border border-white/10 bg-ink-900/60 p-6 backdrop-blur-xl md:p-8"
    >
      <div className="absolute -inset-px rounded-panel bg-gradient-to-br from-brand-hover/50 via-transparent to-transparent opacity-60 -z-10 blur-xl" />

      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-light" />
        <span className="text-overline font-semibold uppercase text-white/70">
          Demonstração guiada
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.01em]">
        Fale com um especialista
      </h3>
      <p className="mt-2 text-sm text-white/60">
        Conte um pouco sobre o seu negócio para prepararmos a demonstração certa.
      </p>

      <div className="mt-6 space-y-3">
        <Input label="Nome completo" name="name" placeholder="Seu nome completo" required />
        <Input
          label="Telefone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          maxLength={15}
          onChange={(e) => {
            e.currentTarget.value = maskPhoneBR(e.currentTarget.value);
          }}
          required
        />
        <Input label="E-mail" name="email" type="email" placeholder="voce@suaacademia.com.br" required />
        <SelectField
          label="Tipo de estabelecimento"
          name="businessType"
          value={businessType}
          onChange={(v) => setBusinessType(v as BusinessType | "")}
          placeholder="Selecione o tipo"
          options={BUSINESS_TYPES}
          required
        />

        {businessType && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="space-y-3"
          >
            <ChipGroup
              legend="Quantas unidades você opera?"
              options={UNIT_RANGES}
              value={unitsRange}
              onChange={setUnitsRange}
            />
            <SelectField
              label="Alunos ativos"
              name="activeStudents"
              placeholder="Selecione uma faixa"
              options={STUDENT_RANGES}
              required
            />
          </motion.div>
        )}
      </div>

      <div className="mt-6">
        <CTA type="submit" size="sm" onDark disabled={submitting}>
          {submitting ? "Enviando..." : "Solicitar demonstração"}
        </CTA>
      </div>

      {(submitError || submitSuccess) && (
        <p
          className={cn(
            "mt-4 rounded-btn px-3 py-2 text-center text-[12px] font-medium",
            submitError
              ? "bg-danger-500/10 text-danger-200 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.22)]"
              : "bg-success-500/10 text-success-200 shadow-[inset_0_0_0_1px_rgba(74,222,128,0.22)]",
          )}
        >
          {submitError ?? submitSuccess}
        </p>
      )}

      <p className="mt-4 text-center text-[11px] text-white/40">
        Ao enviar, você concorda com nossa política de privacidade.
      </p>
    </form>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {label}
      </span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-btn border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-brand-light/70 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgb(var(--color-brand-hover)/0.12)] focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </label>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

function SelectField({
  label,
  name,
  value,
  onChange,
  placeholder,
  options,
  required = false,
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder: string;
  options: readonly SelectOption[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {label}
      </span>
      <select
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1.5 w-full appearance-none rounded-btn border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all focus:border-brand-light/70 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgb(var(--color-brand-hover)/0.12)] focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <option value="" className="bg-ink-900 text-white">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-ink-900 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipGroup({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {legend}
      </legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-btn px-3 py-2 text-center text-xs font-semibold transition-all",
                selected
                  ? "bg-brand text-white ring-1 ring-inset ring-white/20 shadow-[0_10px_24px_-16px_rgb(var(--color-brand-hover)/0.8)]"
                  : "bg-white/[0.04] text-white/[0.65] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ScrollHint() {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
        Role para explorar
      </span>
      <div className="relative h-10 w-[1px] overflow-hidden bg-white/15">
        <motion.span
          className="absolute left-0 top-0 h-4 w-full bg-brand-light"
          animate={{ y: [-16, 40] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
