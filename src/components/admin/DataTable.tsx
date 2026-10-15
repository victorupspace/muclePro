"use client";

import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  mobileLabel?: string;
  mobileLayout?: "inline" | "stacked";
  mobilePrimary?: boolean;
  hideOnMobile?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  mobileActionsCols?: 1 | 2;
};

export function DataTable<T>({ rows, columns, rowKey, actions, emptyState, mobileActionsCols = 2 }: Props<T>) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto rounded-card border border-ink-200 bg-white md:block">
        <table className="min-w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/60 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 font-bold", c.className)}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} data-row className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-ink-900", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((row) => {
          const visible = columns.filter((c) => !c.hideOnMobile);
          const primary = visible.find((c) => c.mobilePrimary);
          const rest = primary ? visible.filter((c) => c !== primary) : visible;
          return (
            <div key={rowKey(row)} data-row className="rounded-card border border-ink-200 bg-white p-3.5">
              {primary && (
                <div className="mb-2.5 border-b border-ink-100 pb-2.5">
                  {primary.render(row)}
                </div>
              )}
              <dl className="space-y-1.5">
                {rest.map((c) => {
                  const stacked = c.mobileLayout === "stacked";
                  return (
                    <Fragment key={c.key}>
                      <div
                        className={cn(
                          "gap-3 text-[12.5px]",
                          stacked ? "flex flex-col" : "flex items-start justify-between",
                        )}
                      >
                        <dt className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
                          {c.mobileLabel ?? c.header}
                        </dt>
                        <dd
                          className={cn(
                            "min-w-0 text-ink-900",
                            stacked ? "text-left leading-[1.5]" : "text-right",
                          )}
                        >
                          {c.render(row)}
                        </dd>
                      </div>
                    </Fragment>
                  );
                })}
              </dl>
              {actions && (
                <div
                  className={cn(
                    "mt-3 grid gap-1.5 border-t border-ink-100 pt-3 [&>*]:w-full",
                    mobileActionsCols === 2 ? "grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {actions(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Action buttons compartilhados
type Tone = "ghost" | "primary" | "success" | "danger";

const TABLE_BUTTON_STYLES: Record<Tone, string> = {
  ghost: "border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
  primary: "border-ink-900 bg-ink-900 text-white hover:bg-ink-800",
  success: "border-success-600 bg-success-600 text-white hover:bg-success-700",
  danger: "border-danger-200 bg-white text-danger-600 hover:border-danger-400 hover:bg-danger-50",
};

const TABLE_BUTTON_BASE =
  "inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-btn border px-2.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:w-auto";

type TableButtonProps =
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; href?: undefined })
  | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { tone?: Tone; href: string });

export function TableButton(props: TableButtonProps) {
  const { tone = "ghost", className, children, ...rest } = props;
  const merged = cn(TABLE_BUTTON_BASE, TABLE_BUTTON_STYLES[tone], className);

  if ("href" in rest && rest.href) {
    return (
      <Link {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href={rest.href} className={merged}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      className={merged}
    >
      {children}
    </button>
  );
}
