import { cn } from "@/lib/cn";
import { MARK_STROKES, MARK_STROKE_WIDTH, MARK_TONE_VAR, MARK_VIEWBOX_ATTR } from "@/lib/brand/mark";

type LogoProps = {
  variant?: "dark" | "light";
  className?: string;
  ariaLabel?: string;
};

export function Logo({ variant = "dark", className, ariaLabel = "musclePro" }: LogoProps) {
  // "dark" = logo escuro para fundo claro (navy-deep); "light" = logo claro
  // para fundo escuro, onde o navy-deep some.
  const onLight = variant === "dark";
  const tones = MARK_TONE_VAR[onLight ? "onLight" : "onDark"];
  const textColor = onLight ? "#1F1F1F" : "#FFFFFF";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} aria-label={ariaLabel}>
      <svg
        width="35"
        height="28"
        viewBox={MARK_VIEWBOX_ATTR}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {MARK_STROKES.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            style={{ stroke: tones[stroke.tone] }}
            strokeWidth={MARK_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={stroke.opacity}
          />
        ))}
      </svg>
      <span
        className="text-[2rem] font-extrabold tracking-[-0.04em] leading-none"
        style={{ color: textColor }}
      >
        musclePro
        <span className={onLight ? "text-brand" : "text-brand-light"}>.</span>
      </span>
    </div>
  );
}
