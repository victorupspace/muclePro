import { MARK_STROKES, MARK_STROKE_WIDTH, MARK_VIEWBOX_ATTR } from "@/lib/brand/mark";

// Punho da marca em branco, para fundos escuros da área do aluno.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX_ATTR} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
      {MARK_STROKES.map((stroke, i) => (
        <path
          key={i}
          d={stroke.d}
          stroke={stroke.tone === "primary" ? "#FFFFFF" : "rgb(var(--color-brand-light))"}
          strokeWidth={MARK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
