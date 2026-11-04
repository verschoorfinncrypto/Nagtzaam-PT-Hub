import Link from "next/link";
import { addWeight, deleteWeight, updateBodyProfile } from "@/lib/actions";
import { kg, shortDate, today } from "@/lib/format";
import { assess, LEVEL_TAG, LOWER_IS_BETTER, METRICS, type MetricKey, type Sex } from "@/lib/markers";
import { ActionForm } from "./ActionForm";
import { LineChart } from "./charts";

export type MeasurementRow = { id: number; date: string; note: string | null } & Partial<Record<MetricKey, number | null>>;
type Profile = { id: number; sex: string | null; birthYear: number | null; heightCm: number | null };

function ctxOf(p: Profile) {
  const age = p.birthYear ? Number(today().slice(0, 4)) - p.birthYear : null;
  return { sex: (p.sex === "m" || p.sex === "v" ? p.sex : null) as Sex | null, age, heightCm: p.heightCm };
}

function fmt(key: MetricKey, v: number) {
  const m = METRICS.find((x) => x.key === key)!;
  return `${kg(v, m.step === "1" ? 0 : 1)}${m.unit ? ` ${m.unit}` : ""}`;
}

/** Laatste en vorige waarde per meting (rijen oud → nieuw). */
function latest(rows: MeasurementRow[], key: MetricKey) {
  const withVal = rows.filter((r) => r[key] != null);
  const last = withVal[withVal.length - 1];
  const prev = withVal[withVal.length - 2];
  return last ? { value: last[key] as number, date: last.date, prev: prev ? (prev[key] as number) : null } : null;
}

export function MeasurementForm({ clientId }: { clientId: number }) {
  const scale = METRICS.filter((m) => m.group === "Weegschaal");
  const tape = METRICS.filter((m) => m.group === "Omtrek");
  const field = (m: (typeof METRICS)[number]) => (
    <label key={m.key} className="field">
      <span className="label">{m.label}{m.unit ? ` (${m.unit})` : ""}</span>
      <input name={m.key === "weightKg" ? "weight" : m.key} inputMode="decimal" placeholder={m.key === "weightKg" ? "82,4" : ""} />
    </label>
  );
  return (
    <ActionForm action={addWeight} submitLabel="Meting opslaan" resetOnOk>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field-row">
        {field(scale[0])}
        <label className="field">
          <span className="label">Datum</span>
          <input name="date" type="date" defaultValue={today()} max={today()} required />
        </label>
      </div>
      <details className="more-fields" open>
        <summary>Alle waarden van de weegschaal</summary>
        <div className="measure-grid">{scale.slice(1).map(field)}</div>
      </details>
      <details className="more-fields">
        <summary>Omtrekken (meetlint)</summary>
        <div className="measure-grid">{tape.map(field)}</div>
      </details>
      <label className="field">
        <span className="label">Notitie (optioneel)</span>
        <input name="note" maxLength={200} placeholder="Bijv. nuchter gewogen, Tanita BC-545" />
      </label>
      <p className="hint">Vul in wat je hebt; lege velden worden overgeslagen. Een tweede meting op dezelfde dag vult de eerste aan. BMI rekent de hub zelf uit als je lengte bekend is.</p>
    </ActionForm>
  );
}

export function BodyProfileForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={updateBodyProfile} submitLabel="Opslaan" submitClass="btn btn-sm">
      <input type="hidden" name="clientId" value={profile.id} />
      <div className="field-row">
        <label className="field">
          <span className="label">Geslacht</span>
          <select name="sex" defaultValue={profile.sex ?? ""}>
            <option value="">–</option>
            <option value="v">Vrouw</option>
            <option value="m">Man</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Geboortejaar</span>
          <input name="birthYear" inputMode="numeric" defaultValue={profile.birthYear ?? ""} placeholder="1985" />
        </label>
        <label className="field">
          <span className="label">Lengte (cm)</span>
          <input name="heightCm" inputMode="decimal" defaultValue={profile.heightCm ?? ""} placeholder="178" />
        </label>
      </div>
      <p className="hint">Nodig voor BMI en om te bepalen wat gezond is: vetpercentage hangt af van leeftijd en geslacht, buikomtrek van geslacht.</p>
    </ActionForm>
  );
}

