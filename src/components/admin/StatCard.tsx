import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
};

export function StatCard({ label, value, hint, href, highlight, icon }: Props) {
  const Wrapper: React.ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group relative flex flex-col justify-between rounded-card border bg-white p-4 transition-all duration-200 md:p-5",
        href ? "hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-[0_18px_40px_-22px_rgba(17,17,17,0.25)]" : "",
        highlight ? "border-brand/40 ring-1 ring-inset ring-brand/15" : "border-ink-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">{label}</p>
        {icon && (
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full",
              highlight ? "bg-brand/10 text-brand" : "bg-ink-100 text-ink-600",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 text-[24px] font-bold leading-[1] tracking-[-0.025em] md:text-[28px]",
          highlight ? "text-brand" : "text-ink-900",
        )}
      >
        {value}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {hint && <p className="text-[11.5px] text-ink-500">{hint}</p>}
        {href && (
          <ArrowUpRight
            className="ml-auto h-3.5 w-3.5 text-ink-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink-900"
            strokeWidth={2.2}
          />
        )}
      </div>
    </Wrapper>
  );
}
