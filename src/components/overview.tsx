import Link from "next/link";
import { addWeight, deleteWeight } from "@/lib/actions";
import type { PR, ProgramWithDays } from "@/lib/data";
import { kg, shortDate, today } from "@/lib/format";
import { VideoButton } from "./VideoButton";

export const FEELING: Record<number, string> = { 1: "slecht", 2: "matig", 3: "oké", 4: "goed", 5: "top" };
import { SECTION_LABEL, type Section } from "@/lib/sections";
import { ActionForm } from "./ActionForm";
import { BarChart, LineChart } from "./charts";

type Weight = { id: number; date: string; weightKg: number | null; note: string | null };
type WeightRow = { id: number; date: string; weightKg: number; note: string | null };
const onlyWeights = (ws: Weight[]) => ws.filter((w): w is WeightRow => w.weightKg != null);

export function weightDelta(all: Weight[], days: number) {
  const weights = onlyWeights(all);
  if (weights.length < 2) return null;
  const last = weights[weights.length - 1];
  const from = new Date(last.date + "T12:00:00");
  from.setDate(from.getDate() - days);
  const fromIso = from.toISOString().slice(0, 10);
  const base = [...weights].reverse().find((w) => w.date <= fromIso) ?? weights[0];
  if (base.id === last.id) return null;
  return Math.round((last.weightKg - base.weightKg) * 10) / 10;
}

export function Delta({ value, suffix = "kg" }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="muted">–</span>;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return (
    <span className="num">
      {sign}
      {kg(Math.abs(value))} {suffix}
    </span>
  );
}

export function WeightForm({ clientId }: { clientId: number }) {
  return (
    <ActionForm action={addWeight} submitLabel="Gewicht opslaan" resetOnOk>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field-row">
        <label className="field">
          <span className="label">Gewicht (kg)</span>
          <input name="weight" inputMode="decimal" placeholder="82,4" required />
        </label>
        <label className="field">
          <span className="label">Datum</span>
          <input name="date" type="date" defaultValue={today()} max={today()} required />
        </label>
      </div>
      <label className="field">
        <span className="label">Notitie (optioneel)</span>
        <input name="note" maxLength={200} placeholder="Bijv. nuchter gewogen" />
      </label>
    </ActionForm>
  );
}

export function WeightCard({ weights: all, title = "Lichaamsgewicht" }: { weights: Weight[]; title?: string }) {
  const weights = onlyWeights(all);
  const last = weights[weights.length - 1];
  const d30 = weightDelta(weights, 30);
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="h2">{title}</h2>
        {last && <span className="body-sm muted">laatst {shortDate(last.date)}</span>}
      </div>
      {last && (
        <div className="actions" style={{ gap: 24 }}>
          <p>
            <span className="metric">{kg(last.weightKg)}</span>
            <span className="unit">kg</span>
          </p>
          <p className="body-sm">
            <span className="label">30 dagen</span>
            <br />
            <Delta value={d30} />
          </p>
        </div>
      )}
      <LineChart points={weights.map((w) => ({ date: w.date, value: w.weightKg }))} label="Verloop lichaamsgewicht" />
    </section>
  );
}

