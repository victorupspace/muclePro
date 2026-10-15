"use client";

import { AlertTriangle, Check } from "lucide-react";
import { Field, inputClass, textareaClass } from "../FormKit";
import { cn } from "@/lib/cn";
import { MEASURES, parseMeasure, type MeasureKey } from "@/lib/plataforma/assessments";
import { HEALTH_CONDITION_LABEL } from "@/lib/plataforma/format";
import type { AssessmentMeasures, HealthCondition, Student } from "@/lib/plataforma/types";

export const HEALTH_CONDITIONS = Object.keys(HEALTH_CONDITION_LABEL) as HealthCondition[];

export type MeasureDraft = Record<MeasureKey, string>;

export const emptyMeasureDraft = (): MeasureDraft => ({
  weightKg: "",
  heightCm: "",
  armCm: "",
  chestCm: "",
  waistCm: "",
  abdomenCm: "",
  thighCm: "",
});

export function draftFrom(m?: AssessmentMeasures): MeasureDraft {
  const d = emptyMeasureDraft();
  if (!m) return d;
  for (const f of MEASURES) {
    const v = m[f.key];
    d[f.key] = v === undefined ? "" : String(v).replace(".", ",");
  }
  return d;
}

export function measuresFrom(d: MeasureDraft): AssessmentMeasures {
  const out: AssessmentMeasures = {};
  for (const f of MEASURES) out[f.key] = parseMeasure(d[f.key]);
  return out;
}

// Peso e altura em destaque; medidas do corpo opcionais logo abaixo.
export function MeasureFields({ value, onChange }: { value: MeasureDraft; onChange: (next: MeasureDraft) => void }) {
  const set = (key: MeasureKey, v: string) => onChange({ ...value, [key]: v.replace(/[^\d,.]/g, "").slice(0, 6) });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {MEASURES.slice(0, 2).map((m) => (
          <Field key={m.key} label={`${m.label} (${m.unit})`}>
            <input
              inputMode="decimal"
              value={value[m.key]}
              onChange={(e) => set(m.key, e.target.value)}
              placeholder={m.key === "weightKg" ? "72,5" : "175"}
              className={cn(inputClass, "tabular-nums")}
            />
          </Field>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
          Medidas em cm <span className="font-semibold normal-case tracking-normal text-ink-400">· opcionais</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {MEASURES.slice(2).map((m) => (
            <label key={m.key} className="block" title={m.hint}>
              <span className="mb-1 block truncate text-[11.5px] font-semibold text-ink-700">{m.label}</span>
              <input
                inputMode="decimal"
                value={value[m.key]}
                onChange={(e) => set(m.key, e.target.value)}
                placeholder="—"
                className={cn(inputClass, "tabular-nums")}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export type HealthDraft = { conditions: HealthCondition[]; restrictions: string; medicalNotes: string };

export function HealthFields({ value, onChange }: { value: HealthDraft; onChange: (next: HealthDraft) => void }) {
  const toggle = (c: HealthCondition) =>
    onChange({
      ...value,
      conditions: value.conditions.includes(c) ? value.conditions.filter((x) => x !== c) : [...value.conditions, c],
    });
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Condições de saúde</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Condições de saúde">
          {HEALTH_CONDITIONS.map((c) => {
            const on = value.conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c)}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                  on ? "border-warning-300 bg-warning-50 text-warning-800" : "border-ink-200 bg-white text-ink-600 hover:border-ink-400",
                )}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
                {HEALTH_CONDITION_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Restrições para o treino" hint="O que o aluno não pode ou não deve fazer. Aparece para o personal ao montar a ficha.">
        <textarea
          value={value.restrictions}
          onChange={(e) => onChange({ ...value, restrictions: e.target.value })}
          rows={2}
          placeholder="Ex.: hérnia de disco lombar. Evitar carga alta no agachamento, terra e leg press; priorizar máquinas."
          className={textareaClass}
        />
      </Field>
      <Field label="Condições médicas e observações">
        <textarea
          value={value.medicalNotes}
          onChange={(e) => onChange({ ...value, medicalNotes: e.target.value })}
          rows={2}
          placeholder="Diagnósticos, medicamentos de uso contínuo, alergias, liberação médica…"
          className={textareaClass}
        />
      </Field>
    </div>
  );
}

export function hasHealthInfo(s: Pick<Student, "healthConditions" | "healthRestrictions" | "medicalNotes">) {
  return s.healthConditions.length > 0 || Boolean(s.healthRestrictions) || Boolean(s.medicalNotes);
}

// Faixa de atenção com condições e restrições (editor de ficha, ficha do aluno).
export function HealthAlert({ student, className }: { student: Student; className?: string }) {
  if (student.healthConditions.length === 0 && !student.healthRestrictions) return null;
  return (
    <div role="note" className={cn("flex gap-2.5 rounded-btn border border-warning-200 bg-warning-50/70 px-3 py-2.5", className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-700" strokeWidth={2.2} />
      <div className="min-w-0 text-[12.5px] leading-[1.5]">
        <p className="font-semibold text-warning-800">
          Atenção à saúde{student.healthConditions.length > 0 ? `: ${student.healthConditions.map((c) => HEALTH_CONDITION_LABEL[c].toLowerCase()).join(", ")}` : ""}
        </p>
        {student.healthRestrictions && <p className="text-warning-800/90">{student.healthRestrictions}</p>}
      </div>
    </div>
  );
}
