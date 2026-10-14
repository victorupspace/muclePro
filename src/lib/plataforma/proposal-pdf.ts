import { jsPDF } from "jspdf";
import { MARK_STROKES, MARK_STROKE_WIDTH, MARK_VIEWBOX, markPathToPdfOps, type MarkTone } from "@/lib/brand/mark";
import {
  formatCurrencyDetailed,
  formatDateLong,
  formatDocument,
  formatNumber,
} from "./format";
import type { Client, ClientProfile, ConsultorProfile, Simulation } from "./types";

type PdfInput = {
  simulation: Simulation;
  client: Client;
  profile?: ClientProfile | null;
  consultant?: ConsultorProfile | null;
};

type RGB = [number, number, number];

const PAGE = { width: 595.28, height: 841.89 };
const M = 48;
const CONTENT = PAGE.width - M * 2;
const FOOTER_Y = PAGE.height - 38;

const COLOR = {
  // Espelha os tokens de tailwind.config.ts (jsPDF não lê CSS variables).
  ink900: [31, 31, 31] as RGB,
  ink800: [35, 35, 35] as RGB,
  ink700: [56, 58, 69] as RGB,
  ink600: [74, 77, 89] as RGB,
  ink500: [95, 98, 112] as RGB,
  ink400: [154, 154, 163] as RGB,
  ink300: [211, 213, 222] as RGB,
  ink200: [231, 232, 238] as RGB,
  ink100: [238, 240, 244] as RGB,
  ink50: [245, 246, 248] as RGB,
  surface: [245, 246, 248] as RGB,
  brand: [1, 33, 92] as RGB, // brand/navy-deep
  brandHover: [0, 47, 140] as RGB, // brand/navy
  brandSoft: [232, 237, 247] as RGB,
  brandBorder: [179, 192, 217] as RGB,
  brandOnDark: [141, 168, 224] as RGB, // brand-light: marca sobre fundo escuro
  green: [0, 120, 74] as RGB,
  greenSoft: [230, 247, 239] as RGB,
  amber: [143, 91, 0] as RGB,
  amberSoft: [255, 246, 229] as RGB,
  white: [255, 255, 255] as RGB,
};

const RADIUS = { xs: 4, btn: 6, card: 8, panel: 12 };
const FALLBACK = "Não informado";

export function createSimulationProposalPdf({ simulation, client, profile, consultant }: PdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const data = simulation.simulationData;
  const results = simulation.resultsData;
  const primaryUnit = profile?.units[0];

  const consumerUnit = data.client.consumerUnit || primaryUnit?.ucCode || FALLBACK;
  const distributor =
    data.client.distributor || client.distributor || primaryUnit?.distribuidora || FALLBACK;
  const documentRaw = data.client.document || profile?.document;
  const document = documentRaw ? formatDocument(documentRaw) : FALLBACK;
  const clientName = data.client.companyName || data.client.name || client.companyName || client.name;
  const consultantName = consultant?.fullName ?? "Consultor musclePro";
  const generatedAt = new Date().toISOString();

  doc.setProperties({
    title: `Proposta musclePro - ${clientName}`,
    subject: "Proposta de Economia no Mercado Livre de Energia",
    author: "musclePro",
    creator: "musclePro Plataforma",
  });

  // 1 — Cover
  drawCover(doc, {
    clientName,
    document,
    consumerUnit,
    consultantName,
    createdAt: simulation.createdAt,
  });

  // 2 — Resumo Executivo
  doc.addPage();
  drawHeader(doc, "Resumo Executivo");
  drawExecutiveSummary(doc, simulation, distributor);

  // 3 — Dados do Cliente e da Simulação
  doc.addPage();
  drawHeader(doc, "Dados do Cliente e Simulação");
  drawClientAndTechnical(doc, simulation, client, profile, distributor, consumerUnit, document);

  // 4 — Comparativo de Cenários
  doc.addPage();
  drawHeader(doc, "Comparativo de Cenários");
  drawScenarioComparison(doc, simulation);

  // 5 — Gráficos e Composição
  doc.addPage();
  drawHeader(doc, "Gráficos e Composição");
  drawCharts(doc, simulation);

  // 6 — Premissas e Observações
  doc.addPage();
  drawHeader(doc, "Premissas e Observações");
  drawAssumptions(doc);

  // 7 — Próximos Passos
  doc.addPage();
  drawHeader(doc, "Próximos Passos");
  drawNextSteps(doc, consultantName);

  // Footers (skip cover)
  const pageCount = doc.getNumberOfPages();
  for (let page = 2; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, pageCount, generatedAt, clientName);
  }

  return doc.output("blob");
}

