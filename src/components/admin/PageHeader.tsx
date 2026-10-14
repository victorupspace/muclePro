import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-ink-200 pb-4 md:pb-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[19px] font-bold leading-[1.2] tracking-[-0.015em] text-ink-900 md:text-[22px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-[640px] text-[12.5px] leading-[1.55] text-ink-500 md:text-[13px]">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-stretch gap-2 [&>*]:flex-1 sm:[&>*]:flex-initial">
          {actions}
        </div>
      )}
    </div>
  );
}
