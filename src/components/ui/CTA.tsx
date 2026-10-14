"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

type CTAProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "glass";
  // Em fundo escuro o navy-deep se confunde com o preto; ganha uma borda clara.
  onDark?: boolean;
  size?: "md" | "sm";
  className?: string;
  icon?: boolean;
  leadingIcon?: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function CTA({
  children,
  href,
  onClick,
  variant = "primary",
  onDark = false,
  size = "md",
  className,
  icon = true,
  leadingIcon,
  type = "button",
  disabled = false,
}: CTAProps) {
  const base =
    "group relative inline-flex w-full items-center justify-center gap-2 rounded-btn border font-semibold uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform";

  const sizes =
    size === "sm"
      ? "px-4 py-3 text-[11px] leading-none"
      : "px-6 py-4 text-btn";

  const styles =
    variant === "primary"
      ? onDark
        ? "border-white/20 bg-brand text-white hover:border-white/30 hover:bg-brand-hover hover:shadow-[0_10px_40px_-8px_rgb(var(--color-brand-hover)/0.7)]"
        : "border-brand bg-brand text-white hover:bg-brand-hover hover:shadow-[0_10px_40px_-8px_rgb(var(--color-brand)/0.55)]"
      : variant === "glass"
        ? "border-white/[0.16] bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-white/30 hover:bg-white/[0.13]"
        : "border-white/20 bg-transparent text-white hover:bg-white/10";

  const content = (
    <>
      {leadingIcon && <span className="relative z-10 inline-flex shrink-0">{leadingIcon}</span>}
      <span className="relative z-10">{children}</span>
      {icon && (
        <ArrowUpRight
          className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={2.5}
        />
      )}
      {variant === "primary" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-btn bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ backgroundSize: "200% 100%" }}
        />
      )}
    </>
  );

  const motionProps = {
    whileHover: { scale: 1.015 },
    whileTap: { scale: 0.985 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  };

  if (href) {
    return (
      <motion.a href={href} className={cn(base, sizes, styles, className)} {...motionProps}>
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        sizes,
        styles,
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      {...motionProps}
    >
      {content}
    </motion.button>
  );
}