export function simulationPdfFileName(simulation: Simulation, client: Client) {
  const date = new Date(simulation.createdAt).toISOString().slice(0, 10);
  const name = (simulation.simulationData.client.companyName || client.companyName || client.name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLocaleLowerCase("pt-BR");
  return `proposta-musclepro-${name || "cliente"}-${date}.pdf`;
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/* ─────────────────────────  COVER  ───────────────────────── */

function drawCover(
  doc: jsPDF,
  input: {
    clientName: string;
    document: string;
    consumerUnit: string;
    consultantName: string;
    createdAt: string;
  },
) {
  const created = new Date(input.createdAt);
  const year = created.getFullYear().toString();
  const proposalRef = `PLS·${year}·${created
    .getTime()
    .toString()
    .slice(-4)
    .padStart(4, "0")}`;

  // ── Base ─────────────────────────────────────────────
  doc.setFillColor(...COLOR.ink900);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  // Bold brand band on the far left edge — anchor of the entire composition
  doc.setFillColor(...COLOR.brandOnDark);
  doc.rect(0, 0, 6, PAGE.height, "F");

  // ── Header (top strip) ───────────────────────────────
  const headerY = 92;
  brandLockup(doc, M, headerY, 0.9, "light");
  // Right-aligned confidential marker (text only, no pill)
  doc.setFillColor(...COLOR.brandOnDark);
  doc.circle(PAGE.width - M - 86, headerY - 4, 2.2, "F");
  text(doc, "Documento confidencial", PAGE.width - M, headerY - 1, 8.5, "bold", COLOR.white, {
    align: "right",
    charSpace: 0.6,
  });
  thinLine(doc, M, headerY + 22, PAGE.width - M, headerY + 22, [38, 38, 38]);

  // ── Two-column meta strip beneath header ─────────────
  const metaY = 152;
  // Left: Edition / type
  text(doc, "Edição", M, metaY, 6.6, "bold", [150, 150, 150], { charSpace: 1 });
  text(doc, `Proposta ACL · ${year}`, M, metaY + 16, 10.5, "bold", COLOR.white);
  // Right: Reference
  text(doc, "Proposta nº", PAGE.width - M, metaY, 6.6, "bold", [150, 150, 150], {
    align: "right",
    charSpace: 1,
  });
  text(doc, proposalRef, PAGE.width - M, metaY + 16, 10.5, "bold", COLOR.white, {
    align: "right",
  });

  // ── Hero (asymmetric type lockup) ────────────────────
  // Massive index numeral on the left margin acting as anchor
  text(doc, "01", M, 252, 64, "bold", [40, 40, 40], { charSpace: 0 });

  // Title — vertical stack with intentional line breaks for editorial rhythm
  const titleX = M + 124;
  const titleY = 232;
  text(doc, "Proposta", titleX, titleY, 38, "bold", COLOR.white);
  text(doc, "de Economia", titleX, titleY + 46, 38, "bold", COLOR.white);
  text(doc, "no Mercado", titleX, titleY + 92, 38, "bold", COLOR.white);
  // Last line with brand period — branding tie
  text(doc, "Livre", titleX, titleY + 138, 38, "bold", COLOR.white);
  // dot is a separate measured glyph after "Livre"
  text(doc, ".", titleX + measure(doc, "Livre", 38, "bold"), titleY + 138, 38, "bold", COLOR.brandOnDark);

  // Tagline / supporting line under the title block — italic feel with charSpace
  text(
    doc,
    "Energia precificada com clareza para clientes que decidem.",
    titleX,
    titleY + 178,
    11.5,
    "normal",
    [200, 200, 200],
    { maxWidth: CONTENT - 124 - 40, lineHeight: 16 },
  );

  // Hairline divider that splits the page in two halves
  const splitY = 480;
  thinLine(doc, M, splitY, PAGE.width - M, splitY, [55, 55, 55]);
  // Tiny brand notch at the start of the divider — single accent
  doc.setFillColor(...COLOR.brandOnDark);
  doc.rect(M, splitY - 1, 28, 2, "F");

  // ── "Para" line + client name in display size ────────
  text(doc, "Preparado para", M, splitY + 30, 7.2, "bold", [150, 150, 150], { charSpace: 1 });
  text(doc, input.clientName, M, splitY + 60, 22, "bold", COLOR.white, {
    maxWidth: CONTENT,
    lineHeight: 26,
  });

  // ── Bottom 3-column data table ───────────────────────
  const tableY = 612;
  const tableH = 138;
  // Outer rectangle (just lines — no fill)
  doc.setDrawColor(58, 58, 58);
  doc.setLineWidth(0.7);
  doc.line(M, tableY, PAGE.width - M, tableY);
  doc.line(M, tableY + tableH, PAGE.width - M, tableY + tableH);

  // 2 rows × 3 columns, line-only, monospace-style precision
  const colW = CONTENT / 3;
  const rowH = tableH / 2;
  // Vertical dividers
  for (let i = 1; i < 3; i += 1) {
    doc.setDrawColor(45, 45, 45);
    doc.setLineWidth(0.5);
    doc.line(M + colW * i, tableY + 12, M + colW * i, tableY + tableH - 12);
  }
  // Horizontal middle divider
  doc.setDrawColor(45, 45, 45);
  doc.line(M + 12, tableY + rowH, PAGE.width - M - 12, tableY + rowH);

  const cells: { label: string; value: string }[] = [
    { label: "Cliente", value: input.clientName },
    { label: "Unidade consumidora", value: input.consumerUnit },
    { label: "Data da simulação", value: formatDateLong(input.createdAt) },
    { label: "CPF / CNPJ", value: input.document },
    { label: "Consultor responsável", value: input.consultantName },
    { label: "Edição", value: `musclePro · ${year}` },
  ];

  cells.forEach((cell, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const cx = M + col * colW + 18;
    const cy = tableY + row * rowH + 26;
    text(doc, cell.label.toLocaleUpperCase("pt-BR"), cx, cy, 6.6, "bold", [140, 140, 140], {
      charSpace: 0.85,
    });
    text(doc, cell.value || "Não informado", cx, cy + 22, 11.5, "bold", COLOR.white, {
      maxWidth: colW - 36,
      lineHeight: 14,
    });
  });

  // ── Footer ───────────────────────────────────────────
  const footerY = PAGE.height - 50;
  text(doc, "musclePro · plataforma consultiva para o mercado livre de energia", M, footerY, 8, "normal", [165, 165, 165]);
  text(doc, formatDateLong(input.createdAt), PAGE.width - M, footerY, 8, "bold", COLOR.white, {
    align: "right",
  });
}

// Measure rendered width for inline lockups (e.g. brand period after "Livre")
function measure(doc: jsPDF, value: string, size: number, weight: "normal" | "bold") {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  return doc.getStringUnitWidth(value) * size + 1;
}

function coverField(doc: jsPDF, x: number, y: number, label: string, value: string, width: number) {
  text(doc, label.toLocaleUpperCase("pt-BR"), x, y, 6.8, "bold", [180, 180, 180], { charSpace: 0.7 });
  text(doc, value || FALLBACK, x, y + 24, 12.5, "bold", COLOR.white, {
    maxWidth: width,
    lineHeight: 16,
  });
}

/* ─────────────────────────  PAGE 2 — EXECUTIVE  ───────────────────────── */

function drawExecutiveSummary(doc: jsPDF, simulation: Simulation, distributor: string) {
  const data = simulation.simulationData;
  const results = simulation.resultsData;

  sectionTitle(doc, "Resumo executivo", M, 138);
  text(
    doc,
    "Visão sintética da oportunidade econômica projetada para a migração ao mercado livre de energia.",
    M,
    168,
    10,
    "normal",
    COLOR.ink500,
    { maxWidth: CONTENT - 60, lineHeight: 14 },
  );

  // HERO economy card (dark)
  const heroY = 196;
  const heroH = 174;
  doc.setFillColor(...COLOR.ink900);
  doc.roundedRect(M, heroY, CONTENT, heroH, RADIUS.panel, RADIUS.panel, "F");

  overline(doc, "Economia projetada", M + 26, heroY + 36, COLOR.brandOnDark);
  text(doc, formatCurrencyDetailed(results.monthlySavings), M + 26, heroY + 80, 30, "bold", COLOR.white);
  text(doc, "por mês na conta de energia", M + 26, heroY + 100, 9.5, "normal", [200, 200, 200]);

  // 3 mini stats inside hero
  const stripY = heroY + 122;
  thinLine(doc, M + 26, stripY, M + CONTENT - 26, stripY, COLOR.ink700);
  const statW = (CONTENT - 52) / 3;
  heroStat(doc, M + 26 + 0 * statW, stripY + 14, "Anual", formatCurrencyDetailed(results.annualSavings));
  heroStat(
    doc,
    M + 26 + 1 * statW,
    stripY + 14,
    "Redução",
    `${results.savingsPercent.toFixed(1)}%`,
    true,
  );
  heroStat(
    doc,
    M + 26 + 2 * statW,
    stripY + 14,
    "Em todo contrato",
    formatCurrencyDetailed(results.contractSavings),
  );

  // Context block
  sectionTitle(doc, "Condições da proposta", M, heroY + heroH + 50);
  const ctxY = heroY + heroH + 80;
  const items: [string, string][] = [
    ["Prazo do contrato", data.projected.contractTermMonths ? `${data.projected.contractTermMonths} meses` : FALLBACK],
    ["Tipo de contrato", data.projected.contractType ?? FALLBACK],
    ["Fonte de energia", data.projected.energySource ?? FALLBACK],
    ["Comercializadora", data.projected.commercializer ?? FALLBACK],
    ["Desconto comercial", `${data.projected.discountPercent.toFixed(1)}%`],
    ["Distribuidora atual", distributor],
  ];
  drawKeyValueGrid(doc, M, ctxY, CONTENT, items, 3);
}

function heroStat(doc: jsPDF, x: number, y: number, label: string, value: string, accent = false) {
  text(doc, label.toLocaleUpperCase("pt-BR"), x, y, 6.6, "bold", COLOR.ink400, { charSpace: 0.6 });
  text(doc, value, x, y + 22, 14, "bold", accent ? COLOR.brandOnDark : COLOR.white);
}

/* ─────────────────────────  PAGE 3 — CLIENT & TECHNICAL  ───────────────────────── */

function drawClientAndTechnical(
  doc: jsPDF,
  simulation: Simulation,
  client: Client,
  profile: ClientProfile | null | undefined,
  distributor: string,
  consumerUnit: string,
  document: string,
) {
  const data = simulation.simulationData;
  const technical = data.technical ?? {};
  const primaryUnit = profile?.units[0];
  const tensao = technical.tensao ?? primaryUnit?.tensao ?? FALLBACK;
  const submercado = technical.submercado ?? primaryUnit?.submercado ?? FALLBACK;

  // Cliente
  sectionTitle(doc, "Dados do cliente", M, 138);
  const clientItems: [string, string][] = [
    ["Nome / Razão social", data.client.companyName || data.client.name || client.name],
    ["CPF / CNPJ", document],
    ["Email", data.client.email || client.email || FALLBACK],
    ["Telefone", data.client.phone || client.phone || FALLBACK],
    ["Endereço", data.client.address || FALLBACK],
    ["Localização", joinNonEmpty([data.client.locationCity || client.locationCity, data.client.locationState || client.locationState]) || FALLBACK],
  ];
  drawKeyValueGrid(doc, M, 168, CONTENT, clientItems, 2);

  // Card dados elétricos
  const techTitleY = 360;
  sectionTitle(doc, "Dados técnicos da unidade", M, techTitleY);
  const techItems: [string, string][] = [
    ["Distribuidora", distributor],
    ["Unidade consumidora", consumerUnit],
    ["Modalidade tarifária", data.current.tariffModality ?? FALLBACK],
    ["Nível de tensão", tensao],
    ["Submercado", submercado],
    [
      "Demanda contratada",
      data.current.contractedDemandKw ? `${formatNumber(data.current.contractedDemandKw)} kW` : FALLBACK,
    ],
    [
      "Consumo médio",
      data.current.averageConsumptionKwh
        ? `${formatNumber(data.current.averageConsumptionKwh)} kWh/mês`
        : FALLBACK,
    ],
    ["Tarifa média atual", `${formatCurrencyDetailed(data.current.averageTariffMwh)} / MWh`],
  ];
  drawKeyValueGrid(doc, M, techTitleY + 30, CONTENT, techItems, 2);

  // Note
  const noteY = 700;
  noteBlock(
    doc,
    M,
    noteY,
    "Os dados acima são utilizados como base para o cálculo da proposta. Caso alguma informação esteja desatualizada, alinhe com seu consultor antes da contratação.",
  );
}

/* ─────────────────────────  PAGE 4 — SCENARIO COMPARISON  ───────────────────────── */

function drawScenarioComparison(doc: jsPDF, simulation: Simulation) {
  const data = simulation.simulationData;
  const results = simulation.resultsData;

  sectionTitle(doc, "Comparativo de cenários", M, 138);
  text(
    doc,
    "Análise lado a lado entre o cenário atual no mercado cativo e o cenário projetado no mercado livre.",
    M,
    168,
    10,
    "normal",
    COLOR.ink500,
    { maxWidth: CONTENT, lineHeight: 14 },
  );

  // Two scenario cards side by side
  const cardY = 198;
  const cardH = 240;
  const cardW = (CONTENT - 16) / 2;

  scenarioCard(doc, M, cardY, cardW, cardH, {
    label: "Cenário atual",
    title: "Mercado Cativo",
    monthly: data.current.monthlyCost,
    annual: data.current.annualCost,
    tariff: data.current.averageTariffMwh,
    accent: false,
    items: [
      ["Modalidade tarifária", data.current.tariffModality ?? FALLBACK],
      [
        "Consumo médio",
        data.current.averageConsumptionKwh
          ? `${formatNumber(data.current.averageConsumptionKwh)} kWh/mês`
          : FALLBACK,
      ],
    ],
  });

  scenarioCard(doc, M + cardW + 16, cardY, cardW, cardH, {
    label: "Cenário projetado",
    title: "Mercado Livre",
    monthly: data.projected.monthlyCost,
    annual: data.projected.annualCost,
    tariff: data.projected.estimatedTariffMwh,
    accent: true,
    items: [
      ["Tipo de contrato", data.projected.contractType ?? FALLBACK],
      ["Fonte de energia", data.projected.energySource ?? FALLBACK],
    ],
  });

  // Difference table
  sectionTitle(doc, "Diferenças", M, cardY + cardH + 36);
  comparisonTable(
    doc,
    M,
    cardY + cardH + 66,
    [
      ["Custo mensal", formatCurrencyDetailed(data.current.monthlyCost), formatCurrencyDetailed(data.projected.monthlyCost), formatCurrencyDetailed(results.monthlySavings)],
      ["Custo anual", formatCurrencyDetailed(data.current.annualCost), formatCurrencyDetailed(data.projected.annualCost), formatCurrencyDetailed(results.annualSavings)],
      ["Tarifa média", `${formatCurrencyDetailed(data.current.averageTariffMwh)}/MWh`, `${formatCurrencyDetailed(data.projected.estimatedTariffMwh)}/MWh`, `-${results.savingsPercent.toFixed(1)}%`],
    ],
  );
}

function scenarioCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  c: {
    label: string;
    title: string;
    monthly: number;
    annual: number;
    tariff: number;
    accent: boolean;
    items: [string, string][];
  },
) {
  doc.setFillColor(...(c.accent ? COLOR.brandSoft : COLOR.ink50));
  doc.setDrawColor(...(c.accent ? COLOR.brandBorder : COLOR.ink200));
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, RADIUS.panel, RADIUS.panel, "FD");

  overline(doc, c.label, x + 22, y + 32, c.accent ? COLOR.brand : COLOR.ink500);
  text(doc, c.title, x + 22, y + 56, 18, "bold", COLOR.ink900);

  thinLine(doc, x + 22, y + 78, x + w - 22, y + 78, c.accent ? COLOR.brandBorder : COLOR.ink200);

  // Big number
  text(doc, "Custo mensal", x + 22, y + 102, 6.8, "bold", COLOR.ink500, { charSpace: 0.65 });
  text(
    doc,
    formatCurrencyDetailed(c.monthly),
    x + 22,
    y + 130,
    20,
    "bold",
    c.accent ? COLOR.brand : COLOR.ink900,
  );

  // Sub stats
  text(doc, "Custo anual", x + 22, y + 154, 6.8, "bold", COLOR.ink500, { charSpace: 0.65 });
  text(doc, formatCurrencyDetailed(c.annual), x + 22, y + 172, 11, "bold", COLOR.ink900);

  text(doc, "Tarifa média", x + w / 2 + 6, y + 154, 6.8, "bold", COLOR.ink500, { charSpace: 0.65 });
  text(
    doc,
    `${formatCurrencyDetailed(c.tariff)}/MWh`,
    x + w / 2 + 6,
    y + 172,
    11,
    "bold",
    COLOR.ink900,
  );

  // Items
  thinLine(doc, x + 22, y + 192, x + w - 22, y + 192, c.accent ? COLOR.brandBorder : COLOR.ink200);
  c.items.forEach((item, index) => {
    const itemY = y + 210 + index * 16;
    text(doc, item[0], x + 22, itemY, 8, "normal", COLOR.ink500);
    text(doc, item[1], x + w - 22, itemY, 8, "bold", COLOR.ink900, { align: "right", maxWidth: w - 100 });
  });
}

