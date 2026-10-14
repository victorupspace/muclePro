import type { Config } from "tailwindcss";

// Cores de marca vêm de CSS variables (src/app/globals.css) em canais RGB,
// para que modificadores de opacidade (`bg-brand/40`) funcionem e o white
// label consiga trocar a marca sem rebuild.
const cssVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: navy-deep. Hover: navy. `light` = textos/detalhes da marca
        // sobre fundo escuro.
        brand: {
          DEFAULT: cssVar("--color-brand"),
          hover: cssVar("--color-brand-hover"),
          light: cssVar("--color-brand-light"),
        },
        // Paleta de apoio do design system (volt, dim, ember, gold).
        accent: {
          DEFAULT: cssVar("--color-accent"),
          hover: cssVar("--color-accent-hover"),
          dim: cssVar("--color-accent-dim"),
          ember: cssVar("--color-accent-ember"),
          gold: cssVar("--color-accent-gold"),
        },
        surface: {
          DEFAULT: "#F5F6F8", // bg/surface
          50: "#F5F6F8",
          elevated: "#EEF0F4", // bg/elevated
          dark: "#232323", // surface/dark
        },
        // Escala neutra mapeada para Text / Stroke / Background do design system.
        ink: {
          DEFAULT: "#1F1F1F",
          900: "#1F1F1F", // text/primary
          800: "#232323", // surface/dark
          700: "#383A45",
          600: "#4A4D59",
          500: "#5F6270", // text/secondary
          400: "#9A9AA3", // text/muted (só ícones e placeholders: 2.8:1 no branco)
          300: "#D3D5DE", // stroke/strong
          200: "#E7E8EE", // stroke/subtle
          100: "#EEF0F4", // bg/elevated
          50: "#F5F6F8", // bg/surface
        },
        // Feedback: o 500 é a cor do design system; 700 é o tom de texto
        // sobre o fundo 50 (contraste AA).
        success: {
          50: "#E6F7EF",
          100: "#CCF0E1",
          200: "#99E0C3",
          300: "#66D1A4",
          400: "#33C186",
          500: "#00B268", // feedback/success
          600: "#00995A",
          700: "#00784A",
          800: "#005C38",
        },
        warning: {
          50: "#FFF6E5",
          100: "#FFEDCC",
          200: "#FFDB99",
          300: "#FFCA66",
          400: "#FFB833",
          500: "#FFA600", // feedback/warning
          600: "#D98D00",
          700: "#8F5B00",
          800: "#6B4500",
        },
        danger: {
          50: "#FFEEEE",
          100: "#FFDCDC",
          200: "#FFBABA",
          300: "#FF9797",
          400: "#FF7575",
          500: "#FF5252", // feedback/danger
          600: "#E03A3A",
          700: "#B3261E",
          800: "#861A1A",
        },
        info: {
          50: "#E6EEFF",
          100: "#CCDDFF",
          200: "#99BBFF",
          300: "#6699FF",
          400: "#3377FF",
          500: "#0055FF", // accent/volt
          600: "#0047D6",
          700: "#0040C2",
          800: "#002B82",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "h1-d": ["clamp(2.5rem, 5.8vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "h1-m": ["2.5rem", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "h2": ["clamp(1.75rem, 3.5vw, 2rem)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.55" }],
        "body": ["0.9375rem", { lineHeight: "1.6" }],
        "btn": ["0.8125rem", { lineHeight: "1", letterSpacing: "0.01em" }],
        "overline": ["0.6875rem", { lineHeight: "1", letterSpacing: "0.14em" }],
        "micro": ["0.625rem", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        xs: "4px",
        btn: "6px",
        card: "8px",
        panel: "12px",
        lg2: "16px",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,178,104,0.55)" },
          "50%": { boxShadow: "0 0 0 6px rgba(0,178,104,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 2s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
