import { MARK_STROKES, MARK_VIEWBOX, markPathToPdfOps } from "@/lib/brand/mark";
import { WORKOUT_LEVEL_LABEL, daysFromToday, firstName, formatDateValue } from "./format";
import type { Student, WorkoutDay, WorkoutExercise, WorkoutProgram } from "./types";

// Fichas de treino: biblioteca para autocompletar, situação da ficha e as
// saídas para o aluno (texto de WhatsApp e PDF).

export const EXERCISE_LIBRARY: Record<string, string[]> = {
  Peito: ["Supino reto com barra", "Supino inclinado com halteres", "Supino declinado", "Crucifixo com halteres", "Crossover", "Peck deck", "Flexão de braço"],
  Costas: ["Puxada frontal", "Puxada supinada", "Remada curvada", "Remada baixa", "Remada unilateral (serrote)", "Barra fixa", "Pulldown com corda", "Levantamento terra"],
  Ombros: ["Desenvolvimento com halteres", "Desenvolvimento militar", "Elevação lateral", "Elevação frontal", "Crucifixo inverso", "Encolhimento"],
  Bíceps: ["Rosca direta", "Rosca alternada", "Rosca martelo", "Rosca scott", "Rosca concentrada"],
  Tríceps: ["Tríceps corda", "Tríceps testa", "Tríceps francês", "Mergulho no banco", "Tríceps pulley"],
  Pernas: ["Agachamento livre", "Leg press 45°", "Cadeira extensora", "Mesa flexora", "Cadeira flexora", "Stiff", "Afundo", "Agachamento búlgaro", "Hack machine", "Cadeira adutora", "Cadeira abdutora"],
  Glúteos: ["Elevação pélvica", "Glúteo na polia", "Coice no cabo", "Abdução de quadril"],
  Panturrilha: ["Panturrilha em pé", "Panturrilha sentado", "Panturrilha no leg press"],
  Core: ["Prancha", "Abdominal supra", "Abdominal infra", "Abdominal oblíquo", "Abdominal na polia", "Elevação de pernas"],
  Cardio: ["Esteira", "Bicicleta ergométrica", "Elíptico", "Escada", "Remo ergômetro", "Pular corda"],
};

export const ALL_EXERCISES = Array.from(new Set(Object.values(EXERCISE_LIBRARY).flat())).sort((a, b) => a.localeCompare(b, "pt-BR"));

export const DAY_NAMES = ["A", "B", "C", "D", "E", "F"];

export function emptyExercise(): WorkoutExercise {
  return { name: "", sets: "3", reps: "12", load: "", rest: "60s", notes: "" };
}

export function emptyDay(index: number): WorkoutDay {
  return { name: DAY_NAMES[index] ?? String(index + 1), focus: "", exercises: [emptyExercise()] };
}

// Remove linhas em branco antes de salvar.
export function cleanDays(days: WorkoutDay[]): WorkoutDay[] {
  return days
    .map((d) => ({
      name: d.name.trim() || "Treino",
      focus: d.focus?.trim() || undefined,
      exercises: d.exercises
        .filter((e) => e.name.trim())
        .map((e) => ({
          name: e.name.trim(),
          sets: e.sets?.trim() || undefined,
          reps: e.reps?.trim() || undefined,
          load: e.load?.trim() || undefined,
          rest: e.rest?.trim() || undefined,
          notes: e.notes?.trim() || undefined,
        })),
    }))
    .filter((d) => d.exercises.length > 0);
}

export type WorkoutStatus = "ativa" | "reavaliar" | "arquivada";

export function workoutStatus(w: WorkoutProgram): WorkoutStatus {
  if (!w.active) return "arquivada";
  if (w.reviewOn && daysFromToday(w.reviewOn) < 0) return "reavaliar";
  return "ativa";
}

export const WORKOUT_STATUS_LABEL: Record<WorkoutStatus, string> = {
  ativa: "Em uso",
  reavaliar: "Reavaliar",
  arquivada: "Arquivada",
};