function comparisonTable(
  doc: jsPDF,
  x: number,
  y: number,
  rows: [string, string, string, string][],
) {
  const widths = [CONTENT * 0.28, CONTENT * 0.24, CONTENT * 0.24, CONTENT * 0.24];
  const headers = ["Indicador", "Cativo", "Livre", "Economia"];

  // Header
  doc.setFillColor(...COLOR.ink900);
  doc.roundedRect(x, y, CONTENT, 32, RADIUS.btn, RADIUS.btn, "F");
  headers.forEach((header, index) => {
    text(
      doc,
      header.toLocaleUpperCase("pt-BR"),
      x + sumWidths(widths, index) + (index === 0 ? 18 : widths[index] / 2),
      y + 21,
      7,
      "bold",
      COLOR.white,
      { align: index === 0 ? "left" : "center", charSpace: 0.7 },
    );
  });

  // Rows
  rows.forEach((row, rowIndex) => {
    const rowY = y + 32 + rowIndex * 38;
    doc.setFillColor(...(rowIndex % 2 === 0 ? COLOR.white : COLOR.ink50));
    doc.setDrawColor(...COLOR.ink200);
    doc.setLineWidth(0.5);
    doc.rect(x, rowY, CONTENT, 38, "FD");
    row.forEach((cell, colIndex) => {
      const isLabel = colIndex === 0;
      const isSavings = colIndex === 3;
      text(
        doc,
        cell,
        x + sumWidths(widths, colIndex) + (isLabel ? 18 : widths[colIndex] / 2),
        rowY + 23,
        9,
        isLabel || isSavings ? "bold" : "normal",
        isSavings ? COLOR.brand : COLOR.ink900,
        { align: isLabel ? "left" : "center", maxWidth: widths[colIndex] - 20 },
      );
    });
  });
}

