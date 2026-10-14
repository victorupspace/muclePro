"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import {
  formatCurrency,
  formatCurrencyDetailed,
  formatDateLong,
  formatNumber,
} from "@/lib/plataforma/format";
import {
  blobToDataUrl,
  createSimulationProposalPdf,
  simulationPdfFileName,
} from "@/lib/plataforma/proposal-pdf";
import { useConsultorSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Simulation } from "@/lib/plataforma/types";

const FALLBACK = "Não informado";

export default function SimulationResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile: consultant } = useConsultorSession();
  const {
    simulations,
    clients,
    getClientProfile,
    updateSimulation,
    loading,
  } = usePlataformaStore();

  const id = params?.id ?? "";
  const simulation = simulations.find((s) => s.id === id) ?? null;
  const client = simulation ? clients.find((c) => c.id === simulation.clientId) ?? null : null;
  const profile = simulation ? getClientProfile(simulation.clientId) : null;

  const [pdfState, setPdfState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);

  if (loading && !simulation) {
    return (
      <div className="flex items-center justify-center py-16 text-[13px] text-ink-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={2.4} />
        Calculando simulação…
      </div>
    );
  }

  if (!simulation || !client) {
    return (
      <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-ink-400" strokeWidth={2.2} />
        <h1 className="mt-3 text-[18px] font-bold text-ink-900">Simulação não encontrada</h1>
        <p className="mt-1.5 text-[13px] text-ink-500">
          Esta simulação pode ter sido removida ou não pertence à sua conta.
        </p>
        <Link
          href="/plataforma/simulador"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-btn bg-ink-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800"
        >
          Voltar ao simulador
        </Link>
      </div>
    );
  }

  const data = simulation.simulationData;
  const results = simulation.resultsData;
  const monthlyDiff = data.current.monthlyCost - data.projected.monthlyCost;
  const annualDiff = data.current.annualCost - data.projected.annualCost;

  async function handleGeneratePdf() {
    if (!simulation || !client) return;
    setPdfState("loading");
    try {
      const blob = createSimulationProposalPdf({ simulation, client, profile, consultant });
      const dataUrl = await blobToDataUrl(blob);
      await updateSimulation(simulation.id, { pdfUrl: dataUrl });
      downloadDataUrl(dataUrl, simulationPdfFileName(simulation, client));
      setPdfState("success");
      setToast("PDF gerado e simulação salva no cliente com sucesso.");
      window.setTimeout(() => setToast(null), 3200);
    } catch {
      setPdfState("error");
      setToast("Não foi possível gerar o PDF. Tente novamente.");
      window.setTimeout(() => setToast(null), 3200);
    }
  }

  return (
    <div className="space-y-6 md:space-y-7">
      <PageHeader
        clientName={data.client.companyName || data.client.name || client.name}
        createdAt={simulation.createdAt}
      />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className={cn(
            "flex items-start gap-2 rounded-card border px-4 py-3 text-[13px] font-medium",
            pdfState === "error"
              ? "border-danger-200 bg-danger-50 text-danger-700"
              : "border-success-200 bg-success-50 text-success-700",
          )}
        >
          {pdfState === "error" ? (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
          )}
          <span>{toast}</span>
        </motion.div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-6">
        <div className="space-y-5">
          <EconomyHero results={results} simulation={simulation} />
          <ScenarioComparison
            currentMonthly={data.current.monthlyCost}
            projectedMonthly={data.projected.monthlyCost}
            monthlyDiff={monthlyDiff}
            annualDiff={annualDiff}
            savingsPercent={results.savingsPercent}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <SummaryCard
              title="Resumo do cliente"
              icon={FileText}
              items={[
                ["Nome / Razão social", data.client.companyName || data.client.name || client.name],
                ["CPF / CNPJ", data.client.document || profile?.document || FALLBACK],
                ["Email", data.client.email || client.email || FALLBACK],
                ["Telefone", data.client.phone || client.phone || FALLBACK],
                ["Distribuidora", data.client.distributor || client.distributor || profile?.units[0]?.distribuidora || FALLBACK],
                ["Unidade consumidora", data.client.consumerUnit || profile?.units[0]?.ucCode || FALLBACK],
              ]}
            />
            <SummaryCard
              title="Resumo técnico"
              icon={Sparkles}
              items={[
                [
                  "Consumo médio",
                  data.current.averageConsumptionKwh
                    ? `${formatNumber(data.current.averageConsumptionKwh)} kWh/mês`
                    : FALLBACK,
                ],
                ["Modalidade tarifária", data.current.tariffModality ?? FALLBACK],
                ["Nível de tensão", data.technical?.tensao ?? FALLBACK],
                ["Submercado", data.technical?.submercado ?? FALLBACK],
                ["Tipo de contrato", data.projected.contractType ?? FALLBACK],
                ["Fonte de energia", data.projected.energySource ?? FALLBACK],
                [
                  "Prazo do contrato",
                  data.projected.contractTermMonths ? `${data.projected.contractTermMonths} meses` : FALLBACK,
                ],
                ["Comercializadora", data.projected.commercializer || FALLBACK],
              ]}
            />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[88px]">
          <PdfCard
            state={pdfState}
            onGenerate={handleGeneratePdf}
            hasPdf={Boolean(simulation.pdfUrl)}
          />
          <SecondaryActions
            clientId={client.id}
            simulationId={simulation.id}
            onNewSimulation={() => router.push(`/plataforma/simulador?clientId=${client.id}`)}
          />
        </aside>
      </div>
    </div>
  );
}

