"use client";

import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FileText,
  Gauge,
  Hash,
  IdCard,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Save,
  Send,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { formatCurrency, formatNumber } from "@/lib/plataforma/format";
import { DISTRIBUTOR_LOCATIONS, getDistributorsForState } from "@/lib/plataforma/distributors";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { SimulationData, SimulationResultsData } from "@/lib/plataforma/types";

type SectionId = "cliente" | "conta" | "consumo" | "acl";
type SectionState = SectionId | "";

const SUBMERCADOS = [
  { value: "SE/CO", label: "Sudeste / Centro-Oeste" },
  { value: "S", label: "Sul" },
  { value: "NE", label: "Nordeste" },
  { value: "N", label: "Norte" },
] as const;

const TENSOES = [
  { value: "BT", label: "Baixa tensão (BT)" },
  { value: "MT", label: "Média tensão (MT)" },
  { value: "AT", label: "Alta tensão (AT)" },
] as const;

const MODALIDADES = [
  { value: "azul", label: "Azul" },
  { value: "verde", label: "Verde" },
  { value: "convencional", label: "Convencional" },
] as const;

const CONTRACT_TYPES = [
  { value: "Preço fixo", label: "Preço fixo" },
  { value: "Preço com desconto garantido", label: "Desconto garantido" },
  { value: "Preço indexado", label: "Indexado" },
] as const;

const ENERGY_SOURCES = [
  { value: "Energia incentivada 50%", label: "Incentivada 50%" },
  { value: "Energia incentivada 100%", label: "Incentivada 100%" },
  { value: "Energia convencional", label: "Convencional" },
  { value: "Energia renovável certificada", label: "Renovável certificada" },
] as const;