/* ─────────────────────────  PAGE 5 — CHARTS  ───────────────────────── */

function drawCharts(doc: jsPDF, simulation: Simulation) {
  const data = simulation.simulationData;
  const results = simulation.resultsData;

  sectionTitle(doc, "Comparativo mensal", M, 138);
  text(doc, "Diferença visual entre o custo mensal cativo e o custo projetado no mercado livre.", M, 168, 9.5, "normal", COLOR.ink500, { maxWidth: CONTENT, lineHeight: 13 });
  drawCostBars(
    doc,
    M,
    198,
    CONTENT,
    156,
    [
      { label: "Mercado Cativo", value: data.current.monthlyCost, color: COLOR.ink800 },
      { label: "Mercado Livre", value: data.projected.monthlyCost, color: COLOR.brand },
    ],
  );

  // Annual savings projection
  sectionTitle(doc, "Projeção de economia anual", M, 388);
  text(doc, "Curva acumulada da economia ao longo dos próximos 12 meses, com base na economia mensal estimada.", M, 418, 9.5, "normal", COLOR.ink500, { maxWidth: CONTENT, lineHeight: 13 });
  drawAnnualProjection(doc, M, 448, CONTENT, 154, results.monthlySavings);

  // Composition
  sectionTitle(doc, "Composição da fatura atual", M, 632);
  drawCompositionBars(doc, M, 662, CONTENT, data.current.billComponents);
}

