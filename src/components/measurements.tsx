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
