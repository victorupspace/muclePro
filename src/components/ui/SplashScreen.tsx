"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MARK_STROKES, MARK_STROKE_WIDTH, MARK_TONE_VAR, MARK_VIEWBOX } from "@/lib/brand/mark";

const ANIMATION_DURATION_MS = 2800;
const FADE_DURATION_MS = 600;

type Props = {
  storageKey: string;
};

export function SplashScreen({ storageKey }: Props) {
  const [phase, setPhase] = useState<"checking" | "showing" | "fading" | "done">("checking");
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    if (typeof window === "undefined") {
      setPhase("done");
      return;
    }

    const alreadySeen = window.sessionStorage.getItem(storageKey) === "1";
    if (alreadySeen) {
      setPhase("done");
      return;
    }

    setPhase("showing");
  }, [storageKey]);

  useEffect(() => {
    if (phase === "done" && typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }
  }, [phase, storageKey]);

  useEffect(() => {
    if (phase !== "showing") return;

    document.body.style.overflow = "hidden";
    const fadeTimer = window.setTimeout(() => setPhase("fading"), ANIMATION_DURATION_MS);
    const doneTimer = window.setTimeout(
      () => setPhase("done"),
      ANIMATION_DURATION_MS + FADE_DURATION_MS,
    );

    function dismiss() {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      setPhase("fading");
      window.setTimeout(() => setPhase("done"), FADE_DURATION_MS);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      document.body.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;

    const doneTimer = window.setTimeout(() => setPhase("done"), FADE_DURATION_MS);

    return () => {
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  if (phase === "done" || phase === "checking") return null;

  return (
    <div
      role="status"
      aria-label="Carregando musclePro"
      onClick={() => setPhase("fading")}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity",
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_DURATION_MS}ms`, transitionTimingFunction: "cubic-bezier(0.45, 0, 0.55, 1)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.025) 100%)",
        }}
      />
      <div className="relative flex h-[200px] w-[min(640px,80vw)] items-center justify-center">
        <SplashMark />
      </div>
    </div>
  );
}

function SplashMark() {
  const wordRef = useRef<SVGTextElement>(null);
  const [wordWidth, setWordWidth] = useState(WORD_WIDTH_ESTIMATE);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const width = wordRef.current?.getComputedTextLength();
      if (!cancelled && width) setWordWidth(width);
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, []);

  const totalWidth = MARK_WIDTH + MARK_GAP + wordWidth + DOT_GAP + DOT_RADIUS;
  const markX = (VIEWBOX_WIDTH - totalWidth) / 2;
  const wordX = markX + MARK_WIDTH + MARK_GAP;
  const dotX = wordX + wordWidth + DOT_GAP;

  return (
    <svg
      viewBox="0 0 640 200"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full overflow-visible motion-reduce:[&_animate]:hidden motion-reduce:[&_animateTransform]:hidden"
    >
      <defs>
        <filter id="splash-glow" x="-300%" y="-300%" width="600%" height="600%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Símbolo: cada traço se desenha em sequência (pathLength normalizado). */}
      <g
        transform={`translate(${markX - MARK_VIEWBOX.x * MARK_SCALE}, ${MARK_TOP - MARK_VIEWBOX.y * MARK_SCALE}) scale(${MARK_SCALE})`}
      >
        {MARK_STROKES.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            fill="none"
            style={{ stroke: MARK_TONE_VAR.onLight[stroke.tone] }}
            strokeWidth={MARK_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
            opacity={stroke.opacity}
          >
            <animate
              attributeName="stroke-dashoffset"
              values="1; 0"
              dur="800ms"
              begin={`${i * 110}ms`}
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          </path>
        ))}
      </g>

      <g
        fontFamily="var(--font-jakarta), 'Plus Jakarta Sans', system-ui, sans-serif"
        fontWeight={700}
        fontSize={80}
        fill="#1F1F1F"
        letterSpacing={-3.6}
      >
        {/* Uma única <text> deixa o navegador cuidar do kerning; cada letra
            aparece em sequência via fill-opacity no seu <tspan>. */}
        <text ref={wordRef} x={wordX} y={117}>
          {WORD.split("").map((char, i) => (
            <tspan key={i} fillOpacity={0}>
              {char}
              <animate
                attributeName="fill-opacity"
                values="0; 1"
                dur="500ms"
                begin={`${900 + i * 60}ms`}
                fill="freeze"
              />
            </tspan>
          ))}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 12; 0 0"
            dur={`${700 + (WORD.length - 1) * 60}ms`}
            begin="900ms"
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 1 0.36 1"
          />
        </text>
      </g>

      <g transform={`translate(${dotX}, 95)`} filter="url(#splash-glow)">
        <circle cx={0} cy={0} r={0} fill="none" style={{ stroke: "rgb(var(--color-brand))" }} strokeWidth={2} opacity={0}>
          <animate
            attributeName="r"
            values="0; 50"
            dur="1100ms"
            begin="1700ms"
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 1 0.36 1"
          />
          <animate
            attributeName="opacity"
            values="0; 0.6; 0"
            dur="1100ms"
            begin="1700ms"
            fill="freeze"
            keyTimes="0; 0.4; 1"
          />
          <animate
            attributeName="stroke-width"
            values="3; 0.5"
            dur="1100ms"
            begin="1700ms"
            fill="freeze"
          />
        </circle>
        <circle cx={0} cy={0} r={0} style={{ fill: "rgb(var(--color-brand))" }}>
          <animate
            attributeName="r"
            values="0; 11; 8"
            keyTimes="0; 0.6; 1"
            dur="700ms"
            begin="1700ms"
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 1 0.36 1; 0.45 0 0.55 1"
          />
        </circle>
      </g>
    </svg>
  );
}

const WORD = "musclePro";
const VIEWBOX_WIDTH = 640;
const MARK_SCALE = 2;
const MARK_WIDTH = MARK_VIEWBOX.width * MARK_SCALE;
const MARK_GAP = 22;
// Centraliza o símbolo na altura das maiúsculas do "musclePro" (baseline 117).
const MARK_TOP = 88 - (MARK_VIEWBOX.height * MARK_SCALE) / 2;
const DOT_GAP = 16;
const DOT_RADIUS = 11;
// Largura aproximada da palavra em 80px; substituída pela medida real após o render.
const WORD_WIDTH_ESTIMATE = 360;