function drawCostBars(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: { label: string; value: number; color: RGB }[],
) {
  doc.setFillColor(...COLOR.white);
  doc.setDrawColor(...COLOR.ink200);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, RADIUS.panel, RADIUS.panel, "FD");

  const max = Math.max(...rows.map((row) => row.value), 1);
  const barAreaX = x + 152;
  const barAreaW = w - 200;
  const labelX = x + 22;

  rows.forEach((row, index) => {
    const rowY = y + 44 + index * 56;
    text(doc, row.label, labelX, rowY, 10, "bold", COLOR.ink900);
    text(doc, formatCurrencyDetailed(row.value), labelX, rowY + 16, 8, "normal", COLOR.ink500);

    // Bar track
    doc.setFillColor(...COLOR.ink100);
    doc.roundedRect(barAreaX, rowY - 6, barAreaW, 14, RADIUS.xs, RADIUS.xs, "F");
    // Bar fill
    const filled = Math.max(8, barAreaW * (row.value / max));
    doc.setFillColor(...row.color);
    doc.roundedRect(barAreaX, rowY - 6, filled, 14, RADIUS.xs, RADIUS.xs, "F");
  });
}

function drawAnnualProjection(doc: jsPDF, x: number, y: number, w: number, h: number, monthlySavings: number) {
  doc.setFillColor(...COLOR.white);
  doc.setDrawColor(...COLOR.ink200);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, RADIUS.panel, RADIUS.panel, "FD");

  // Left-side label (year + accumulated savings) and bar area shifted right to make room
  const labelX = x + 22;
  const innerX = x + 200;
  const innerY = y + 28;
  const innerW = w - 220;
  const innerH = h - 64;

  const months = 12;
  const peak = monthlySavings * months;

  // Left label block
  text(doc, "ECONOMIA ACUMULADA", labelX, y + 32, 6.4, "bold", COLOR.ink500, { charSpace: 0.6 });
  text(doc, formatCurrencyDetailed(peak), labelX, y + 60, 16, "bold", COLOR.brand, {
    maxWidth: innerX - labelX - 16,
  });
  text(doc, "ao longo de 12 meses", labelX, y + 78, 8, "normal", COLOR.ink500);

  // X baseline
  doc.setDrawColor(...COLOR.ink200);
  doc.setLineWidth(0.6);
  doc.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH);

  // Bars per month
  const barW = innerW / months - 4;
  for (let i = 0; i < months; i += 1) {
    const cumulative = monthlySavings * (i + 1);
    const barH = peak > 0 ? (cumulative / peak) * innerH : 0;
    const barX = innerX + i * (innerW / months);
    const barY = innerY + innerH - barH;
    doc.setFillColor(...(i === months - 1 ? COLOR.brand : COLOR.ink300));
    doc.roundedRect(barX, barY, barW, barH, RADIUS.xs, RADIUS.xs, "F");
    if (i % 3 === 0 || i === months - 1) {
      text(
        doc,
        `${i + 1}º`,
        barX + barW / 2,
        innerY + innerH + 14,
        6.5,
        "normal",
        COLOR.ink500,
        { align: "center" },
      );
    }
  }
}