export default function SimuladorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams?.get("clientId") ?? "";
  const { clients, addClient, updateClient, addSimulation, addClientActivity } = usePlataformaStore();

  const [openSection, setOpenSection] = useState<SectionState>("cliente");
  const [feedback, setFeedback] = useState<string | null>(null);

  const [clientId, setClientId] = useState(presetClientId);
  const [createNew, setCreateNew] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  useEffect(() => {
    if (presetClientId) {
      setClientId(presetClientId);
      setCreateNew(false);
    }
  }, [presetClientId]);

  useEffect(() => {
    if (createNew || !clientId) return;
    const selected = clients.find((client) => client.id === clientId);
    if (!selected) return;
    setLocationState(selected.locationState ?? "");
    setDistributor(selected.distributor ?? "");
  }, [clientId, clients, createNew]);

  const [locationState, setLocationState] = useState("");
  const [distributor, setDistributor] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [consumerUnit, setConsumerUnit] = useState("");
  const [tariffModality, setTariffModality] = useState<(typeof MODALIDADES)[number]["value"] | "">("");
  const [tensao, setTensao] = useState<(typeof TENSOES)[number]["value"] | "">("");
  const [submercado, setSubmercado] = useState<(typeof SUBMERCADOS)[number]["value"] | "">("");

  const [averageConsumption, setAverageConsumption] = useState<number | "">("");
  const [contractedDemand, setContractedDemand] = useState<number | "">("");
  const [averageBill, setAverageBill] = useState<number | "">("");

  const [aclPriceMwh, setAclPriceMwh] = useState<number | "">("");
  const [contractTermMonths, setContractTermMonths] = useState<number | "">("");
  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [commercializer, setCommercializer] = useState("");
  const [contractType, setContractType] = useState<(typeof CONTRACT_TYPES)[number]["value"]>("Preço fixo");
  const [energySource, setEnergySource] = useState<(typeof ENERGY_SOURCES)[number]["value"]>("Energia incentivada 50%");

  const [draftSaved, setDraftSaved] = useState(false);

  const distributorOptions = getDistributorsForState(locationState);

  const completion = useMemo(() => {
    let filled = 0;
    let total = 4;
    if (createNew ? newClientName.trim() && newClientEmail.trim() && newClientPhone.trim() : clientId) filled += 1;
    if (locationState && distributor) filled += 1;
    if (averageConsumption && contractedDemand && averageBill) filled += 1;
    if (aclPriceMwh && contractTermMonths && discountPercent && commercializer.trim()) filled += 1;
    return { filled, total };
  }, [
    createNew,
    newClientName,
    newClientEmail,
    newClientPhone,
    clientId,
    locationState,
    distributor,
    averageConsumption,
    contractedDemand,
    averageBill,
    aclPriceMwh,
    contractTermMonths,
    discountPercent,
    commercializer,
  ]);

  const result = useMemo(() => {
    const consumo = numOrZero(averageConsumption);
    const bill = numOrZero(averageBill);
    const aclMwh = numOrZero(aclPriceMwh);
    const desconto = numOrZero(discountPercent) / 100;
    const term = numOrZero(contractTermMonths);

    const cativoMwh = consumo > 0 ? bill / (consumo / 1000) : 0;
    const newBill = consumo > 0 ? (consumo / 1000) * aclMwh * (1 - desconto) : 0;
    const monthlySavings = Math.max(0, bill - newBill);
    const totalSavings = monthlySavings * term;
    const savingsPercent = bill > 0 ? (monthlySavings / bill) * 100 : 0;

    const alerts: { tone: "warn" | "info"; message: string }[] = [];
    if (consumo > 0 && consumo < 30000) {
      alerts.push({
        tone: "warn",
        message: "Consumo abaixo do limite indicado para mercado livre tradicional (30 MWh/mês).",
      });
    }
    if (term > 0 && term < 24) {
      alerts.push({
        tone: "info",
        message: "Prazos curtos (< 24 meses) costumam ter preços de energia menos competitivos.",
      });
    }
    if (savingsPercent > 35) {
      alerts.push({
        tone: "info",
        message: "Economia projetada acima de 35%. Revise o preço ACL para garantir aderência ao mercado.",
      });
    }

    return {
      cativoMwh,
      aclMwh: aclMwh * (1 - desconto),
      monthlySavings,
      totalSavings,
      savingsPercent,
      newBill,
      currentBill: bill,
      alerts,
    };
  }, [averageBill, averageConsumption, aclPriceMwh, contractTermMonths, discountPercent]);

  const canGenerate = completion.filled === completion.total && result.monthlySavings > 0;

  function handleSaveDraft() {
    setDraftSaved(true);
    setFeedback("Rascunho salvo. Você pode retomar essa simulação quando quiser.");
    setTimeout(() => {
      setDraftSaved(false);
      setFeedback(null);
    }, 2400);
  }

  function handleDiscard() {
    setClientId("");
    setCreateNew(false);
    setNewClientName("");
    setNewClientCompany("");
    setNewClientEmail("");
    setNewClientPhone("");
    setLocationState("");
    setDistributor("");
    setClientDocument("");
    setClientAddress("");
    setConsumerUnit("");
    setSubmercado("");
    setTensao("");
    setTariffModality("");
    setAverageConsumption("");
    setContractedDemand("");
    setAverageBill("");
    setAclPriceMwh("");
    setContractTermMonths("");
    setDiscountPercent("");
    setCommercializer("");
    setContractType("Preço fixo");
    setEnergySource("Energia incentivada 50%");
    setOpenSection("cliente");
  }

  async function handleGenerate() {
    if (!canGenerate) return;

    let targetClient = !createNew && clientId ? clients.find((c) => c.id === clientId) ?? null : null;

    if (createNew) {
      targetClient = await addClient({
        name: newClientName.trim(),
        email: newClientEmail.trim(),
        phone: newClientPhone.trim(),
        companyName: newClientCompany.trim() || undefined,
        locationState,
        distributor,
        status: "qualificando",
      });
    }

    if (!targetClient) {
      setFeedback("Selecione ou crie um cliente para salvar a simulação.");
      return;
    }

    const termMonths = numOrZero(contractTermMonths);
    const simulationData: SimulationData = {
      client: {
        name: targetClient.name,
        companyName: targetClient.companyName,
        document: clientDocument.trim() || undefined,
        email: targetClient.email,
        phone: targetClient.phone,
        address: clientAddress.trim() || undefined,
        consumerUnit: consumerUnit.trim() || undefined,
        distributor,
        locationState,
        locationCity: targetClient.locationCity,
      },
      current: {
        averageConsumptionKwh: numOrZero(averageConsumption),
        contractedDemandKw: numOrZero(contractedDemand),
        monthlyCost: result.currentBill,
        annualCost: result.currentBill * 12,
        averageTariffMwh: result.cativoMwh,
        tariffModality: tariffModality || undefined,
        billComponents: buildBillComponents(result.currentBill),
      },
      projected: {
        monthlyCost: result.newBill,
        annualCost: result.newBill * 12,
        commercializer: commercializer.trim(),
        contractType,
        energySource,
        discountPercent: numOrZero(discountPercent),
        estimatedTariffMwh: result.aclMwh,
        contractTermMonths: termMonths,
      },
      technical: {
        submercado: submercado || undefined,
        tensao: tensao || undefined,
      },
    };

    const resultsData: SimulationResultsData = {
      monthlySavings: result.monthlySavings,
      annualSavings: result.monthlySavings * 12,
      contractSavings: result.totalSavings,
      savingsPercent: result.savingsPercent,
      currentMonthlyCost: result.currentBill,
      projectedMonthlyCost: result.newBill,
    };

    const saved = await addSimulation({
      clientId: targetClient.id,
      simulationData,
      resultsData,
      status: "rascunho",
    });

    if (!saved) {
      setFeedback("Não foi possível salvar a simulação. Tente novamente.");
      return;
    }

    await updateClient(targetClient.id, {
      locationState,
      distributor,
      monthlySavings: result.monthlySavings,
      status: targetClient.status === "novo" ? "qualificando" : targetClient.status,
    });

    addClientActivity(targetClient.id, {
      kind: "simulacao",
      title: `Nova simulação registrada · ${formatCurrency(result.monthlySavings)}/mês`,
      body: [
        `Conta atual: ${formatCurrency(result.currentBill)}`,
        `Conta no ACL: ${formatCurrency(result.newBill)}`,
        `Economia mensal: ${formatCurrency(result.monthlySavings)} (${result.savingsPercent.toFixed(1)}%)`,
        termMonths ? `Total no contrato (${termMonths} meses): ${formatCurrency(result.totalSavings)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    setFeedback(`Simulação salva. Abrindo o resultado...`);

    setTimeout(() => {
      router.push(`/plataforma/simulador/resultado/${saved.id}`);
    }, 700);
  }

  return (
    <div className="space-y-6 md:space-y-7">
      <PageHeader
        completion={completion}
        draftSaved={draftSaved}
        canGenerate={canGenerate}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscard}
        onGenerate={handleGenerate}
      />

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="rounded-card border border-brand/30 bg-brand/[0.06] px-4 py-3 text-[13px] font-medium text-ink-900"
        >
          {feedback}
        </motion.div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-6">
        <div className="space-y-3">
          <Section
            id="cliente"
            open={openSection === "cliente"}
            onToggle={() => setOpenSection(openSection === "cliente" ? "" : "cliente")}
            index={1}
            icon={Building2}
            title="Identificação do cliente"
            hint="Vincule a um cliente existente ou crie um novo lead a partir desta simulação."
            done={createNew ? Boolean(newClientName.trim()) : Boolean(clientId)}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <PillToggle active={!createNew} onClick={() => setCreateNew(false)}>
                  Cliente existente
                </PillToggle>
                <PillToggle active={createNew} onClick={() => setCreateNew(true)}>
                  Criar novo cliente
                </PillToggle>
              </div>

              {!createNew && (
                <SelectField
                  label="Cliente da carteira"
                  required
                  icon={UserRound}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.companyName ? ` · ${c.companyName}` : ""}
                    </option>
                  ))}
                </SelectField>
              )}

              {createNew && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Nome do contato"
                    required
                    icon={UserRound}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Maria Souza"
                  />
                  <InputField
                    label="Email"
                    required
                    type="email"
                    icon={Mail}
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="cliente@empresa.com.br"
                  />
                  <InputField
                    label="Telefone"
                    required
                    icon={Phone}
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                  <InputField
                    label="Empresa"
                    icon={BriefcaseBusiness}
                    value={newClientCompany}
                    onChange={(e) => setNewClientCompany(e.target.value)}
                    placeholder="Souza & Cia"
                  />
                </div>
              )}
            </div>
          </Section>

          <Section
            id="conta"
            open={openSection === "conta"}
            onToggle={() => setOpenSection(openSection === "conta" ? "" : "conta")}
            index={2}
            icon={FileText}
            title="Dados da conta de energia"
            hint="Localização, distribuidora e modalidade tarifária da unidade consumidora."
            done={Boolean(locationState && distributor)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="CPF/CNPJ"
                icon={IdCard}
                value={clientDocument}
                onChange={(e) => setClientDocument(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
              <InputField
                label="Unidade consumidora"
                icon={Hash}
                value={consumerUnit}
                onChange={(e) => setConsumerUnit(e.target.value)}
                placeholder="UC 0000000"
              />
              <div className="sm:col-span-2">
                <InputField
                  label="Endereço"
                  icon={MapPin}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Rua, número, cidade/UF"
                />
              </div>
              <SelectField
                label="Estado"
                required
                icon={MapPin}
                value={locationState}
                onChange={(e) => {
                  setLocationState(e.target.value);
                  setDistributor("");
                }}
              >
                <option value="">Selecione o estado</option>
                {DISTRIBUTOR_LOCATIONS.map((l) => (
                  <option key={l.state} value={l.state}>
                    {l.label} ({l.state})
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Distribuidora"
                required
                icon={Building2}
                value={distributor}
                onChange={(e) => setDistributor(e.target.value)}
                disabled={!locationState}
              >
                <option value="">
                  {locationState ? "Selecione a distribuidora" : "Selecione o estado primeiro"}
                </option>
                {distributorOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Submercado"
                icon={MapPin}
                value={submercado}
                onChange={(e) => setSubmercado(e.target.value as (typeof SUBMERCADOS)[number]["value"] | "")}
              >
                <option value="">Selecione o submercado</option>
                {SUBMERCADOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Nível de tensão"
                icon={Zap}
                value={tensao}
                onChange={(e) => setTensao(e.target.value as (typeof TENSOES)[number]["value"] | "")}
              >
                <option value="">Selecione a tensão</option>
                {TENSOES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Modalidade tarifária"
                icon={FileText}
                value={tariffModality}
                onChange={(e) => setTariffModality(e.target.value as (typeof MODALIDADES)[number]["value"] | "")}
              >
                <option value="">Selecione a modalidade</option>
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </Section>

          <Section
            id="consumo"
            open={openSection === "consumo"}
            onToggle={() => setOpenSection(openSection === "consumo" ? "" : "consumo")}
            index={3}
            icon={Gauge}
            title="Consumo e demanda"
            hint="Médias mensais utilizadas como base para o cálculo da economia."
            done={Boolean(averageConsumption && contractedDemand && averageBill)}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label="Consumo médio"
                icon={Gauge}
                suffix="kWh/mês"
                value={averageConsumption}
                onChange={setAverageConsumption}
                placeholder="50.000"
              />
              <NumberField
                label="Demanda contratada"
                icon={Zap}
                suffix="kW"
                value={contractedDemand}
                onChange={setContractedDemand}
                placeholder="300"
              />
              <NumberField
                label="Conta média atual"
                icon={Banknote}
                prefix="R$"
                value={averageBill}
                onChange={setAverageBill}
                placeholder="45.000"
              />
            </div>
          </Section>

          <Section
            id="acl"
            open={openSection === "acl"}
            onToggle={() => setOpenSection(openSection === "acl" ? "" : "acl")}
            index={4}
            icon={Zap}
            title="Parâmetros do ACL"
            hint="Preço-base de energia, prazo do contrato e desconto comercial aplicado."
            done={Boolean(aclPriceMwh && contractTermMonths && discountPercent)}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label="Preço da energia"
                icon={BadgeDollarSign}
                prefix="R$"
                suffix="/MWh"
                value={aclPriceMwh}
                onChange={setAclPriceMwh}
                placeholder="255"
              />
              <NumberField
                label="Prazo do contrato"
                icon={CalendarRange}
                suffix="meses"
                value={contractTermMonths}
                onChange={setContractTermMonths}
                placeholder="36"
              />
              <NumberField
                label="Desconto comercial"
                icon={TrendingDown}
                suffix="%"
                value={discountPercent}
                onChange={setDiscountPercent}
                placeholder="20"
              />
              <InputField
                label="Comercializadora"
                required
                icon={Building2}
                value={commercializer}
                onChange={(e) => setCommercializer(e.target.value)}
                placeholder="Comercializadora parceira"
              />
              <SelectField
                label="Tipo de contrato"
                icon={FileText}
                value={contractType}
                onChange={(e) => setContractType(e.target.value as (typeof CONTRACT_TYPES)[number]["value"])}
              >
                {CONTRACT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Fonte de energia"
                icon={Leaf}
                value={energySource}
                onChange={(e) => setEnergySource(e.target.value as (typeof ENERGY_SOURCES)[number]["value"])}
              >
                {ENERGY_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </Section>
        </div>

        <ResultPanel result={result} canGenerate={canGenerate} onGenerate={handleGenerate} />
      </div>
    </div>
  );
}

function PageHeader({
  completion,
  draftSaved,
  canGenerate,
  onSaveDraft,
  onDiscard,
  onGenerate,
}: {
  completion: { filled: number; total: number };
  draftSaved: boolean;
  canGenerate: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onGenerate: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0">
        <nav className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-500">
          <Link href="/plataforma" className="transition-colors hover:text-ink-900">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-300" strokeWidth={2.4} />
          <span className="text-ink-900">Simulador</span>
        </nav>
        <h1 className="mt-1.5 text-[22px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[26px]">
          Nova simulação
        </h1>
        <p className="mt-1 max-w-[640px] text-[13px] leading-[1.55] text-ink-500">
          Calcule a economia no mercado livre em segundos. Os resultados são atualizados em tempo real conforme você
          preenche os dados.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          {completion.filled} de {completion.total} etapas preenchidas
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          Descartar
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-ink-200 bg-white px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2.2} />
          {draftSaved ? "Rascunho salvo" : "Salvar rascunho"}
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="inline-flex h-10 items-center gap-1.5 rounded-btn bg-brand px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
          Enviar
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>
    </motion.header>
  );
}

function Section({
  open,
  onToggle,
  index,
  icon: Icon,
  title,
  hint,
  done,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  index: number;
  icon: LucideIcon;
  title: string;
  hint: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-ink-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-50/60 sm:px-5"
      >
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
            done ? "bg-brand text-white" : "bg-ink-100 text-ink-600",
          )}
        >
          {done ? <Icon className="h-3.5 w-3.5" strokeWidth={2.4} /> : `0${index}`}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink-900">{title}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-500">{hint}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-400 transition-transform",
            open && "rotate-180 text-ink-700",
          )}
          strokeWidth={2.2}
        />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="border-t border-ink-200 px-4 py-4 sm:px-5 sm:py-5"
        >
          {children}
        </motion.div>
      )}
    </section>
  );
}

function ResultPanel({
  result,
  canGenerate,
  onGenerate,
}: {
  result: {
    cativoMwh: number;
    aclMwh: number;
    monthlySavings: number;
    totalSavings: number;
    savingsPercent: number;
    newBill: number;
    currentBill: number;
    alerts: { tone: "warn" | "info"; message: string }[];
  };
  canGenerate: boolean;
  onGenerate: () => void;
}) {
  const cativoBar = result.cativoMwh > 0 ? 100 : 0;
  const livreBar =
    result.cativoMwh > 0 ? Math.max(8, Math.min(100, (result.aclMwh / result.cativoMwh) * 100)) : 0;

  return (
    <aside className="lg:sticky lg:top-[88px]">
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="overflow-hidden rounded-panel border border-ink-200 bg-white"
        >
          <div className="relative bg-ink-900 px-5 py-5 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 90% -10%, rgb(var(--color-brand-hover)/0.32), transparent 50%), radial-gradient(circle at 10% 130%, rgb(var(--color-brand-hover)/0.08), transparent 55%)",
              }}
            />
            <div className="relative">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60">
                Economia projetada
              </p>
              <p className="mt-1.5 text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-white md:text-[32px]">
                {formatCurrency(result.monthlySavings)}
              </p>
              <p className="mt-1 text-[12px] text-white/70">por mês na conta de energia</p>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">No contrato</p>
                  <p className="mt-1 text-[16px] font-bold text-white">{formatCurrency(result.totalSavings)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Redução</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[16px] font-bold text-brand-light">
                    <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {result.savingsPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="rounded-panel border border-ink-200 bg-white p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Cativo vs Mercado livre
          </p>
          <div className="mt-3 space-y-3">
            <ComparisonRow
              label="Mercado cativo"
              valueLabel={result.cativoMwh > 0 ? `R$ ${formatNumber(Math.round(result.cativoMwh))} / MWh` : "—"}
              barWidth={cativoBar}
              tone="cativo"
            />
            <ComparisonRow
              label="Mercado livre (ACL)"
              valueLabel={result.aclMwh > 0 ? `R$ ${formatNumber(Math.round(result.aclMwh))} / MWh` : "—"}
              barWidth={livreBar}
              tone="livre"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
            <Detail label="Conta atual" value={formatCurrency(result.currentBill)} />
            <Detail label="Conta no ACL" value={formatCurrency(result.newBill)} highlight />
          </div>
        </div>

        {result.alerts.length > 0 && (
          <div className="rounded-panel border border-ink-200 bg-white p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Alertas</p>
            <ul className="mt-2.5 space-y-2">
              {result.alerts.map((a, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-card border px-3 py-2.5 text-[12px] leading-[1.5]",
                    a.tone === "warn"
                      ? "border-warning-200 bg-warning-50 text-warning-800"
                      : "border-ink-200 bg-ink-50/60 text-ink-700",
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      a.tone === "warn" ? "text-warning-600" : "text-ink-500",
                    )}
                    strokeWidth={2.4}
                  />
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
        >
          <Send className="h-4 w-4" strokeWidth={2.2} />
          Enviar
        </button>
      </div>
    </aside>
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
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.35, ease: EASE }}
          className={cn("h-full rounded-full", tone === "cativo" ? "bg-ink-700" : "bg-brand")}
        />
      </div>
    </div>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-[14px] font-bold",
          highlight ? "inline-flex items-center gap-1 text-brand" : "text-ink-900",
        )}
      >
        {highlight && <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />}
        {value}
      </p>
    </div>
  );
}

function PillToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold transition-colors",
        active
          ? "bg-ink-900 text-white"
          : "border border-ink-200 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </span>
      {children}
    </label>
  );
}

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  label: string;
  required?: boolean;
  icon: LucideIcon;
};

function InputField({ label, required, icon: Icon, className, ...props }: InputFieldProps) {
  return (
    <Field label={label} required={required}>
      <div className="group relative">
        <span className="pointer-events-none absolute left-0 top-0 flex h-11 w-10 items-center justify-center rounded-l-btn border-r border-ink-100 text-ink-400 transition-colors group-focus-within:text-brand">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <input
          {...props}
          className={cn(
            "h-11 w-full rounded-btn border border-ink-200 bg-white pl-12 pr-3 text-[13px] font-medium text-ink-900 outline-none transition-all placeholder:text-ink-400 hover:border-ink-300 focus:border-brand/70 focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
            className,
          )}
        />
      </div>
    </Field>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  required?: boolean;
  icon: LucideIcon;
  children: ReactNode;
};

function SelectField({ label, required, icon: Icon, className, children, ...props }: SelectFieldProps) {
  return (
    <Field label={label} required={required}>
      <div className="group relative">
        <span className="pointer-events-none absolute left-0 top-0 flex h-11 w-10 items-center justify-center rounded-l-btn border-r border-ink-100 text-ink-400 transition-colors group-focus-within:text-brand">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <select
          {...props}
          className={cn(
            "h-11 w-full appearance-none rounded-btn border border-ink-200 bg-white pl-12 pr-10 text-[13px] font-semibold text-ink-900 outline-none transition-all hover:border-ink-300 focus:border-brand/70 focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 transition-colors group-focus-within:text-brand"
          strokeWidth={2.2}
        />
      </div>
    </Field>
  );
}

function NumberField({
  label,
  icon: Icon,
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <div className="group flex h-11 items-center overflow-hidden rounded-btn border border-ink-200 bg-white transition-all hover:border-ink-300 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/10">
        <span className="flex h-full w-10 shrink-0 items-center justify-center border-r border-ink-100 text-ink-400 transition-colors group-focus-within:text-brand">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        {prefix && (
          <span className="shrink-0 pl-3 pr-1 text-[12px] font-bold text-ink-500">{prefix}</span>
        )}
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") onChange("");
            else {
              const n = Number(v.replace(/\./g, "").replace(",", "."));
              if (!Number.isNaN(n)) onChange(n);
            }
          }}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-[13px] font-semibold text-ink-900 outline-none placeholder:text-ink-400"
        />
        {suffix && (
          <span className="mr-2 shrink-0 rounded-[4px] bg-ink-100 px-2 py-1 text-[10.5px] font-bold text-ink-500">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

function numOrZero(v: number | "") {
  return typeof v === "number" ? v : 0;
}

function buildBillComponents(monthlyBill: number) {
  return [
    { label: "Energia e TE", percent: 48, amount: monthlyBill * 0.48 },
    { label: "TUSD/Fio", percent: 32, amount: monthlyBill * 0.32 },
    { label: "Encargos e impostos", percent: 20, amount: monthlyBill * 0.2 },
  ];
}