export function WeightTable({ weights: all }: { weights: Weight[] }) {
  const weights = onlyWeights(all);
  if (!weights.length) return null;
  const rows = [...weights].reverse();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Datum</th><th>Gewicht</th><th>Verschil</th><th>Notitie</th><th aria-label="Acties" /></tr>
        </thead>
        <tbody>
          {rows.map((w, i) => {
            const prev = rows[i + 1];
            const diff = prev ? Math.round((w.weightKg - prev.weightKg) * 10) / 10 : null;
            return (
              <tr key={w.id}>
                <td>{shortDate(w.date)}</td>
                <td><b>{kg(w.weightKg)}</b> kg</td>
                <td><Delta value={diff} /></td>
                <td className="muted">{w.note}</td>
                <td style={{ textAlign: "right" }}>
                  <form action={deleteWeight}>
                    <input type="hidden" name="id" value={w.id} />
                    <button className="btn btn-ghost btn-sm" type="submit" aria-label={`Meting ${shortDate(w.date)} verwijderen`}>Verwijder</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PRTable({ prs, limit, progressHref }: { prs: PR[]; limit?: number; progressHref?: (exerciseId: number) => string }) {
  if (!prs.length) return <div className="empty">Nog geen PR&apos;s. Log je eerste training met gewicht.</div>;
  const list = limit ? prs.slice(0, limit) : prs;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Oefening</th><th>Beste set</th><th>Geschatte 1RM</th><th>Zwaarste</th></tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.exerciseId}>
              <td>
                {progressHref ? <Link href={progressHref(p.exerciseId)}>{p.exerciseName}</Link> : p.exerciseName}{" "}
                {p.recent && <span className="tag tag-positive">Nieuw PR</span>}
              </td>
              <td>
                {kg(p.bestSet.weight)} kg × {p.bestSet.reps}
                <br />
                <span className="body-sm muted">{shortDate(p.bestSet.date)}</span>
              </td>
              <td><b>{kg(p.bestE1rm)}</b> kg</td>
              <td>{kg(p.heaviest.weight)} kg × {p.heaviest.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WeeklyCard({ weekly }: { weekly: { week: string; sessions: number; volume: number }[] }) {
  const cur = weekly[weekly.length - 1];
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="h2">Volume per week</h2>
        <span className="body-sm muted">kg × herhalingen</span>
      </div>
      <BarChart
        label="Trainingsvolume per week"
        bars={weekly.map((w, i) => ({
          label: new Date(w.week + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
          value: w.volume,
          current: i === weekly.length - 1,
        }))}
      />
      <p className="body-sm muted">
        Deze week {cur.sessions} {cur.sessions === 1 ? "training" : "trainingen"}, {kg(cur.volume, 0)} kg volume.
      </p>
    </section>
  );
}

export function ProgramDays({
  program,
  startHref,
}: {
  program: ProgramWithDays;
  startHref?: (dayId: number) => string;
}) {
  return (
    <div className="grid grid-2">
      {program.days.map((d) => (
        <section key={d.id} className="card">
          <div className="card-head">
            <h3 className="h2">{d.name}</h3>
            {startHref && (
              <Link href={startHref(d.id)} className="btn btn-primary btn-sm">Start training</Link>
            )}
          </div>
          <div className="table-wrap"><table>
            <thead>
              <tr><th>Oefening</th><th>Sets × reps</th><th>RPE</th><th>Rust</th><th>Pijngrens</th><th>Belasting</th></tr>
            </thead>
            <tbody>
              {d.items.map((it, idx) => [
                (idx === 0 || d.items[idx - 1].section !== it.section) && d.items.some((x) => x.section !== "main") ? (
                  <tr key={`h-${it.section}`} className={`section-row section-${it.section}`}>
                    <th colSpan={6}><span>{SECTION_LABEL[it.section as Section] ?? "Hoofdblok"}</span></th>
                  </tr>
                ) : null,
                <tr key={it.id}>
                  <td>
                    {it.exerciseName}
                    {it.notes && <><br /><span className="body-sm muted">{it.notes}</span></>}
                    <span className="ex-links">
                      <VideoButton name={it.exerciseName} videoUrl={it.videoUrl} />
                    </span>
                    {it.cues && (
                      <details className="cue">
                        <summary>Uitvoering</summary>
                        <p>{it.cues}</p>
                      </details>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{it.sets} × {it.reps}</td>
                  <td>{it.rpe || <span className="muted">–</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{it.rest || <span className="muted">–</span>}</td>
                  <td>{it.painLimit || <span className="muted">–</span>}</td>
                  <td>{it.load || <span className="muted">zelf kiezen</span>}</td>
                </tr>,
              ])}
            </tbody>
          </table></div>
        </section>
      ))}
    </div>
  );
}

export function RecentWorkouts({
  workouts,
}: {
  workouts: { id: number; date: string; title: string; sets: number; volume: number; rpe: number | null; pain?: number | null; feeling?: number | null }[];
}) {
  if (!workouts.length) return <div className="empty">Nog geen trainingen gelogd.</div>;
  return (
    <ul className="list">
      {workouts.map((w) => (
        <li key={w.id}>
          <Link href={`/workouts/${w.id}`}>
            <span className="h-link" style={{ fontWeight: 600 }}>{w.title}</span>
            <br />
            <span className="body-sm muted">
              {shortDate(w.date)} · {w.sets} sets{w.rpe ? ` · RPE ${w.rpe}` : ""}
              {w.pain != null && <> · <span className={w.pain >= 6 ? "alert" : undefined}>pijn {w.pain}/10</span></>}
              {w.feeling != null && <> · {FEELING[w.feeling]}</>}
            </span>
          </Link>
          <span className="num body-sm">{kg(w.volume, 0)} kg</span>
        </li>
      ))}
    </ul>
  );
}

/** Pijn en gevoel na de laatste trainingen, met signaal bij hoge pijn. */
export function CheckinCard({ checkins }: { checkins: { date: string; pain: number | null; feeling: number | null; rpe: number | null; title: string }[] }) {
  const withPain = checkins.filter((c) => c.pain != null);
  const last = checkins[checkins.length - 1];
  const recentHigh = checkins.slice(-3).some((c) => (c.pain ?? 0) >= 6);
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="h2">Check-in na training</h2>
        <span className="body-sm muted">pijn 0–10 · gevoel 1–5</span>
      </div>
      {!checkins.length ? (
        <div className="empty">Nog geen check-ins. Die vul je in onderaan het loggen van een training.</div>
      ) : (
        <>
          {recentHigh && <p className="notice notice-alert">Pijn 6 of hoger bij een van de laatste 3 trainingen. Bespreek de belasting.</p>}
          {last && (
            <p className="body-sm">
              Laatste ({shortDate(last.date)}): {last.pain != null ? <b>pijn {last.pain}/10</b> : "pijn –"}
              {last.feeling != null && <> · gevoel <b>{FEELING[last.feeling]}</b></>}
              {last.rpe != null && <> · RPE {last.rpe}</>}
            </p>
          )}
          {withPain.length > 1 && (
            <LineChart zero unit="/10" label="Pijn per training" points={withPain.map((c) => ({ date: c.date, value: c.pain as number }))} />
          )}
        </>
      )}
    </section>
  );
}