function drawCompositionBars(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  components: { label: string; amount: number; percent: number }[],
) {
  if (!components || components.length === 0) {
    text(doc, "Composição não disponível para esta simulação.", x, y + 30, 10, "normal", COLOR.ink500);
    return;
  }
  const palette = [COLOR.brand, COLOR.brandOnDark, COLOR.ink300] as const;

  // Stacked bar
  let cursor = x;
  components.forEach((component, index) => {
    const segW = Math.max(16, w * (component.percent / 100));
    doc.setFillColor(...palette[index % palette.length]);
    if (index === 0) {
      doc.roundedRect(cursor, y, segW, 18, RADIUS.xs, RADIUS.xs, "F");
    } else if (index === components.length - 1) {
      doc.rect(cursor, y, segW, 18, "F");
    } else {
      doc.rect(cursor, y, segW, 18, "F");
    }
    cursor += segW;
  });

  // Legend
  const legendY = y + 36;
  const colW = w / components.length;
  components.forEach((component, index) => {
    const itemX = x + index * colW;
    doc.setFillColor(...palette[index % palette.length]);
    doc.rect(itemX, legendY + 4, 8, 8, "F");
    text(doc, component.label, itemX + 14, legendY + 11, 8.5, "bold", COLOR.ink900, {
      maxWidth: colW - 22,
    });
    text(
      doc,
      `${formatCurrencyDetailed(component.amount)} · ${component.percent.toFixed(0)}%`,
      itemX + 14,
      legendY + 26,
      7.5,
      "normal",
      COLOR.ink500,
      { maxWidth: colW - 22 },
    );
  });
}

/* ─────────────────────────  PAGE 6 — ASSUMPTIONS  ───────────────────────── */

function drawAssumptions(doc: jsPDF) {
  sectionTitle(doc, "Premissas e observações", M, 138);
  text(
    doc,
    "Considerações comerciais e regulatórias importantes para a leitura desta proposta.",
    M,
    168,
    10,
    "normal",
    COLOR.ink500,
    { maxWidth: CONTENT, lineHeight: 14 },
  );

  const items = [
    {
      title: "TUSD permanece com a distribuidora",
      body: "O custo da Tarifa de Uso do Sistema de Distribuição continua sendo pago à distribuidora local, conforme regras vigentes da ANEEL.",
    },
    {
      title: "Bandeiras tarifárias",
      body: "As bandeiras tarifárias deixam de incidir sobre a parcela de energia contratada no mercado livre.",
    },
    {
      title: "Estimativas com base nos dados informados",
      body: "Os valores apresentados são projeções calculadas a partir do consumo, da demanda e das condições comerciais informadas. Variações reais podem ocorrer.",
    },
    {
      title: "Validações posteriores",
      body: "A proposta está sujeita à validação comercial, técnica, documental e regulatória antes da contratação.",
    },
    {
      title: "Prazos de migração",
      body: "Os prazos podem variar conforme a distribuidora, a documentação apresentada e as etapas técnicas envolvidas.",
    },
    {
      title: "Condições da comercializadora",
      body: "Os termos finais — preço, prazo e fonte de energia — podem ser ajustados em conjunto com a comercializadora parceira responsável pelo fornecimento.",
    },
  ];

  let y = 198;
  items.forEach((item, index) => {
    drawAssumptionItem(doc, M, y, CONTENT, item.title, item.body, index + 1);
    y += 76;
  });
}