/* ─────────────  Page header  ───────────── */

function PageHeader({ clientName, createdAt }: { clientName: string; createdAt: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0">
        <nav className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-500">
          <Link href="/plataforma" className="transition-colors hover:text-ink-900">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-300" strokeWidth={2.4} />
          <Link href="/plataforma/simulador" className="transition-colors hover:text-ink-900">
            Simulador
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-300" strokeWidth={2.4} />
          <span className="text-ink-900">Resultado</span>
        </nav>
        <h1 className="mt-1.5 text-[22px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[26px]">
          Resultado da simulação
        </h1>
        <p className="mt-1 max-w-[640px] text-[13px] leading-[1.55] text-ink-500">
          Confira os principais indicadores antes de gerar a proposta em PDF.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          Para {clientName} · {formatDateLong(createdAt)}
        </div>
      </div>

      <div className="flex shrink-0">
        <Link
          href="/plataforma/simulador"
          className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          Voltar ao simulador
        </Link>
      </div>
    </motion.header>
  );
}

/* ─────────────  Hero economy card  ───────────── */

function EconomyHero({
  results,
  simulation,
}: {
  results: Simulation["resultsData"];
  simulation: Simulation;
}) {
  const term = simulation.simulationData.projected.contractTermMonths;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="relative overflow-hidden rounded-panel border border-ink-200 bg-ink-900 p-6 text-white md:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 90% -10%, rgb(var(--color-brand-hover)/0.32), transparent 50%), radial-gradient(circle at 10% 130%, rgb(var(--color-brand-hover)/0.08), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/60">
          Economia projetada
        </p>
        <p className="mt-2 text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-white md:text-[44px]">
          {formatCurrencyDetailed(results.monthlySavings)}
        </p>
        <p className="mt-1 text-[13px] text-white/70">por mês na conta de energia</p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 md:grid-cols-4">
          <HeroStat label="Anual" value={formatCurrencyDetailed(results.annualSavings)} />
          <HeroStat
            label="Redução"
            value={`${results.savingsPercent.toFixed(1)}%`}
            accent
            icon={<TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} />}
          />
          <HeroStat
            label={term ? `Em ${term} meses` : "Total no contrato"}
            value={formatCurrencyDetailed(results.contractSavings)}
          />
          <HeroStat
            label="Custo no ACL"
            value={formatCurrencyDetailed(results.projectedMonthlyCost)}
          />
        </div>
      </div>
    </motion.div>
  );
}

function HeroStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{label}</p>
      <p
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-[16px] font-bold md:text-[18px]",
          accent ? "text-brand-light" : "text-white",
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

/* ─────────────  Scenario comparison  ───────────── */

