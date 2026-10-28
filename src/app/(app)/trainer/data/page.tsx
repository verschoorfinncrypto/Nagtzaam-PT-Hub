import Link from "next/link";
import { BarChart, LineChart } from "@/components/charts";
import { requireUser } from "@/lib/auth";
import { kg, shortDate } from "@/lib/format";
import { getPracticeStats } from "@/lib/stats";

export const metadata = { title: "Data" };

function pct(n: number, d: number) {
  if (!d) return "–";
  return `${Math.round((n / d) * 100)}%`;
}

function monthLabel(ym: string) {
  return new Date(ym + "-15T12:00:00").toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
}

function weekLabel(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default async function DataPage() {
  const me = await requireUser("trainer");
  const s = await getPracticeStats();
  const maxMonth = Math.max(1, ...s.months.map((m) => m.fysio + m.extern + m.onbekend));
  const lastWeek = s.weekSeries[s.weekSeries.length - 1];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="label">Fysiotherapie Nagtzaam · hele praktijk</p>
          <h1 className="h1">Data</h1>
          <p className="muted">Alle trainers en cliënten samen. Actief = minstens één training in de afgelopen 14 dagen.</p>
        </div>
      </div>

      {s.total === 0 ? (
        <div className="empty">Nog geen cliënten. Zodra er cliënten en trainingen zijn, verschijnen hier de cijfers.</div>
      ) : (
        <>
          <div className="grid grid-kpi">
            <div className="stat">
              <span className="label">Cliënten</span>
              <span className="metric">{s.total}</span>
              <span className="body-sm muted">{s.newThisMonth} nieuw deze maand</span>
            </div>
            <div className="stat">
              <span className="label">Actief (14 dagen)</span>
              <span>
                <span className="metric">{s.active14}</span>
                <span className="unit">{pct(s.active14, s.total)}</span>
              </span>
              <span className="body-sm muted">van alle cliënten</span>
            </div>
            <div className="stat">
              <span className="label">Vanuit fysio</span>
              <span>
                <span className="metric">{s.fysio}</span>
                <span className="unit">{pct(s.fysio, s.total)}</span>
              </span>
              <span className="body-sm muted">
                {s.extern} van buiten{s.unknownSource ? ` · ${s.unknownSource} onbekend` : ""}
              </span>
            </div>
            <div className="stat">
              <span className="label">Blijft trainen</span>
              <span>
                <span className="metric">{pct(s.retention.retained, s.retention.cohort)}</span>
              </span>
              <span className="body-sm muted">
                {s.retention.cohort
                  ? `${s.retention.retained} van ${s.retention.cohort} cliënten (4+ weken binnen) nog actief`
                  : "Nog geen cliënten die 4+ weken binnen zijn"}
              </span>
            </div>
            <div className="stat">
              <span className="label">Trainingen (30 dagen)</span>
              <span className="metric">{s.workouts30}</span>
              <span className="body-sm muted">{kg(s.perActivePerWeek, 1)} per actieve cliënt per week</span>
            </div>
            <div className="stat">
              <span className="label">Met schema</span>
              <span>
                <span className="metric">{s.withProgram}</span>
                <span className="unit">{pct(s.withProgram, s.total)}</span>
              </span>
              <span className="body-sm muted">{s.total - s.withProgram} zonder actief schema</span>
            </div>
            <div className="stat">
              <span className="label">PR&apos;s (30 dagen)</span>
              <span className="metric">{s.prs30}</span>
              <span className="body-sm muted">bij {s.prClients} {s.prClients === 1 ? "cliënt" : "cliënten"}</span>
            </div>
            <div className="stat">
              <span className="label">Houdt gewicht bij</span>
              <span>
                <span className="metric">{s.weightTracking}</span>
                <span className="unit">{pct(s.weightTracking, s.total)}</span>
              </span>
              <span className="body-sm muted">meting in de afgelopen 30 dagen</span>
            </div>
          </div>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head">
                <h2 className="h2">Trainingen per week</h2>
                <span className="body-sm muted">laatste 12 weken</span>
              </div>
              <BarChart
                label="Aantal trainingen per week, hele praktijk"
                format={(v) => String(Math.round(v))}
                bars={s.weekSeries.map((w, i) => ({
                  label: i % 2 === s.weekSeries.length % 2 ? "" : weekLabel(w.week),
                  value: w.workouts,
                  current: i === s.weekSeries.length - 1,
                }))}
              />
              <p className="body-sm muted">Deze week tot nu toe {lastWeek.workouts} trainingen.</p>
            </section>
            <section className="card">
              <div className="card-head">
                <h2 className="h2">Actieve cliënten per week</h2>
                <span className="body-sm muted">minstens 1 training</span>
              </div>
              <LineChart
                unit="cliënten"
                zero
                label="Aantal cliënten dat per week trainde"
                points={s.weekSeries.map((w) => ({ date: w.week, value: w.clients }))}
              />
              <p className="body-sm muted">Deze week trainden {lastWeek.clients} cliënten.</p>
            </section>
          </div>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head">
                <h2 className="h2">Nieuwe cliënten per maand</h2>
                <span className="body-sm muted">naar herkomst</span>
              </div>
              <div className="legend" aria-hidden="true">
                <span><i className="sw sw-fysio" /> Vanuit fysio</span>
                <span><i className="sw sw-extern" /> Van buiten</span>
                <span><i className="sw sw-onbekend" /> Onbekend</span>
              </div>
              <ul className="list months">
                {s.months.map((m) => {
                  const tot = m.fysio + m.extern + m.onbekend;
                  return (
                    <li key={m.month}>
                      <span className="months-label">{monthLabel(m.month)}</span>
                      <span className="months-bar" aria-hidden="true">
                        {m.fysio > 0 && <span className="sw-fysio" style={{ width: `${(m.fysio / maxMonth) * 100}%` }} />}
                        {m.extern > 0 && <span className="sw-extern" style={{ width: `${(m.extern / maxMonth) * 100}%` }} />}
                        {m.onbekend > 0 && <span className="sw-onbekend" style={{ width: `${(m.onbekend / maxMonth) * 100}%` }} />}
                      </span>
                      <span className="months-num body-sm">
                        <b>{tot}</b>
                        {tot > 0 && <span className="muted"> ({m.fysio} fysio)</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="card">
              <div className="card-head">
                <h2 className="h2">Meest getrainde oefeningen</h2>
                <span className="body-sm muted">30 dagen</span>
              </div>
              {s.topExercises.length === 0 ? (
                <div className="empty">Nog geen trainingen in de afgelopen 30 dagen.</div>
              ) : (
                <table>
                  <thead><tr><th>Oefening</th><th>Sets</th><th>Cliënten</th></tr></thead>
                  <tbody>
                    {s.topExercises.map((e) => (
                      <tr key={e.name}><td>{e.name}</td><td>{e.sets}</td><td>{e.clients}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h2 className="h2">Per trainer</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Trainer</th><th>Cliënten</th><th>Actief (14 d)</th><th>Trainingen (30 d)</th><th>Met schema</th></tr>
                </thead>
                <tbody>
                  {s.perTrainer.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}{t.id === me.id && <span className="muted"> (jij)</span>}</td>
                      <td>{t.clients}</td>
                      <td>{t.active14} <span className="muted">({pct(t.active14, t.clients)})</span></td>
                      <td>{t.workouts30}</td>
                      <td>{t.withProgram}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="h2">Aandacht nodig</h2>
              <span className="body-sm muted">14+ dagen niet getraind, of nog nooit</span>
            </div>
            {s.attention.length === 0 ? (
              <p className="notice">Iedereen heeft de afgelopen 14 dagen getraind.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Cliënt</th><th>Trainer</th><th>Laatste training</th><th>Dagen</th></tr></thead>
                  <tbody>
                    {s.attention.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.trainerId === me.id ? (
                            <Link href={`/trainer/clients/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                          )}
                        </td>
                        <td>{c.trainer}</td>
                        <td>{c.last ? shortDate(c.last) : <span className="tag tag-alert">Nog nooit</span>}</td>
                        <td>{c.days ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
