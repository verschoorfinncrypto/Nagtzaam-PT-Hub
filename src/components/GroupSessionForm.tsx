"use client";

import { Fragment, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { logGroupSession } from "@/lib/actions";
import { SECTION_LABEL, type Section } from "@/lib/sections";

type Item = { exerciseId: number; exerciseName: string; section: string; sets: number; reps: string; load: string | null };
type Day = { id: number; name: string; items: Item[] };
type Member = { id: number; name: string };
type Cell = { sets: string; reps: string; weight: string };

function firstNumber(s: string) {
  return s.match(/\d+/)?.[0] ?? "";
}
function prescribedKg(load: string | null) {
  const m = load?.trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
  return m ? m[1].replace(".", ",") : null;
}
function fmt(n: number) {
  return n.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
}

function Submit({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending || count === 0}>
      {pending ? "Opslaan…" : `Sessie opslaan voor ${count} ${count === 1 ? "deelnemer" : "deelnemers"}`}
    </button>
  );
}

export function GroupSessionForm({
  groupId,
  days,
  members,
  previous,
  defaultDate,
}: {
  groupId: number;
  days: Day[];
  members: Member[];
  /** Laatste gewicht per cliënt per oefening. */
  previous: Record<number, Record<number, number>>;
  defaultDate: string;
}) {
  const [dayId, setDayId] = useState(days[0]?.id ?? 0);
  const day = days.find((d) => d.id === dayId) ?? days[0];
  const [present, setPresent] = useState<Set<number>>(() => new Set(members.map((m) => m.id)));
  const [pain, setPain] = useState<Record<number, string>>({});
  const initCells = (d: Day | undefined) => {
    const c: Record<string, Cell> = {};
    for (const it of d?.items ?? [])
      for (const m of members) {
        const prev = previous[m.id]?.[it.exerciseId];
        c[`${it.exerciseId}:${m.id}`] = { sets: String(it.sets), reps: firstNumber(it.reps), weight: prescribedKg(it.load) ?? (prev != null ? fmt(prev) : "") };
      }
    return c;
  };
  const [cells, setCells] = useState<Record<string, Cell>>(() => initCells(day));
  const [state, action] = useFormState(logGroupSession, {});
  const here = members.filter((m) => present.has(m.id));

  const payload = useMemo(
    () =>
      JSON.stringify(
        here.map((m) => ({
          clientId: m.id,
          pain: pain[m.id] !== undefined && pain[m.id] !== "" ? Number(pain[m.id]) : null,
          exercises: (day?.items ?? []).map((it) => {
            const c = cells[`${it.exerciseId}:${m.id}`] ?? { sets: "0", reps: "0", weight: "0" };
            return { exerciseId: it.exerciseId, sets: parseInt(c.sets, 10) || 0, reps: parseInt(c.reps, 10) || 0, weight: Number(c.weight.replace(",", ".")) || 0 };
          }),
        })),
      ),
    [here, pain, day, cells],
  );

  const setCell = (key: string, patch: Partial<Cell>) => setCells((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
  /** Waarde van de eerste aanwezige doorzetten naar alle anderen bij deze oefening. */
  const copyDown = (exerciseId: number, field: keyof Cell) => {
    const first = here[0];
    if (!first) return;
    const v = cells[`${exerciseId}:${first.id}`]?.[field] ?? "";
    setCells((c) => {
      const n = { ...c };
      for (const m of here) n[`${exerciseId}:${m.id}`] = { ...n[`${exerciseId}:${m.id}`], [field]: v };
      return n;
    });
  };

  return (
    <form
      action={action}
      className="stack"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="dayId" value={day?.id ?? ""} />
      <input type="hidden" name="payload" value={payload} />

      <section className="card">
        <div className="field-row">
          {days.length > 1 && (
            <label className="field">
              <span className="label">Schemadag</span>
              <select
                value={dayId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setDayId(id);
                  setCells(initCells(days.find((d) => d.id === id)));
                }}
              >
                {days.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Datum</span>
            <input name="date" type="date" defaultValue={defaultDate} max={defaultDate} required />
          </label>
        </div>
        <fieldset className="copy-group">
          <legend className="label">Aanwezig ({here.length} van {members.length})</legend>
          <div className="attendance">
            {members.map((m) => (
              <label key={m.id} className="copy-row">
                <input
                  type="checkbox"
                  checked={present.has(m.id)}
                  onChange={(e) =>
                    setPresent((p) => {
                      const n = new Set(p);
                      if (e.target.checked) n.add(m.id);
                      else n.delete(m.id);
                      return n;
                    })
                  }
                />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {(day?.items ?? []).map((it, idx, arr) => (
        <Fragment key={`${it.exerciseId}-${idx}`}>
          {(idx === 0 || arr[idx - 1].section !== it.section) && arr.some((x) => x.section !== "main") && (
            <h2 className="label section-heading">{SECTION_LABEL[it.section as Section] ?? "Hoofdblok"}</h2>
          )}
          <section className="card">
            <div className="card-head">
              <h3 className="h2">{it.exerciseName}</h3>
              <span className="body-sm muted">schema: {it.sets} × {it.reps}{it.load ? ` · ${it.load}` : ""}</span>
            </div>
            {here.length === 0 ? (
              <p className="hint">Vink eerst aanwezigen aan.</p>
            ) : (
              <div className="table-wrap">
                <table className="group-grid">
                  <thead>
                    <tr>
                      <th>Deelnemer</th>
                      <th>Sets</th>
                      <th>Reps</th>
                      <th>Kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {here.map((m, mi) => {
                      const key = `${it.exerciseId}:${m.id}`;
                      const c = cells[key] ?? { sets: "", reps: "", weight: "" };
                      return (
                        <tr key={m.id}>
                          <td>{m.name}</td>
                          <td><input className="compact" style={{ width: 60 }} inputMode="numeric" aria-label={`Sets ${m.name}`} value={c.sets} onChange={(e) => setCell(key, { sets: e.target.value })} /></td>
                          <td><input className="compact" style={{ width: 72 }} inputMode="numeric" aria-label={`Reps ${m.name}`} value={c.reps} onChange={(e) => setCell(key, { reps: e.target.value })} /></td>
                          <td>
                            <input className="compact" style={{ width: 84 }} inputMode="decimal" aria-label={`Kg ${m.name}`} value={c.weight} onChange={(e) => setCell(key, { weight: e.target.value })} />
                            {mi === 0 && here.length > 1 && (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => copyDown(it.exerciseId, "weight")} title="Zelfde kg voor iedereen">
                                ↓ voor iedereen
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Fragment>
      ))}

      {here.length > 0 && (
        <section className="card">
          <h2 className="h2">Pijn na de sessie (optioneel)</h2>
          <div className="measure-grid">
            {here.map((m) => (
              <label key={m.id} className="field">
                <span className="label">{m.name}</span>
                <select value={pain[m.id] ?? ""} onChange={(e) => setPain((p) => ({ ...p, [m.id]: e.target.value }))}>
                  <option value="">–</option>
                  {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {state.error && <p className="error" role="alert">{state.error}</p>}
      <div className="actions">
        <Submit count={here.length} />
        <span className="hint">Elke aanwezige krijgt deze training in zijn eigen historie, met PR&apos;s en volume.</span>
      </div>
    </form>
  );
}