export function exerciseCount(w: WorkoutProgram) {
  return w.days.reduce((sum, d) => sum + d.exercises.length, 0);
}

function prescription(e: WorkoutExercise) {
  const main = [e.sets && e.reps ? `${e.sets}x${e.reps}` : e.sets ? `${e.sets} séries` : e.reps ?? ""].filter(Boolean);
  if (e.load) main.push(e.load);
  if (e.rest) main.push(`desc. ${e.rest}`);
  return main.join(" · ");
}

export function workoutWhatsappText(w: WorkoutProgram, student: Student, companyName: string) {
  const lines = [`Oi ${firstName(student.fullName)}! Sua ficha de treino da ${companyName}:`, "", `*${w.title}*`];
  if (w.goal) lines.push(`Objetivo: ${w.goal}`);
  for (const day of w.days) {
    lines.push("", `*Treino ${day.name}${day.focus ? ` · ${day.focus}` : ""}*`);
    day.exercises.forEach((e, i) => {
      const p = prescription(e);
      lines.push(`${i + 1}. ${e.name}${p ? ` · ${p}` : ""}${e.notes ? ` (${e.notes})` : ""}`);
    });
  }
  if (w.notes) lines.push("", `Obs.: ${w.notes}`);
  if (w.reviewOn) lines.push("", `Reavaliação em ${formatDateValue(w.reviewOn)}.`);
  lines.push("", "Bom treino!");
  return lines.join("\n");
}

const NAVY: [number, number, number] = [1, 33, 92];
const NAVY_LIGHT: [number, number, number] = [141, 168, 224];
const INK: [number, number, number] = [31, 31, 31];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [229, 231, 235];