function ScenarioComparison({
  currentMonthly,
  projectedMonthly,
  monthlyDiff,
  annualDiff,
  savingsPercent,
}: {
  currentMonthly: number;
  projectedMonthly: number;
  monthlyDiff: number;
  annualDiff: number;
  savingsPercent: number;
}) {
  const max = Math.max(currentMonthly, projectedMonthly, 1);
  const cativoBar = (currentMonthly / max) * 100;
  const livreBar = (projectedMonthly / max) * 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
      className="rounded-panel border border-ink-200 bg-white p-5 md:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Comparativo de cenários
          </p>
          <h2 className="mt-1 text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-ink-900">
            Mercado cativo vs Mercado livre
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
          <TrendingDown className="h-3 w-3" strokeWidth={2.4} />
          {savingsPercent.toFixed(1)}%
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <ComparisonRow
          label="Mercado cativo"
          valueLabel={formatCurrencyDetailed(currentMonthly)}
          barWidth={cativoBar}
          tone="cativo"
        />
        <ComparisonRow
          label="Mercado livre"
          valueLabel={formatCurrencyDetailed(projectedMonthly)}
          barWidth={livreBar}
          tone="livre"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4">
        <Metric label="Diferença mensal" value={formatCurrencyDetailed(monthlyDiff)} highlight />
        <Metric label="Diferença anual" value={formatCurrencyDetailed(annualDiff)} highlight />
      </div>
    </motion.section>
  );
}

function ComparisonRow({
  label,
  valueLabel,
  barWidth,
  tone,
}: {
  label: string;
  valueLabel: string;
  barWidth: number;
  tone: "cativo" | "livre";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-ink-700">{label}</p>
        <p className="text-[12.5px] font-bold text-ink-900">{valueLabel}</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.4, ease: EASE }}
          className={cn(
            "h-full rounded-full",
            tone === "cativo" ? "bg-ink-300" : "bg-brand",
          )}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-[15px] font-bold",
          highlight ? "text-brand" : "text-ink-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ─────────────  Summary cards  ───────────── */

function SummaryCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: [string, string][];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="rounded-panel border border-ink-200 bg-white p-5"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <h3 className="text-[13.5px] font-bold text-ink-900">{title}</h3>
      </div>
      <dl className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-2 last:border-b-0 last:pb-0">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
              {label}
            </dt>
            <dd className="truncate text-right text-[12.5px] font-semibold text-ink-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}

/* ─────────────  PDF card  ───────────── */

function PdfCard({
  state,
  onGenerate,
  hasPdf,
}: {
  state: "idle" | "loading" | "success" | "error";
  onGenerate: () => void;
  hasPdf: boolean;
}) {
  const loading = state === "loading";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="overflow-hidden rounded-panel border border-ink-200 bg-white"
    >
      <div className="relative bg-ink-900 px-5 py-5 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 90% -10%, rgb(var(--color-brand-hover)/0.32), transparent 55%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-light/15 text-brand-light ring-1 ring-inset ring-brand-light/30">
            <FileText className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-light">
              Proposta em PDF
            </p>
            <p className="mt-1 text-[15px] font-bold leading-[1.25] tracking-[-0.01em] text-white">
              Proposta profissional pronta para envio
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-[12.5px] leading-[1.55] text-ink-600">
          Gere um PDF refinado com os dados da simulação, comparativo de economia e próximos passos
          para enviar ao cliente.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
              Gerando PDF...
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
              {hasPdf ? "Gerar e baixar novamente" : "Gerar e baixar PDF"}
            </>
          )}
        </button>
        {hasPdf && (
          <p className="text-[11px] text-ink-500">
            Já existe um PDF salvo nesta simulação. Você pode gerar uma nova versão a qualquer momento.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────  Secondary actions  ───────────── */

function SecondaryActions({
  clientId,
  onNewSimulation,
}: {
  clientId: string;
  simulationId: string;
  onNewSimulation: () => void;
}) {
  return (
    <div className="rounded-panel border border-ink-200 bg-white p-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
        Ações rápidas
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Link
          href={`/plataforma/clientes/${clientId}`}
          className="inline-flex h-10 items-center justify-between rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <span className="inline-flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
            Abrir perfil do cliente
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
        </Link>
        <button
          type="button"
          onClick={onNewSimulation}
          className="inline-flex h-10 items-center justify-between rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <span className="inline-flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5" strokeWidth={2.2} />
            Criar nova simulação
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
        </button>
        <Link
          href={`/plataforma/simulador?clientId=${clientId}`}
          className="inline-flex h-10 items-center justify-between rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <span className="inline-flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
            Editar dados da simulação
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
