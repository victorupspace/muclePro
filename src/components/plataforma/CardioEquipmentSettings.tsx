"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, HeartPulse, Plus, X } from "lucide-react";
import { inputClass } from "./FormKit";
import { useToast } from "./Toast";
import { cn } from "@/lib/cn";
import { usePlataformaStore } from "@/lib/plataforma/store";
import { DEFAULT_CARDIO_EQUIPMENT } from "@/lib/plataforma/workouts";

// Aparelhos de cardio da academia: aparecem como opção no cardio das fichas.
export function CardioEquipmentSettings() {
  const { settings, updateSettings } = usePlataformaStore();
  const { push } = useToast();
  const saved = useMemo(() => settings.cardioEquipment ?? DEFAULT_CARDIO_EQUIPMENT, [settings.cardioEquipment]);
  const [selected, setSelected] = useState<string[]>(saved);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelected(saved), [saved]);

  // Padrões + os personalizados que já existem.
  const options = useMemo(() => Array.from(new Set([...DEFAULT_CARDIO_EQUIPMENT, ...saved, ...selected])), [saved, selected]);
  const dirty = selected.length !== saved.length || selected.some((s) => !saved.includes(s));

  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  function addCustom() {
    const name = custom.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (!selected.some((s) => s.toLowerCase() === name.toLowerCase())) setSelected((prev) => [...prev, name]);
    setCustom("");
  }

  async function save() {
    if (selected.length === 0) {
      push({ tone: "warn", title: "Escolha pelo menos um aparelho" });
      return;
    }
    setSaving(true);
    const ordered = options.filter((o) => selected.includes(o));
    const ok = await updateSettings({ cardioEquipment: ordered });
    setSaving(false);
    if (ok) push({ tone: "success", title: "Aparelhos de cardio salvos", description: "Eles aparecem no cardio das fichas de treino." });
  }

  return (
    <section className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
          <HeartPulse className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="text-[14px] font-bold tracking-[-0.005em] text-ink-900">Aparelhos de cardio</h2>
          <p className="text-[11.5px] text-ink-500">Os que a academia tem. Aparecem como opção no cardio das fichas.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {options.map((name) => {
          const on = selected.includes(name);
          const isCustom = !DEFAULT_CARDIO_EQUIPMENT.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(name)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                on ? "border-brand bg-brand text-white" : "border-ink-200 bg-white text-ink-600 hover:border-ink-400",
              )}
            >
              {on ? <Check className="h-3 w-3" strokeWidth={3} /> : isCustom ? <X className="h-3 w-3" strokeWidth={2.4} /> : null}
              {name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.slice(0, 40))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Outro aparelho (ex.: Simulador de escada)"
          className={cn(inputClass, "flex-1")}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-btn border border-ink-200 px-3 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-400 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          Adicionar
        </button>
      </div>

      {dirty && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-btn bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar aparelhos"}
          </button>
        </div>
      )}
    </section>
  );
}
