"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { quickAddExercise, saveProgram } from "@/lib/actions";
import { ExercisePicker, type PickerExercise } from "./ExercisePicker";
import { GripIcon, useLongPressSort } from "./useLongPressSort";

type Exercise = PickerExercise;
type Item = {
  key: number;
  exerciseId: number | "";
  sets: string;
  reps: string;
  rpe: string;
  rest: string;
  load: string;
  notes: string;
  /** Getypte naam die nog niet in de database staat. */
  missing: string;
};
type Day = { key: number; name: string; items: Item[] };

export type ProgramInit = {
  name: string;
  notes: string;
  days: {
    name: string;
    items: {
      exerciseId: number;
      sets: number;
      reps: string;
      rpe: string | null;
      rest: string | null;
      load: string | null;
      notes: string | null;
    }[];
  }[];
};

let k = 1;
const emptyItem = (): Item => ({ key: k++, exerciseId: "", sets: "3", reps: "8", rpe: "", rest: "", load: "", notes: "", missing: "" });

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Opslaan…" : "Schema opslaan en activeren"}
    </button>
  );
}

/** tbody waarin rijen met de greep te verslepen zijn. */
function SortableBody({
  items,
  onReorder,
  children,
}: {
  items: Item[];
  onReorder: (next: Item[]) => void;
  children: (
    it: Item,
    index: number,
    sort: { handle: ReturnType<ReturnType<typeof useLongPressSort<Item>>["handleProps"]>; row: ReturnType<ReturnType<typeof useLongPressSort<Item>>["rowProps"]> },
  ) => React.ReactNode;
}) {
  const s = useLongPressSort(items, (i) => i.key, onReorder);
  return (
    <tbody ref={s.containerRef as React.RefObject<HTMLTableSectionElement>}>
      {items.map((it, i) => children(it, i, { handle: s.handleProps(it.key, `Oefening ${i + 1}`), row: s.rowProps(it.key) }))}
    </tbody>
  );
}