// PDF A4 para imprimir ou mandar ao aluno.
export async function downloadWorkoutPdf(w: WorkoutProgram, student: Student, companyName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;

  const header = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 26, "F");
    const scale = 9 / MARK_VIEWBOX.height;
    doc.setLineWidth(3.4 * scale);
    doc.setLineCap("round");
    doc.setLineJoin("round");
    for (const stroke of MARK_STROKES) {
      doc.setDrawColor(...(stroke.tone === "primary" ? ([255, 255, 255] as [number, number, number]) : NAVY_LIGHT));
      doc.path(markPathToPdfOps(stroke.d, margin, 8.5, scale)).stroke();
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(companyName, margin + 16, 13.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY_LIGHT);
    doc.text("Ficha de treino", margin + 16, 18.5);
    y = 36;
  };

  const ensure = (needed: number) => {
    if (y + needed > pageH - 16) {
      doc.addPage();
      header();
    }
  };

  header();

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(student.fullName, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const meta = [
    w.title,
    w.level ? WORKOUT_LEVEL_LABEL[w.level] : null,
    `Início ${formatDateValue(w.startsOn)}`,
    w.reviewOn ? `Reavaliação ${formatDateValue(w.reviewOn)}` : null,
    w.authorName ? `Professor: ${w.authorName}` : null,
  ].filter(Boolean);
  doc.text(meta.join("  ·  "), margin, y);
  y += 5;
  if (w.goal) {
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(`Objetivo: ${w.goal}`, pageW - margin * 2), margin, y);
    y += 5;
  }
  y += 3;

  const cols = [
    { label: "#", w: 8 },
    { label: "Exercício", w: 94 },
    { label: "Séries", w: 16 },
    { label: "Repetições", w: 22 },
    { label: "Carga", w: 22 },
    { label: "Descanso", w: 20 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);

  for (const day of w.days) {
    ensure(22);
    doc.setFillColor(243, 245, 250);
    doc.roundedRect(margin, y - 4.5, pageW - margin * 2, 8, 1.5, 1.5, "F");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Treino ${day.name}${day.focus ? `  ·  ${day.focus}` : ""}`, margin + 3, y + 0.8);
    y += 9;

    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    let x = margin;
    for (const c of cols) {
      doc.text(c.label.toUpperCase(), x + 1, y);
      x += c.w;
    }
    y += 2;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + tableW, y);
    y += 4.5;

    day.exercises.forEach((e, i) => {
      const nameLines = doc.splitTextToSize(e.name, cols[1].w - 2) as string[];
      const noteLines = e.notes ? (doc.splitTextToSize(e.notes, cols[1].w - 2) as string[]) : [];
      const rowH = Math.max(1, nameLines.length) * 4.2 + noteLines.length * 3.6 + 2.5;
      ensure(rowH + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(String(i + 1), margin + 1, y);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.text(nameLines, margin + cols[0].w + 1, y);
      if (noteLines.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(noteLines, margin + cols[0].w + 1, y + nameLines.length * 4.2);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      let cx = margin + cols[0].w + cols[1].w;
      for (const [idx, value] of [e.sets, e.reps, e.load, e.rest].entries()) {
        doc.text(value || "—", cx + 1, y);
        cx += cols[idx + 2].w;
      }
      y += rowH;
      doc.setDrawColor(...LINE);
      doc.line(margin, y - 2.2, margin + tableW, y - 2.2);
      y += 1.5;
    });
    y += 4;
  }

  if (w.notes) {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("Observações", margin, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(w.notes, pageW - margin * 2) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 4.2;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Gerado pelo musclePro em ${new Date().toLocaleDateString("pt-BR")}`, margin, pageH - 8);
    doc.text(`${p}/${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  doc.save(`ficha-${slug(student.fullName)}-${slug(w.title)}.pdf`);
}

const ex = (name: string, sets = "3", reps = "12", rest = "60s"): WorkoutExercise => ({ name, sets, reps, rest });

// Pontos de partida: o professor ajusta carga e volume depois.
export const WORKOUT_TEMPLATES: { id: string; label: string; title: string; goal: string; days: WorkoutDay[] }[] = [
  {
    id: "fullbody",
    label: "Corpo inteiro · iniciante",
    title: "Adaptação",
    goal: "Adaptação e aprendizado dos movimentos",
    days: [
      {
        name: "A",
        focus: "Corpo inteiro",
        exercises: [
          ex("Leg press 45°", "3", "15"),
          ex("Supino reto com barra", "3", "12"),
          ex("Puxada frontal", "3", "12"),
          ex("Cadeira extensora", "3", "15"),
          ex("Mesa flexora", "3", "15"),
          ex("Desenvolvimento com halteres", "3", "12"),
          ex("Prancha", "3", "30s", "45s"),
        ],
      },
    ],
  },
  {
    id: "abc",
    label: "ABC · hipertrofia",
    title: "Hipertrofia ABC",
    goal: "Ganho de massa muscular",
    days: [
      {
        name: "A",
        focus: "Peito, ombros e tríceps",
        exercises: [
          ex("Supino reto com barra", "4", "10", "90s"),
          ex("Supino inclinado com halteres", "3", "10", "90s"),
          ex("Crucifixo com halteres", "3", "12"),
          ex("Desenvolvimento com halteres", "3", "10", "90s"),
          ex("Elevação lateral", "3", "12"),
          ex("Tríceps corda", "3", "12"),
        ],
      },
      {
        name: "B",
        focus: "Costas e bíceps",
        exercises: [
          ex("Puxada frontal", "4", "10", "90s"),
          ex("Remada curvada", "3", "10", "90s"),
          ex("Remada unilateral (serrote)", "3", "12"),
          ex("Crucifixo inverso", "3", "15"),
          ex("Rosca direta", "3", "10"),
          ex("Rosca martelo", "3", "12"),
        ],
      },
      {
        name: "C",
        focus: "Pernas e core",
        exercises: [
          ex("Agachamento livre", "4", "10", "120s"),
          ex("Leg press 45°", "3", "12", "90s"),
          ex("Cadeira extensora", "3", "12"),
          ex("Mesa flexora", "3", "12"),
          ex("Panturrilha em pé", "4", "15", "45s"),
          ex("Abdominal supra", "3", "20", "45s"),
        ],
      },
    ],
  },
];