function drawAssumptionItem(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  body: string,
  index: number,
) {
  doc.setFillColor(...COLOR.white);
  doc.setDrawColor(...COLOR.ink200);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, 64, RADIUS.card, RADIUS.card, "FD");

  // Accent square with index
  doc.setFillColor(...COLOR.brandSoft);
  doc.roundedRect(x + 14, y + 14, 36, 36, RADIUS.btn, RADIUS.btn, "F");
  text(
    doc,
    String(index).padStart(2, "0"),
    x + 32,
    y + 38,
    14,
    "bold",
    COLOR.brand,
    { align: "center" },
  );

  text(doc, title, x + 64, y + 26, 11, "bold", COLOR.ink900, { maxWidth: w - 84 });
  text(doc, body, x + 64, y + 44, 8.5, "normal", COLOR.ink600, {
    maxWidth: w - 84,
    lineHeight: 12,
  });
}

/* ─────────────────────────  PAGE 7 — NEXT STEPS  ───────────────────────── */

function drawNextSteps(doc: jsPDF, consultantName: string) {
  sectionTitle(doc, "Próximos passos", M, 138);
  text(
    doc,
    "Caminho recomendado para avançar com segurança até a entrada no mercado livre.",
    M,
    168,
    10,
    "normal",
    COLOR.ink500,
    { maxWidth: CONTENT, lineHeight: 14 },
  );

  const steps = [
    { title: "Validação dos dados do cliente", body: "Conferência dos dados cadastrais, da fatura e da unidade consumidora." },
    { title: "Aprovação da proposta", body: "Revisão das condições comerciais e alinhamento de expectativas." },
    { title: "Assinatura contratual", body: "Formalização dos instrumentos jurídicos com a comercializadora parceira." },
    { title: "Denúncia à distribuidora", body: "Comunicação formal à distribuidora local, respeitando os prazos regulatórios." },
    { title: "Etapas de migração", body: "Coordenação técnica das etapas operacionais até a habilitação no mercado livre." },
    { title: "Início da economia no Mercado Livre", body: "Operação ativa no ACL com acompanhamento contínuo do musclePro." },
  ];

  let y = 200;
  steps.forEach((step, index) => {
    drawStepItem(doc, M, y, CONTENT, index + 1, step.title, step.body, index === steps.length - 1);
    y += 60;
  });

  // Final CTA card
  const ctaY = y + 16;
  doc.setFillColor(...COLOR.ink900);
  doc.roundedRect(M, ctaY, CONTENT, 84, RADIUS.panel, RADIUS.panel, "F");
  overline(doc, "Próximo passo", M + 24, ctaY + 30, COLOR.brandOnDark);
  text(
    doc,
    "Valide esta proposta com o consultor responsável.",
    M + 24,
    ctaY + 56,
    14,
    "bold",
    COLOR.white,
    { maxWidth: CONTENT - 220 },
  );
  text(
    doc,
    consultantName,
    PAGE.width - M - 24,
    ctaY + 38,
    7,
    "bold",
    COLOR.ink400,
    { align: "right", charSpace: 0.6 },
  );
  text(doc, "musclePro · plataforma consultiva", PAGE.width - M - 24, ctaY + 56, 9, "normal", [220, 220, 220], { align: "right" });
}

function drawStepItem(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  index: number,
  title: string,
  body: string,
  last: boolean,
) {
  // Connector dot
  doc.setFillColor(...(index === 1 ? COLOR.brand : COLOR.ink900));
  doc.circle(x + 12, y + 14, 5, "F");
  if (!last) {
    doc.setDrawColor(...COLOR.ink200);
    doc.setLineWidth(0.8);
    doc.line(x + 12, y + 22, x + 12, y + 56);
  }

  text(
    doc,
    String(index).padStart(2, "0"),
    x + 30,
    y + 17,
    7.4,
    "bold",
    COLOR.brand,
    { charSpace: 0.5 },
  );
  text(doc, title, x + 60, y + 17, 11, "bold", COLOR.ink900, { maxWidth: w - 80 });
  text(doc, body, x + 60, y + 34, 9, "normal", COLOR.ink600, { maxWidth: w - 80, lineHeight: 12.5 });
}

/* ─────────────────────────  SHARED PRIMITIVES  ───────────────────────── */

function drawHeader(doc: jsPDF, label: string) {
  doc.setFillColor(...COLOR.white);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  // Left accent
  doc.setFillColor(...COLOR.brand);
  doc.rect(0, 0, 3, PAGE.height, "F");

  brandLockup(doc, M, 60, 0.55, "dark");
  text(doc, label.toLocaleUpperCase("pt-BR"), PAGE.width - M, 58, 7.2, "bold", COLOR.ink500, {
    align: "right",
    charSpace: 0.7,
  });
  thinLine(doc, M, 78, PAGE.width - M, 78, COLOR.ink200);
}