/** Laatste waarde per meting met marker, referentie en verschil met de vorige keer. */
export function MeasurementSummary({ rows, profile }: { rows: MeasurementRow[]; profile: Profile }) {
  const ctx = ctxOf(profile);
  const items = METRICS.map((m) => ({ m, l: latest(rows, m.key) })).filter((x) => x.l);
  if (!items.length) return <div className="empty">Nog geen metingen.</div>;
  return (
    <div className="measure-summary">
      {items.map(({ m, l }) => {
        const mk = assess(m.key, l!.value, ctx);
        const diff = l!.prev != null ? Math.round((l!.value - l!.prev) * 10) / 10 : null;
        const better = diff == null || diff === 0 ? null : LOWER_IS_BETTER[m.key] ? diff < 0 : null;
        return (
          <div key={m.key} className="measure-item">
            <span className="label">{m.label}</span>
            <span className="metric">{fmt(m.key, l!.value)}</span>
            <span className="body-sm muted">
              {shortDate(l!.date)}
              {diff != null && diff !== 0 && (
                <>
                  {" · "}
                  <span className={better === true ? "positive" : better === false ? "alert" : undefined}>
                    {diff > 0 ? "+" : "−"}
                    {kg(Math.abs(diff), m.step === "1" ? 0 : 1)}
                  </span>{" "}
                  t.o.v. vorige
                </>
              )}
            </span>
            {mk && (
              <span className="measure-marker">
                <span className={LEVEL_TAG[mk.level]}>{mk.label}</span>
                {mk.range && <span className="body-sm muted"> gezond: {mk.range}</span>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Grafiek voor één meting met keuzeknoppen. */
export function MeasurementChart({ rows, metric, baseHref }: { rows: MeasurementRow[]; metric?: string; baseHref: string }) {
  const available = METRICS.filter((m) => rows.some((r) => r[m.key] != null));
  if (!available.length) return null;
  const sel = available.find((m) => m.key === metric) ?? available[0];
  const sep = baseHref.includes("?") ? "&" : "?";
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="h2">{sel.label}</h2>
        <span className="body-sm muted">verloop</span>
      </div>
      <LineChart
        unit={sel.unit}
        label={`Verloop ${sel.label}`}
        points={rows.filter((r) => r[sel.key] != null).map((r) => ({ date: r.date, value: r[sel.key] as number }))}
      />
      {available.length > 1 && (
        <div className="actions">
          {available.map((m) => (
            <Link key={m.key} href={`${baseHref}${sep}m=${m.key}`} scroll={false} className={m.key === sel.key ? "tag tag-accent filter-chip" : "tag filter-chip"}>
              {m.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function MeasurementTable({ rows, profile }: { rows: MeasurementRow[]; profile: Profile }) {
  if (!rows.length) return null;
  const ctx = ctxOf(profile);
  const cols = METRICS.filter((m) => rows.some((r) => r[m.key] != null));
  const list = [...rows].reverse();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            {cols.map((c) => <th key={c.key}>{c.label}</th>)}
            <th>Notitie</th>
            <th aria-label="Acties" />
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td style={{ whiteSpace: "nowrap" }}>{shortDate(r.date)}</td>
              {cols.map((c) => {
                const v = r[c.key];
                const mk = v != null ? assess(c.key, v, ctx) : null;
                return (
                  <td key={c.key} style={{ whiteSpace: "nowrap" }}>
                    {v != null ? fmt(c.key, v) : <span className="muted">–</span>}
                    {mk && mk.level !== "good" && mk.level !== "info" && <span className="dot-alert" title={mk.label} aria-label={mk.label} />}
                  </td>
                );
              })}
              <td className="muted">{r.note}</td>
              <td style={{ textAlign: "right" }}>
                <form action={deleteWeight}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn-ghost btn-sm" type="submit" aria-label={`Meting ${shortDate(r.date)} verwijderen`}>Verwijder</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint" style={{ marginTop: 8 }}>
        <span className="dot-alert" /> = buiten de gezonde referentie. Referentiewaarden zijn indicatief (WHO; vetpercentage volgens Gallagher e.a. 2000; visceraal vet en vocht volgens Tanita/Omron) en geen diagnose.
      </p>
    </div>
  );
}

const HIGHER_IS_BETTER: Partial<Record<MetricKey, boolean>> = { muscleKg: true, waterPct: true };

/** Lichaamsvoortgang: per waarde eerste meting → laatste meting, plus grafiek van de gekozen waarde. */
export function BodyProgress({
  rows,
  metric,
  baseHref,
  form,
}: {
  rows: MeasurementRow[];
  metric?: string;
  baseHref: string;
  /** Formulier of link naast de grafiek (trainer: meting invoeren). */
  form?: React.ReactNode;
}) {
  const sep = baseHref.includes("?") ? "&" : "?";
  const series = METRICS.map((m) => {
    const pts = rows.filter((r) => r[m.key] != null).map((r) => ({ date: r.date, value: r[m.key] as number }));
    return { m, pts };
  }).filter((x) => x.pts.length > 0);
  const sel = series.find((x) => x.m.key === metric) ?? series[0];
  const fmt = (v: number, unit: string) => `${kg(v, unit === "kcal" || unit === "jaar" ? 0 : 1)}${unit ? ` ${unit}` : ""}`;

  return (
    <section className="card" id="lichaam">
      <div className="card-head">
        <h2 className="h2">Lichaamsvoortgang</h2>
        {rows.length > 0 && (
          <span className="body-sm muted">
            {rows.length} {rows.length === 1 ? "meting" : "metingen"} sinds {shortDate(rows[0].date)}
          </span>
        )}
      </div>
      <div className="grid grid-2">
        <div className="stack">
          {!sel ? (
            <div className="empty">Nog geen metingen. {form ? "Vul hiernaast de eerste meting in." : "Vul je eerste meting in bij Metingen."}</div>
          ) : (
            <>
              <div>
                <p className="label">{sel.m.label}</p>
                {sel.pts.length > 1 ? (
                  <ChangeLine first={sel.pts[0]} last={sel.pts[sel.pts.length - 1]} k={sel.m.key} unit={sel.m.unit} fmt={fmt} />
                ) : (
                  <p className="body-sm muted">Eén meting: {fmt(sel.pts[0].value, sel.m.unit)}. Na de volgende meting zie je hier de lijn.</p>
                )}
              </div>
              <LineChart unit={sel.m.unit} label={`Verloop ${sel.m.label}`} points={sel.pts} />
              {series.length > 1 && (
                <div className="actions">
                  {series.map(({ m }) => (
                    <Link key={m.key} href={`${baseHref}${sep}m=${m.key}#lichaam`} scroll={false} className={m.key === sel.m.key ? "tag tag-accent filter-chip" : "tag filter-chip"}>
                      {m.label}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {form && <div className="stack">{form}</div>}
      </div>
      {series.some((x) => x.pts.length > 1) && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Waarde</th><th>Start</th><th>Nu</th><th>Verschil</th></tr></thead>
            <tbody>
              {series.filter((x) => x.pts.length > 1).map(({ m, pts }) => {
                const a = pts[0], b = pts[pts.length - 1];
                const d = Math.round((b.value - a.value) * 10) / 10;
                const good = d === 0 ? null : LOWER_IS_BETTER[m.key] ? d < 0 : HIGHER_IS_BETTER[m.key] ? d > 0 : null;
                return (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>{fmt(a.value, m.unit)} <span className="muted body-sm">{shortDate(a.date)}</span></td>
                    <td>{fmt(b.value, m.unit)} <span className="muted body-sm">{shortDate(b.date)}</span></td>
                    <td className={good == null ? "" : good ? "positive" : "alert"}>{d > 0 ? "+" : d < 0 ? "−" : "±"}{fmt(Math.abs(d), m.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ChangeLine({ first, last, k, unit, fmt }: { first: { date: string; value: number }; last: { date: string; value: number }; k: MetricKey; unit: string; fmt: (v: number, u: string) => string }) {
  const d = Math.round((last.value - first.value) * 10) / 10;
  const good = d === 0 ? null : LOWER_IS_BETTER[k] ? d < 0 : HIGHER_IS_BETTER[k] ? d > 0 : null;
  return (
    <p>
      <span className="metric">{fmt(last.value, unit)}</span>{" "}
      <span className={good == null ? "body-sm" : good ? "body-sm positive" : "body-sm alert"}>
        {d > 0 ? "+" : d < 0 ? "−" : "±"}{fmt(Math.abs(d), unit)} sinds {shortDate(first.date)}
      </span>
    </p>
  );
}
