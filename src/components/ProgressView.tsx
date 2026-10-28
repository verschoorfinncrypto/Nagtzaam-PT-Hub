import Link from "next/link";
import { getE1rmHistory, getPRs, getWeekly } from "@/lib/data";
import { kg } from "@/lib/format";
import { LineChart } from "./charts";
import { PRTable, WeeklyCard } from "./overview";

export async function ProgressView({ clientId, exerciseId, baseHref }: { clientId: number; exerciseId?: number; baseHref: string }) {
  const [prs, weekly] = await Promise.all([getPRs(clientId), getWeekly(clientId, 8)]);
  const selected = prs.find((p) => p.exerciseId === exerciseId) ?? prs[0];
  const history = selected ? await getE1rmHistory(clientId, selected.exerciseId) : [];
  const sep = baseHref.includes("?") ? "&" : "?";
  const href = (id: number) => `${baseHref}${sep}ex=${id}`;
  const first = history[0]?.value;
  const last = history[history.length - 1]?.value;

  return (
    <>
      <div className="grid grid-2">
        <section className="card">
          <div className="card-head">
            <h2 className="h2">{selected ? selected.exerciseName : "Kracht"}</h2>
            {selected && <span className="body-sm muted">geschatte 1RM</span>}
          </div>
          {selected && (
            <div className="actions" style={{ gap: 24 }}>
              <p><span className="metric">{kg(selected.bestE1rm)}</span><span className="unit">kg beste</span></p>
              {history.length > 1 && first && last && (
                <p className="body-sm">
                  <span className="label">Sinds start</span>
                  <br />
                  <span className={last >= first ? "positive" : "alert"}>
                    {last >= first ? "+" : "−"}
                    {kg(Math.abs(last - first))} kg
                  </span>
                </p>
              )}
            </div>
          )}
          <LineChart points={history} label={`Verloop geschatte 1RM ${selected?.exerciseName ?? ""}`} />
          {prs.length > 1 && (
            <div className="actions">
              {prs.slice(0, 8).map((p) => (
                <Link
                  key={p.exerciseId}
                  href={href(p.exerciseId)}
                  className={p.exerciseId === selected?.exerciseId ? "tag tag-accent" : "tag"}
                  style={{ textDecoration: "none" }}
                >
                  {p.exerciseName}
                </Link>
              ))}
            </div>
          )}
        </section>
        <WeeklyCard weekly={weekly} />
      </div>
      <section className="card">
        <div className="card-head">
          <h2 className="h2">Persoonlijke records</h2>
          <span className="body-sm muted">1RM geschat met de Epley-formule</span>
        </div>
        <PRTable prs={prs} progressHref={href} />
      </section>
    </>
  );
}
