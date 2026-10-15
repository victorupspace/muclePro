import type { Assessment, AssessmentMeasures } from "./types";

// Avaliação física: campos, IMC e evolução entre a primeira e a última medição.

export type MeasureKey = keyof AssessmentMeasures;

export const MEASURES: { key: MeasureKey; label: string; unit: "kg" | "cm"; hint?: string }[] = [
  { key: "weightKg", label: "Peso", unit: "kg" },
  { key: "heightCm", label: "Altura", unit: "cm" },
  { key: "armCm", label: "Braço", unit: "cm", hint: "Contraído, no ponto mais largo" },
  { key: "chestCm", label: "Peito", unit: "cm", hint: "Na linha dos mamilos" },
  { key: "waistCm", label: "Cintura", unit: "cm", hint: "No ponto mais estreito" },
  { key: "abdomenCm", label: "Abdome", unit: "cm", hint: "Na altura do umbigo" },
  { key: "thighCm", label: "Perna (coxa)", unit: "cm", hint: "No meio da coxa" },
];

export const BODY_MEASURES = MEASURES.filter((m) => m.key !== "weightKg" && m.key !== "heightCm");

// "72,5" → 72.5; vazio → undefined.
export function parseMeasure(value: string): number | undefined {
  const clean = value.replace(/\s/g, "").replace(",", ".");
  if (!clean) return undefined;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function formatMeasure(value: number | undefined, unit: "kg" | "cm") {
  if (value === undefined) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}

export function hasAnyMeasure(m: AssessmentMeasures) {
  return MEASURES.some((f) => m[f.key] !== undefined);
}

export function bmi(weightKg?: number, heightCm?: number) {
  if (!weightKg || !heightCm) return undefined;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiLabel(value?: number) {
  if (value === undefined) return "";
  if (value < 18.5) return "Abaixo do peso";
  if (value < 25) return "Peso adequado";
  if (value < 30) return "Sobrepeso";
  if (value < 35) return "Obesidade grau I";
  if (value < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

// Altura não costuma mudar: vale a última informada em qualquer avaliação.
export function latestHeight(list: Assessment[]) {
  return list.find((a) => a.heightCm !== undefined)?.heightCm;
}

export type Evolution = {
  key: MeasureKey;
  label: string;
  unit: "kg" | "cm";
  first?: number;
  last?: number;
  delta?: number;
};

// `list` em ordem decrescente de data (mais recente primeiro).
export function evolution(list: Assessment[]): Evolution[] {
  const chronological = [...list].reverse();
  return MEASURES.filter((m) => m.key !== "heightCm").map((m) => {
    const withValue = chronological.filter((a) => a[m.key] !== undefined);
    const first = withValue[0]?.[m.key];
    const last = withValue[withValue.length - 1]?.[m.key];
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      first,
      last,
      delta: withValue.length >= 2 && first !== undefined && last !== undefined ? last - first : undefined,
    };
  });
}

export function formatDelta(delta: number, unit: "kg" | "cm") {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}
