// Símbolo da marca: punho fechado visto de frente ("fist bump"), em traço
// monolinear. Fonte única da geometria para o Logo, a SplashScreen, o favicon
// e o PDF — os paths usam só M/H/V/L/C/Z absolutos para que o PDF consiga
// desenhá-los sem conversor de arcos.
//
// Grade de 48 unidades. Dedos de 9 de largura (x = 8, 17, 26, 35, 44); o dedo
// médio é o nó mais alto, o mínimo o mais baixo, formando o arco natural dos
// nós dos dedos. Polegar cruzando por baixo, cantos inferiores com raio 6.

// Enquadramento justo no desenho (inclui a espessura do traço), para o
// espaçamento até o "musclePro" ser o mesmo em qualquer uso.
export const MARK_VIEWBOX = { x: 6.3, y: 12.3, width: 39.4, height: 31.4 } as const;
export const MARK_VIEWBOX_ATTR = `${MARK_VIEWBOX.x} ${MARK_VIEWBOX.y} ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`;
export const MARK_STROKE_WIDTH = 3.4;

// primary = navy-deep (branco no escuro); secondary = navy (brand-light no
// escuro); soft = brand-light nos dois.
export type MarkTone = "primary" | "secondary" | "soft";

export type MarkStroke = {
  d: string;
  tone: MarkTone;
  opacity?: number;
};

export const MARK_STROKES: readonly MarkStroke[] = [
  // Contorno: lateral esquerda, quatro nós dos dedos, lateral direita e base.
  {
    d:
      "M8 21 " +
      "C8 13.67 17 14.17 17 19.5 " +
      "C17 12.17 26 12.33 26 19 " +
      "C26 13.67 35 13.17 35 20.5 " +
      "C35 15.83 44 15.17 44 22.5 " +
      "V36 C44 39.31 41.31 42 38 42 H14 C10.69 42 8 39.31 8 36 Z",
    tone: "primary",
  },
  // Polegar cruzando os dedos.
  { d: "M8 30.75 H33 C37.33 30.75 37.33 37.25 33 37.25 H14", tone: "secondary" },
  // Separação entre os dedos.
  { d: "M17 19.5 V26 M26 19 V26 M35 20.5 V26", tone: "soft" },
];

export const MARK_TONE_VAR: Record<"onLight" | "onDark", Record<MarkTone, string>> = {
  onLight: {
    primary: "rgb(var(--color-brand))",
    secondary: "rgb(var(--color-brand-hover))",
    soft: "rgb(var(--color-brand-light))",
  },
  onDark: {
    primary: "#FFFFFF",
    secondary: "rgb(var(--color-brand-light))",
    soft: "rgb(var(--color-brand-light))",
  },
};

type PdfPathOp = { op: "m" | "l" | "c" | "h"; c: number[] };

// Converte um path do símbolo (só comandos absolutos M/H/V/L/C/Z) em operações
// do jsPDF: (x, y) é o canto superior esquerdo do enquadramento MARK_VIEWBOX.
export function markPathToPdfOps(d: string, x: number, y: number, scale: number): PdfPathOp[] {
  const tokens = d.match(/[MHVLCZ]|-?\d*\.?\d+/g) ?? [];
  const ops: PdfPathOp[] = [];
  const px = (v: number) => x + (v - MARK_VIEWBOX.x) * scale;
  const py = (v: number) => y + (v - MARK_VIEWBOX.y) * scale;
  let cx = 0;
  let cy = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case "M":
        cx = num();
        cy = num();
        ops.push({ op: "m", c: [px(cx), py(cy)] });
        break;
      case "L":
        cx = num();
        cy = num();
        ops.push({ op: "l", c: [px(cx), py(cy)] });
        break;
      case "H":
        cx = num();
        ops.push({ op: "l", c: [px(cx), py(cy)] });
        break;
      case "V":
        cy = num();
        ops.push({ op: "l", c: [px(cx), py(cy)] });
        break;
      case "C": {
        const [x1, y1, x2, y2, x3, y3] = [num(), num(), num(), num(), num(), num()];
        ops.push({ op: "c", c: [px(x1), py(y1), px(x2), py(y2), px(x3), py(y3)] });
        cx = x3;
        cy = y3;
        break;
      }
      case "Z":
        ops.push({ op: "h", c: [] });
        break;
      default:
        throw new Error(`Comando de path não suportado no símbolo: ${cmd}`);
    }
  }
  return ops;
}
