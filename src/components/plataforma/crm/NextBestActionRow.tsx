"use client";

import {
  Calculator,
  ExternalLink,
  FileText,
  ListChecks,
  PhoneCall,
  Plus,
  Send,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PRIORITY_LABEL_NBA,
  PRIORITY_TONE_NBA,
  type NextBestAction,
  type NextBestActionCta,
} from "@/lib/plataforma/next-best-action";
import type { Client } from "@/lib/plataforma/types";

type Props = {
  action: NextBestAction;
  client: Client;
  onExecute: () => void;
  onOpenClient: () => void;
  dense?: boolean;
};

const CTA_ICONS: Record<NextBestActionCta, LucideIcon> = {
  register_contact: PhoneCall,
  generate_pdf: FileText,
  create_followup: Plus,
  request_document: Send,
  open_timeline: Workflow,
  open_client: ExternalLink,
  new_simulation: Calculator,
};

export function NextBestActionRow({ action, client, onExecute, onOpenClient, dense }: Props) {
  const Icon: LucideIcon = CTA_ICONS[action.ctaAction] ?? ListChecks;
  return (
    <li
      className={cn(
        "rounded-btn border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50/50",
        dense && "p-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenClient} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-brand" strokeWidth={2.4} />
            <p className="truncate text-[12.5px] font-semibold text-ink-900">
              {client.companyName ?? client.name}
            </p>
          </div>
          <p className="mt-0.5 text-[11.5px] font-semibold text-ink-700">{action.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-[1.4] text-ink-500">
            {action.reason}
          </p>
        </button>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset",
            PRIORITY_TONE_NBA[action.priority],
          )}
        >
          {PRIORITY_LABEL_NBA[action.priority]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onExecute}
          className="inline-flex h-7 items-center gap-1 rounded-btn bg-brand px-2.5 text-[10.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Icon className="h-3 w-3" strokeWidth={2.4} />
          {action.ctaLabel}
        </button>
        <button
          type="button"
          onClick={onOpenClient}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-btn px-2 text-[10.5px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
          Abrir cliente
        </button>
      </div>
    </li>
  );
}