function QuickAdd({
  name,
  categories,
  onAdded,
}: {
  name: string;
  categories: string[];
  onAdded: (e: Exercise) => void;
}) {
  const [category, setCategory] = useState("Overig");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="quick-add">
      <span className="body-sm">
        <b>{name}</b> staat nog niet in de database.
      </span>
      <select className="compact" aria-label="Categorie nieuwe oefening" value={category} onChange={(e) => setCategory(e.target.value)}>
        {[...new Set([...categories, "Overig"])].map((c) => <option key={c}>{c}</option>)}
      </select>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const res = await quickAddExercise(name, category);
            if ("error" in res && res.error) setError(res.error);
            else if ("exercise" in res && res.exercise) onAdded(res.exercise);
          })
        }
      >
        {pending ? "Toevoegen…" : "+ Toevoegen"}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function ProgramBuilder({
  clients,
  meId,
  clientId,
  exercises: initialExercises,
  categories,
  initial,
  activeByClient,
  returnTo,
}: {
  clients: { id: number; name: string; trainerId: number | null; trainerName: string | null }[];
  meId: number;
  clientId?: number;
  exercises: Exercise[];
  categories: string[];
  initial?: ProgramInit;
  /** Naam van het actieve schema per cliënt, om te waarschuwen dat het wordt vervangen. */
  activeByClient: Record<number, string>;
  returnTo?: "schemas";
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [client, setClient] = useState<number | "">(clientId ?? "");
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
            rpe: it.rpe ?? "",
            rest: it.rest ?? "",
            load: it.load ?? "",
            notes: it.notes ?? "",
            missing: "",
          })),
        }))
      : [{ key: k++, name: "Dag A", items: [emptyItem()] }],
  );
  const [state, action] = useFormState(saveProgram, {});
  const clientName = clients.find((c) => c.id === client)?.name;
  const replaces = client !== "" ? activeByClient[client] : undefined;

  const payload = JSON.stringify(
    days.map((d) => ({
      name: d.name,
      items: d.items
        .filter((i) => i.exerciseId !== "")
        .map((i) => ({
          exerciseId: i.exerciseId,
          sets: parseInt(i.sets, 10) || 1,
          reps: i.reps,
          rpe: i.rpe || undefined,
          rest: i.rest || undefined,
          load: i.load || undefined,
          notes: i.notes || undefined,
        })),
    })),
  );
  const unresolved = days.some((d) => d.items.some((i) => i.missing && i.exerciseId === ""));

  const setDay = (key: number, fn: (d: Day) => Day) => setDays((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));
  const setItem = (dk: number, ik: number, patch: Partial<Item>) =>
    setDay(dk, (d) => ({ ...d, items: d.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) }));

  return (
    <form action={action} className="stack">
      <input type="hidden" name="clientId" value={client} />
      <input type="hidden" name="payload" value={payload} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <section className="card">
        <div className="field-row">
          <label className="field">
            <span className="label">Cliënt</span>
            <select value={client} onChange={(e) => setClient(e.target.value ? Number(e.target.value) : "")} required>
              <option value="">Kies een cliënt…</option>
              {clients.some((c) => c.trainerId === meId) && (
                <optgroup label="Mijn cliënten">
                  {clients.filter((c) => c.trainerId === meId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              <optgroup label="Overige cliënten">
                {clients.filter((c) => c.trainerId !== meId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.trainerName ?? "nog niet gekoppeld"}</option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="field">
            <span className="label">Naam van het schema</span>
            <input name="name" defaultValue={initial?.name ?? ""} placeholder="Bijv. Opbouw knie, blok 1" required maxLength={120} />
          </label>
        </div>
        {clientName && (
          <p className="hint">
            Schema voor <b>{clientName}</b>.{" "}
            {replaces ? (
              <>
                Vervangt het actieve schema &quot;{replaces}&quot;.{" "}
                {client !== clientId && <Link href={`/trainer/schemas/new?client=${client}`}>Dat schema laden om te bewerken</Link>}
              </>
            ) : (
              "Nog geen actief schema."
            )}
          </p>
        )}
        <label className="field">
          <span className="label">Toelichting voor de cliënt (optioneel)</span>
          <textarea name="notes" defaultValue={initial?.notes ?? ""} maxLength={2000} placeholder="Doel van dit blok, hoe vaak per week, waar op letten…" />
        </label>
        <p className="hint">
          Sets, reps, RPE en rust schrijf jij voor. Belasting is optioneel: laat je die leeg, dan vult de cliënt het gewicht in tijdens het trainen.
        </p>
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
            <table className="builder">
              <thead>
                <tr>
                  <th aria-label="Volgorde" />
                  <th style={{ minWidth: 220 }}>Oefening</th>
                  <th>Sets</th>
                  <th>Reps</th>
                  <th>RPE</th>
                  <th>Rust</th>
                  <th>Belasting <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optioneel)</span></th>
                  <th>Notitie</th>
                  <th aria-label="Acties" />
                </tr>
              </thead>
              <SortableBody items={d.items} onReorder={(items) => setDay(d.key, (x) => ({ ...x, items }))}>
                {(it, ii, sort) => (
                  <tr key={it.key} {...sort.row}>
                    <td className="grip-cell">
                      <button {...sort.handle}><GripIcon /></button>
                    </td>
                    <td>
                      <ExercisePicker
                        compact
                        exercises={exercises}
                        ariaLabel={`Oefening ${ii + 1}`}
                        value={it.exerciseId}
                        onChange={(id) => setItem(d.key, it.key, { exerciseId: id })}
                        onUnmatched={(text) => setItem(d.key, it.key, { missing: text.length >= 2 ? text : "" })}
                      />
                      {it.missing && it.exerciseId === "" && (
                        <QuickAdd
                          name={it.missing}
                          categories={categories}
                          onAdded={(ex) => {
                            setExercises((xs) => (xs.some((x) => x.id === ex.id) ? xs : [...xs, ex].sort((a, b) => a.name.localeCompare(b.name, "nl"))));
                            setItem(d.key, it.key, { exerciseId: ex.id, missing: "" });
                          }}
                        />
                      )}
                    </td>
                    <td><input className="compact" style={{ width: 56 }} inputMode="numeric" aria-label="Sets" value={it.sets} onChange={(e) => setItem(d.key, it.key, { sets: e.target.value })} /></td>
                    <td><input className="compact" style={{ width: 72 }} aria-label="Reps" value={it.reps} onChange={(e) => setItem(d.key, it.key, { reps: e.target.value })} placeholder="8-10" /></td>
                    <td><input className="compact" style={{ width: 60 }} inputMode="decimal" aria-label="RPE" value={it.rpe} onChange={(e) => setItem(d.key, it.key, { rpe: e.target.value })} placeholder="7" /></td>
                    <td><input className="compact" style={{ width: 76 }} aria-label="Rust" value={it.rest} onChange={(e) => setItem(d.key, it.key, { rest: e.target.value })} placeholder="90 s" /></td>
                    <td><input className="compact" style={{ width: 104 }} aria-label="Belasting" value={it.load} onChange={(e) => setItem(d.key, it.key, { load: e.target.value })} placeholder="cliënt kiest" /></td>
                    <td><input className="compact" style={{ minWidth: 120 }} aria-label="Notitie" value={it.notes} onChange={(e) => setItem(d.key, it.key, { notes: e.target.value })} placeholder="Tempo 3-1-1" /></td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label="Oefening verwijderen" onClick={() => setDay(d.key, (x) => ({ ...x, items: x.items.filter((i) => i.key !== it.key) }))}>×</button>
                    </td>
                  </tr>
                )}
              </SortableBody>
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

      {unresolved && <p className="error">Er staat nog een oefening die niet in de database staat. Voeg hem toe of kies een bestaande; anders wordt hij niet opgeslagen.</p>}
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <div className="actions">
        <Submit />
        <span className="hint">Het vorige actieve schema van deze cliënt wordt gearchiveerd; gelogde trainingen blijven bewaard.</span>
      </div>
    </form>
  );
}
