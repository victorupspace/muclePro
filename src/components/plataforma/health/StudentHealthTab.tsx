"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowDownRight, ArrowUpRight, HeartPulse, Minus, Pencil, Plus, Ruler, Scale, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "../Toast";
import { prefersReducedMotion } from "../motion";
import { AssessmentModal, HealthModal } from "./HealthModals";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { BODY_MEASURES, bmi, bmiLabel, evolution, formatDelta, formatMeasure, latestHeight } from "@/lib/plataforma/assessments";
import { HEALTH_CONDITION_LABEL, formatDateValue } from "@/lib/plataforma/format";
import { useAccountSession } from "@/lib/plataforma/session";
import { usePlataformaStore } from "@/lib/plataforma/store";
import type { Assessment, Student } from "@/lib/plataforma/types";

export function StudentHealthTab({ student }: { student: Student }) {
  const { assessmentsFor, removeAssessment } = usePlataformaStore();
  const { profile } = useAccountSession();
  const { push } = useToast();
  const perms = profile?.permissions;
  const canEdit = Boolean(perms?.canCreateWorkouts || perms?.canRegisterStudents);

  const [healthOpen, setHealthOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | undefined>();
  const [deleting, setDeleting] = useState<Assessment | null>(null);

  const list = assessmentsFor(student.id);
  const latest = list[0];
  const height = latestHeight(list);
  const currentBmi = bmi(latest?.weightKg ?? list.find((a) => a.weightKg)?.weightKg, height);
  const evo = useMemo(() => evolution(list), [list]);
  const weights = useMemo(() => [...list].reverse().filter((a) => a.weightKg !== undefined), [list]);

  function canDelete(a: Assessment) {
    return Boolean(perms?.canDeleteRecords || (profile?.staffId && a.authorStaffId === profile.staffId));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Saúde */}
        <section className="rounded-card border border-ink-200 bg-white p-4 md:p-5">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warning-50 text-warning-700">
                <HeartPulse className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <h2 className="text-[13.5px] font-bold text-ink-900">Saúde e restrições</h2>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setHealthOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-ink-200 px-2.5 text-[11.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
              >
                <Pencil className="h-3 w-3" strokeWidth={2.4} />
                Editar
              </button>
            )}
          </header>
          {student.healthConditions.length === 0 && !student.healthRestrictions && !student.medicalNotes ? (
            <p className="text-[12.5px] leading-[1.55] text-ink-500">
              Nenhuma condição registrada. Pergunte sobre lesões, dores, cirurgias e medicamentos antes do primeiro treino.
            </p>
          ) : (
            <div className="space-y-3">
              {student.healthConditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {student.healthConditions.map((c) => (
                    <span key={c} className="rounded-full bg-warning-50 px-2.5 py-1 text-[11.5px] font-semibold text-warning-800 ring-1 ring-inset ring-warning-200">
                      {HEALTH_CONDITION_LABEL[c]}
                    </span>
                  ))}
                </div>
              )}
              {student.healthRestrictions && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Restrições para o treino</p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-ink-900">{student.healthRestrictions}</p>
                </div>
              )}
              {student.medicalNotes && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Condições médicas</p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-ink-700">{student.medicalNotes}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Situação atual */}
        <section className="rounded-card border border-ink-200 bg-white p-4 md:p-5">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Scale className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <div>
                <h2 className="text-[13.5px] font-bold text-ink-900">Hoje</h2>
                <p className="text-[11px] text-ink-500">{latest ? `Última avaliação em ${formatDateValue(latest.measuredOn)}` : "Sem avaliação ainda"}</p>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditing(undefined);
                  setAssessOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-brand px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                <Plus className="h-3 w-3" strokeWidth={2.6} />
                {list.length === 0 ? "Anamnese inicial" : "Reavaliar"}
              </button>
            )}
          </header>
          <dl className="grid grid-cols-3 gap-2">
            <Big label="Peso" value={formatMeasure(evo[0]?.last, "kg")} />
            <Big label="Altura" value={formatMeasure(height, "cm")} />
            <Big label="IMC" value={currentBmi ? currentBmi.toFixed(1).replace(".", ",") : "—"} hint={bmiLabel(currentBmi)} />
          </dl>
          {weights.length >= 2 && <WeightSpark data={weights} />}
        </section>
      </div>

      {/* Evolução */}
      {list.length > 0 && (
        <section className="rounded-card border border-ink-200 bg-white p-4 md:p-5">
          <header className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-700">
              <Ruler className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-[13.5px] font-bold text-ink-900">Evolução</h2>
              <p className="text-[11px] text-ink-500">Da primeira à última medição de cada item.</p>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {evo.map((e) => (
              <div key={e.key} className="rounded-btn border border-ink-100 px-3 py-2.5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">{e.label}</p>
                <p className="mt-1 text-[16px] font-bold tabular-nums text-ink-900">{formatMeasure(e.last, e.unit)}</p>
                {e.delta !== undefined ? (
                  <p
                    className={cn(
                      "mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
                      e.delta === 0 ? "text-ink-500" : "text-ink-700",
                    )}
                  >
                    {e.delta > 0 ? (
                      <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} />
                    ) : e.delta < 0 ? (
                      <ArrowDownRight className="h-3 w-3" strokeWidth={2.6} />
                    ) : (
                      <Minus className="h-3 w-3" strokeWidth={2.6} />
                    )}
                    {formatDelta(e.delta, e.unit)}
                    <span className="font-normal text-ink-400">desde {formatMeasure(e.first, e.unit)}</span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-ink-400">{e.last === undefined ? "Não medido" : "Uma medição"}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Histórico */}
      <section className="rounded-card border border-ink-200 bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 md:px-5">
          <h2 className="text-[13.5px] font-bold text-ink-900">Histórico de avaliações</h2>
          <span className="text-[11.5px] text-ink-500">{list.length} registro{list.length === 1 ? "" : "s"}</span>
        </header>
        {list.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12.5px] leading-[1.55] text-ink-500 md:px-5">
            Registre a anamnese inicial (peso, altura e medidas) para acompanhar a evolução do aluno.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-100 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">
                  <th className="px-4 py-2.5 md:px-5">Data</th>
                  <th className="px-2 py-2.5">Peso</th>
                  {BODY_MEASURES.map((m) => (
                    <th key={m.key} className="px-2 py-2.5">
                      {m.label}
                    </th>
                  ))}
                  <th className="px-2 py-2.5">Por</th>
                  <th className="px-4 py-2.5 md:px-5" />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b border-ink-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 md:px-5">
                      <p className="font-semibold text-ink-900">{formatDateValue(a.measuredOn)}</p>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400">{a.kind === "inicial" ? "Anamnese inicial" : "Reavaliação"}</p>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 tabular-nums">{formatMeasure(a.weightKg, "kg")}</td>
                    {BODY_MEASURES.map((m) => (
                      <td key={m.key} className="whitespace-nowrap px-2 py-2.5 tabular-nums text-ink-700">
                        {formatMeasure(a[m.key], "cm")}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-2 py-2.5 text-ink-500">{a.authorName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right md:px-5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(a);
                            setAssessOpen(true);
                          }}
                          aria-label="Editar avaliação"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                      )}
                      {canDelete(a) && (
                        <button
                          type="button"
                          onClick={() => setDeleting(a)}
                          aria-label="Excluir avaliação"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <HealthModal open={healthOpen} onClose={() => setHealthOpen(false)} student={student} />
      <AssessmentModal open={assessOpen} onClose={() => setAssessOpen(false)} student={student} assessment={editing} />
      <ConfirmDialog
        open={!!deleting}
        title="Excluir esta avaliação?"
        description="As medidas somem do histórico e da evolução do aluno. Não dá para desfazer."
        confirmLabel="Excluir"
        cancelLabel="Manter"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && (await removeAssessment(deleting.id))) push({ tone: "info", title: "Avaliação excluída" });
          setDeleting(null);
        }}
      />
    </motion.div>
  );
}

function Big({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-btn bg-ink-50 px-3 py-2.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-500">{label}</dt>
      <dd className="mt-1 text-[17px] font-bold tabular-nums text-ink-900">{value}</dd>
      {hint && <dd className="text-[10.5px] text-ink-500">{hint}</dd>}
    </div>
  );
}

// Peso ao longo das avaliações.
function WeightSpark({ data }: { data: Assessment[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const values = data.map((a) => a.weightKg!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.from(ref.current.querySelectorAll("[data-bar]"), { scaleY: 0, transformOrigin: "bottom center", duration: 0.5, stagger: 0.05, ease: "power3.out" });
    },
    { scope: ref, dependencies: [values.join(",")], revertOnUpdate: true },
  );
  return (
    <div className="mt-4">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">Peso nas avaliações</p>
      <div ref={ref} className="mt-2 flex h-[72px] items-end gap-1.5">
        {data.map((a, i) => (
          <div key={a.id} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatDateValue(a.measuredOn)}: ${formatMeasure(a.weightKg, "kg")}`}>
            <div
              data-bar
              className={cn("w-full rounded-t-[3px]", i === data.length - 1 ? "bg-brand" : "bg-brand-light/70")}
              style={{ height: `${25 + ((a.weightKg! - min) / span) * 75}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-400">
        <span>{formatDateValue(data[0].measuredOn)}</span>
        <span>{formatDateValue(data[data.length - 1].measuredOn)}</span>
      </div>
    </div>
  );
}
