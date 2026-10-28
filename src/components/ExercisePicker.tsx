"use client";

import { useEffect, useState } from "react";

export type PickerExercise = {
  id: number;
  name: string;
  category: string;
  region: string | null;
  purpose: string | null;
  cues: string | null;
};

const PURPOSE_LABEL: Record<string, string> = { revalidatie: "Revalidatie", kracht: "Kracht", beide: "Reva + kracht" };

/** Eén gedeelde lijst met suggesties; zet hem één keer per formulier neer. */
export function ExerciseDatalist({ id, exercises }: { id: string; exercises: PickerExercise[] }) {
  return (
    <datalist id={id}>
      {exercises.map((e) => (
        <option key={e.id} value={e.name}>
          {[e.category, e.region, e.purpose ? PURPOSE_LABEL[e.purpose] : null].filter(Boolean).join(" · ")}
        </option>
      ))}
    </datalist>
  );
}

/** Tekstveld met suggesties: typ een deel van de naam en kies uit de lijst. */
export function ExercisePicker({
  listId,
  exercises,
  value,
  onChange,
  ariaLabel,
  compact,
}: {
  listId: string;
  exercises: PickerExercise[];
  value: number | "";
  onChange: (id: number | "") => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const nameOf = (id: number | "") => (id === "" ? "" : exercises.find((e) => e.id === id)?.name ?? "");
  const [text, setText] = useState(nameOf(value));
  useEffect(() => {
    // Volg externe wijzigingen (bijv. een andere schemadag kiezen).
    if (value !== "" && nameOf(value) !== text) setText(nameOf(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const match = (t: string) => exercises.find((e) => e.name.toLowerCase() === t.trim().toLowerCase());
  const invalid = text.trim() !== "" && !match(text);

  return (
    <input
      className={compact ? "compact" : undefined}
      list={listId}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      placeholder="Typ om te zoeken…"
      value={text}
      autoComplete="off"
      style={invalid ? { borderColor: "var(--alert)" } : undefined}
      onChange={(e) => {
        setText(e.target.value);
        const m = match(e.target.value);
        onChange(m ? m.id : "");
      }}
      onBlur={() => {
        const m = match(text);
        if (m) setText(m.name);
      }}
    />
  );
}