function drawFooter(
  doc: jsPDF,
  page: number,
  total: number,
  generatedAt: string,
  clientName: string,
) {
  thinLine(doc, M, FOOTER_Y - 16, PAGE.width - M, FOOTER_Y - 16, COLOR.ink200);
  text(doc, `musclePro · proposta para ${clientName}`, M, FOOTER_Y, 7, "normal", COLOR.ink500, {
    maxWidth: 280,
  });
  text(
    doc,
    `Gerado em ${formatDateLong(generatedAt)}`,
    PAGE.width / 2,
    FOOTER_Y,
    7,
    "normal",
    COLOR.ink500,
    { align: "center" },
  );
  text(
    doc,
    `Página ${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    PAGE.width - M,
    FOOTER_Y,
    7,
    "bold",
    COLOR.ink700,
    { align: "right" },
  );
}

function brandLockup(doc: jsPDF, x: number, y: number, scale = 1, mode: "dark" | "light" = "dark") {
  const inkColor = mode === "dark" ? COLOR.ink900 : COLOR.white;
  // Símbolo com 30pt de largura (×scale), centrado na altura das maiúsculas.
  fistMark(doc, x, y - 18.4 * scale, scale, mode);
  text(doc, "musclePro", x + 37 * scale, y, 18 * scale, "bold", inkColor);
  const wordWidth = doc.getTextWidth("musclePro");
  text(doc, ".", x + 37 * scale + wordWidth, y, 18 * scale, "bold", mode === "dark" ? COLOR.brand : COLOR.brandOnDark);
}

// Símbolo da marca (src/lib/brand/mark.ts) desenhado com paths do jsPDF.
// "dark" = símbolo escuro sobre fundo claro; "light" = sobre a capa escura.
function fistMark(doc: jsPDF, x: number, y: number, scale = 1, mode: "dark" | "light" = "dark") {
  const s = (30 / MARK_VIEWBOX.width) * scale;
  const onLight = mode === "dark";
  const background = onLight ? COLOR.white : COLOR.ink900;
  const tones: Record<MarkTone, RGB> = onLight
    ? { primary: COLOR.brand, secondary: COLOR.brandHover, soft: COLOR.brandOnDark }
    : { primary: COLOR.white, secondary: COLOR.brandOnDark, soft: COLOR.brandOnDark };

  doc.setLineWidth(MARK_STROKE_WIDTH * s);
  doc.setLineCap("round");
  doc.setLineJoin("round");
  for (const stroke of MARK_STROKES) {
    // jsPDF não tem opacidade por traço sem GState; mistura com o fundo.
    doc.setDrawColor(...mixRgb(tones[stroke.tone], background, stroke.opacity ?? 1));
    doc.path(markPathToPdfOps(stroke.d, x, y, s));
    doc.stroke();
  }
  doc.setLineCap("butt");
  doc.setLineJoin("miter");
}

function mixRgb(color: RGB, background: RGB, alpha: number): RGB {
  return color.map((c, i) => Math.round(c * alpha + background[i] * (1 - alpha))) as RGB;
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  text(doc, title, x, y, 18, "bold", COLOR.ink900);
  doc.setFillColor(...COLOR.brand);
  doc.rect(x, y + 8, 32, 2, "F");
}

function drawKeyValueGrid(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  rows: [string, string][],
  columns: 2 | 3,
) {
  const colW = width / columns;
  const rowH = 56;
  rows.forEach(([label, value], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const itemX = x + col * colW;
    const itemY = y + row * rowH;

    text(doc, label.toLocaleUpperCase("pt-BR"), itemX, itemY, 6.6, "bold", COLOR.ink500, {
      charSpace: 0.7,
    });
    text(doc, value || FALLBACK, itemX, itemY + 22, 11, "bold", COLOR.ink900, {
      maxWidth: colW - 22,
      lineHeight: 14,
    });
  });
}

function noteBlock(doc: jsPDF, x: number, y: number, body: string) {
  doc.setFillColor(...COLOR.brandSoft);
  doc.setDrawColor(...COLOR.brandBorder);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, CONTENT, 50, RADIUS.card, RADIUS.card, "FD");
  doc.setFillColor(...COLOR.brand);
  doc.circle(x + 18, y + 25, 3.5, "F");
  text(doc, body, x + 34, y + 22, 9, "normal", COLOR.ink700, {
    maxWidth: CONTENT - 56,
    lineHeight: 12.5,
  });
}

function overline(doc: jsPDF, value: string, x: number, y: number, color: RGB) {
  text(doc, value.toLocaleUpperCase("pt-BR"), x, y, 7, "bold", color, { charSpace: 0.85 });
}

function thinLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color: RGB) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.line(x1, y1, x2, y2);
}

function text(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: "normal" | "bold",
  color: RGB,
  options: {
    maxWidth?: number;
    lineHeight?: number;
    align?: "left" | "right" | "center";
    charSpace?: number;
  } = {},
) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.setCharSpace(options.charSpace ?? 0);
  const lines = options.maxWidth ? doc.splitTextToSize(value, options.maxWidth) : [value];
  doc.text(lines, x, y, {
    align: options.align ?? "left",
    lineHeightFactor: options.lineHeight ? options.lineHeight / size : 1.2,
  });
  if (options.charSpace) doc.setCharSpace(0);
}

function sumWidths(values: number[], until: number) {
  return values.slice(0, until).reduce((acc, value) => acc + value, 0);
}

function joinNonEmpty(parts: (string | undefined | null)[]) {
  return parts.filter(Boolean).join(" · ");
}
