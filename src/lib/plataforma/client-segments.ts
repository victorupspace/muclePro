export const DEFAULT_CLIENT_SEGMENTS = [
  "Atacadista",
  "Varejista",
  "Indústria",
  "Serviços",
  "Logística",
  "Outros",
] as const;

export function normalizeSegmentName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function mergeSegments(...groups: Array<Array<string | undefined | null>>) {
  const seen = new Set<string>();
  const out: string[] = [];

  groups.flat().forEach((value) => {
    const segment = normalizeSegmentName(value ?? "");
    if (!segment) return;
    const key = segment.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(segment);
  });

  return out;
}
