"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveProgram } from "@/lib/actions";
import { ExerciseDatalist, ExercisePicker, type PickerExercise } from "./ExercisePicker";

type Exercise = PickerExercise;
type Item = { key: number; exerciseId: number | ""; sets: string; reps: string; load: string; notes: string };
type Day = { key: number; name: string; items: Item[] };

export type ProgramInit = {
  name: string;
  notes: string;
  days: { name: string; items: { exerciseId: number; sets: number; reps: string; load: string | null; notes: string | null }[] }[];
};

let k = 1;
const emptyItem = (): Item => ({ key: k++, exerciseId: "", sets: "3", reps: "8", load: "", notes: "" });

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Opslaan…" : "Schema opslaan en activeren"}
    </button>
  );
}

export function ProgramBuilder({ clientId, exercises, initial }: { clientId: number; exercises: Exercise[]; initial?: ProgramInit }) {
  const [days, setDays] = useState<Day[]>(() =>
    initial?.days.length
      ? initial.days.map((d) => ({
          key: k++,
          name: d.name,
          items: d.items.map((it) => ({
            key: k++,
            exerciseId: it.exerciseId,
            sets: String(it.sets),
            reps: it.reps,
            load: it.load ?? "",
            notes: it.notes ?? "",
          })),
        }))
      : [{ key: k++, name: "Dag A", items: [emptyItem()] }],
  );
  const [state, action] = useFormState(saveProgram, {});

  const payload = JSON.stringify(
    days.map((d) => ({
      name: d.name,
      items: d.items
        .filter((i) => i.exerciseId !== "")
        .map((i) => ({
          exerciseId: i.exerciseId,
          sets: parseInt(i.sets, 10) || 1,
          reps: i.reps,
          load: i.load || undefined,
          notes: i.notes || undefined,
        })),
    })),
  );

  const setDay = (key: number, fn: (d: Day) => Day) => setDays((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));
  const setItem = (dk: number, ik: number, patch: Partial<Item>) =>
    setDay(dk, (d) => ({ ...d, items: d.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) }));

  return (
    <form action={action} className="stack">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="payload" value={payload} />
      <ExerciseDatalist id="exercise-list" exercises={exercises} />
      <section className="card">
        <label className="field">
          <span className="label">Naam van het schema</span>
          <input name="name" defaultValue={initial?.name ?? ""} placeholder="Bijv. Opbouw knie, blok 1" required maxLength={120} />
        </label>
        <label className="field">
          <span className="label">Toelichting voor de cliënt (optioneel)</span>
          <textarea name="notes" defaultValue={initial?.notes ?? ""} maxLength={2000} placeholder="Doel van dit blok, hoe vaak per week, waar op letten…" />
        </label>
      </section>

      {days.map((d, di) => (
        <section key={d.key} className="card">
          <div className="ex-head">
            <input
              aria-label={`Naam dag ${di + 1}`}
              value={d.name}
              onChange={(e) => setDay(d.key, (x) => ({ ...x, name: e.target.value }))}
              style={{ fontWeight: 600, fontSize: 18 }}
            />
            {days.length > 1 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDays((ds) => ds.filter((x) => x.key !== d.key))}>
                Dag verwijderen
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th style={{ minWidth: 200 }}>Oefening</th><th>Sets</th><th>Reps</th><th>Belasting</th><th>Notitie</th><th aria-label="Acties" /></tr>
              </thead>
              <tbody>
                {d.items.map((it, ii) => (
                  <tr key={it.key}>
                    <td>
                      <ExercisePicker
                        compact
                        listId="exercise-list"
                        exercises={exercises}
                        ariaLabel={`Oefening ${ii + 1}`}
                        value={it.exerciseId}
                        onChange={(id) => setItem(d.key, it.key, { exerciseId: id })}
                      />
                    </td>
                    <td><input className="compact" style={{ width: 64 }} inputMode="numeric" aria-label="Sets" value={it.sets} onChange={(e) => setItem(d.key, it.key, { sets: e.target.value })} /></td>
                    <td><input className="compact" style={{ width: 80 }} aria-label="Reps" value={it.reps} onChange={(e) => setItem(d.key, it.key, { reps: e.target.value })} placeholder="8-10" /></td>
                    <td><input className="compact" style={{ width: 110 }} aria-label="Belasting" value={it.load} onChange={(e) => setItem(d.key, it.key, { load: e.target.value })} placeholder="RPE 7 / 60 kg" /></td>
                    <td><input className="compact" aria-label="Notitie" value={it.notes} onChange={(e) => setItem(d.key, it.key, { notes: e.target.value })} placeholder="Tempo 3-1-1" /></td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label="Oefening verwijderen" onClick={() => setDay(d.key, (x) => ({ ...x, items: x.items.filter((i) => i.key !== it.key) }))}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button type="button" className="btn btn-sm" onClick={() => setDay(d.key, (x) => ({ ...x, items: [...x.items, emptyItem()] }))}>
              + Oefening
            </button>
          </div>
        </section>
      ))}

      {days.length < 7 && (
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => setDays((ds) => [...ds, { key: k++, name: `Dag ${String.fromCharCode(65 + ds.length)}`, items: [emptyItem()] }])}
          >
            + Trainingsdag
          </button>
        </div>
      )}

      {state.error && <p className="error" role="alert">{state.error}</p>}
      <div className="actions">
        <Submit />
        <span className="hint">Het vorige actieve schema wordt gearchiveerd; gelogde trainingen blijven bewaard.</span>
      </div>
    </form>
  );
}
