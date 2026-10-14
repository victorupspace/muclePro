import { cn } from "@/lib/cn";

export function SectionLabel({
  children,
  className,
  inverse,
}: {
  children: React.ReactNode;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", inverse ? "bg-brand-light" : "bg-brand")}
      />
      <span
        className={cn(
          "text-overline font-semibold uppercase",
          inverse ? "text-white/70" : "text-ink-700/70",
        )}
      >
        {children}
      </span>
    </div>
  );
}
