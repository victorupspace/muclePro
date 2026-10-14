import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-card border border-dashed border-ink-200 bg-white px-6 py-10 text-center md:py-14", className)}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        {icon ?? <Inbox className="h-5 w-5" strokeWidth={2.2} />}
      </span>
      <p className="mt-3 text-[14px] font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-[380px] text-[12.5px] leading-[1.55] text-ink-500">{description}</p>}
    </div>
  );
}
