"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveWorkout } from "@/lib/actions";

type Exercise = { id: number; name: string; category: string };
type SetRow = { reps: string; weight: string };
type Block = { key: number; exerciseId: number | ""; target?: string; sets: SetRow[] };
type Previous = Record<number, { date: string; sets: { reps: number; weight: number }[] }>;

export type DayTemplate = {
  id: number;
  name: string;
  items: { exerciseId: number; sets: number; reps: string; load: string | null }[];
};

let nextKey = 1;

function fmt(n: number) {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
}

function firstNumber(reps: string) {
  const m = reps.match(/\d+/);
  return m ? m[0] : "";
}

function fromDay(day: DayTemplate | undefined, previous: Previous): Block[] {
  if (!day) return [{ key: nextKey++, exerciseId: "", sets: [{ reps: "", weight: "" }] }];
  return day.items.map((it) => {
    const prev = previous[it.exerciseId]?.sets ?? [];
    return {
      key: nextKey++,
      exerciseId: it.exerciseId,
      target: `${it.sets} × ${it.reps}${it.load ? ` · ${it.load}` : ""}`,
      sets: Array.from({ length: it.sets }, (_, i) => ({
        reps: firstNumber(it.reps),
        weight: prev[i] ? fmt(prev[i].weight) : prev.length ? fmt(prev[prev.length - 1].weight) : "",
      })),
    };
  });
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Opslaan…" : "Training opslaan"}
    </button>
  );
}

export function WorkoutForm({
  clientId,
  exercises,
  days,
  initialDayId,
  previous,
  defaultDate,
}: {
  clientId: number;
  exercises: Exercise[];
  days: DayTemplate[];
  initialDayId?: number;
  previous: Previous;
  defaultDate: string;
}) {
  const initialDay = days.find((d) => d.id === initialDayId);
  const [dayId, setDayId] = useState<number | "">(initialDay?.id ?? "");
  const [title, setTitle] = useState(initialDay?.name ?? "Training");
  const [blocks, setBlocks] = useState<Block[]>(() => fromDay(initialDay, previous));
  const [state, action] = useFormState(saveWorkout, {});

  const byCategory = useMemo(() => {
    const m = new Map<string, Exercise[]>();
    for (const e of exercises) m.set(e.category, [...(m.get(e.category) ?? []), e]);
    return [...m.entries()];
  }, [exercises]);

  const payload = JSON.stringify(
    blocks
      .filter((b) => b.exerciseId !== "")
      .map((b) => ({
        exerciseId: b.exerciseId,
        sets: b.sets
          .map((s) => ({ reps: parseInt(s.reps, 10) || 0, weight: Number(s.weight.replace(",", ".")) || 0 }))
          .filter((s) => s.reps > 0),
      })),
  );

  function pickDay(v: string) {
    const id = v ? Number(v) : "";
    setDayId(id);
    const d = days.find((x) => x.id === id);
    setBlocks(fromDay(d, previous));
    setTitle(d?.name ?? "Training");
  }

  function update(key: number, fn: (b: Block) => Block) {
    setBlocks((bs) => bs.map((b) => (b.key === key ? fn(b) : b)));
  }

  return (
    <form action={action} className="stack">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="payload" value={payload} />
      <input type="hidden" name="programDayId" value={dayId} />

      <section className="card">
        <div className="field-row">
          {days.length > 0 && (
            <label className="field">
              <span className="label">Schemadag</span>
              <select value={dayId} onChange={(e) => pickDay(e.target.value)}>
                <option value="">Vrije training</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Naam</span>
            <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </label>
          <label className="field">
            <span className="label">Datum</span>
            <input name="date" type="date" defaultValue={defaultDate} max={defaultDate} required />
          </label>
        </div>
      </section>

      {blocks.map((b, bi) => {
        const prev = b.exerciseId !== "" ? previous[b.exerciseId] : undefined;
        return (
          <section key={b.key} className="ex-block" style={{ background: "var(--surface-000)" }}>
            <div className="ex-head">
              <span className="label" style={{ minWidth: 24 }}>{bi + 1}</span>
              <select
                aria-label={`Oefening ${bi + 1}`}
                value={b.exerciseId}
                onChange={(e) => update(b.key, (x) => ({ ...x, exerciseId: e.target.value ? Number(e.target.value) : "" }))}
              >
                <option value="">Kies een oefening…</option>
                {byCategory.map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))}
                aria-label={`Oefening ${bi + 1} verwijderen`}
              >
                Verwijder
              </button>
            </div>
            {(b.target || prev) && (
              <p className="target">
                {b.target && <>Schema: <b>{b.target}</b></>}
                {b.target && prev && " · "}
                {prev && <>Vorige keer: {prev.sets.map((s) => `${s.reps}×${fmt(s.weight)}`).join(", ")} kg</>}
              </p>
            )}
            <div className="set-row">
              <span className="label">Set</span>
              <span className="label" style={{ textAlign: "left" }}>Reps</span>
              <span className="label" style={{ textAlign: "left" }}>Kg</span>
              <span />
            </div>
            {b.sets.map((s, si) => (
              <div className="set-row" key={si}>
                <span className="label">{si + 1}</span>
                <input
                  className="compact"
                  inputMode="numeric"
                  aria-label={`Reps set ${si + 1}`}
                  value={s.reps}
                  onChange={(e) =>
                    update(b.key, (x) => ({ ...x, sets: x.sets.map((y, i) => (i === si ? { ...y, reps: e.target.value } : y)) }))
                  }
                />
                <input
                  className="compact"
                  inputMode="decimal"
                  aria-label={`Kilo set ${si + 1}`}
                  value={s.weight}
                  onChange={(e) =>
                    update(b.key, (x) => ({ ...x, sets: x.sets.map((y, i) => (i === si ? { ...y, weight: e.target.value } : y)) }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Set ${si + 1} verwijderen`}
                  onClick={() => update(b.key, (x) => ({ ...x, sets: x.sets.filter((_, i) => i !== si) }))}
                >
                  ×
                </button>
              </div>
            ))}
            <div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  update(b.key, (x) => ({
                    ...x,
                    sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: "", weight: "" }) }],
                  }))
                }
              >
                + Set
              </button>
            </div>
          </section>
        );
      })}

      <div>
        <button
          type="button"
          className="btn"
          onClick={() => setBlocks((bs) => [...bs, { key: nextKey++, exerciseId: "", sets: [{ reps: "", weight: "" }] }])}
        >
          + Oefening toevoegen
        </button>
      </div>

      <section className="card">
        <div className="field-row">
          <label className="field">
            <span className="label">Zwaarte (RPE 1–10)</span>
            <select name="rpe" defaultValue="">
              <option value="">–</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="label">Notities</span>
          <textarea name="notes" maxLength={2000} placeholder="Hoe ging het? Pijn, energie, techniek…" />
        </label>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <div className="actions">
          <Submit />
        </div>
      </section>
    </form>
  );
}
