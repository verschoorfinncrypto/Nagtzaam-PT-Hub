import Link from "next/link";
import { RecentWorkouts, weightDelta, Delta } from "@/components/overview";
import { requireUser } from "@/lib/auth";
import { getActiveProgram, getBodyWeights, getPRs, getWeekly, getWorkouts } from "@/lib/data";
import { kg, longDate, today } from "@/lib/format";

export const metadata = { title: "Overzicht" };

export default async function Dashboard() {
  const me = await requireUser("client");
  const [program, weights, prs, weekly, recent] = await Promise.all([
    getActiveProgram(me.id),
    getBodyWeights(me.id, 90),
    getPRs(me.id),
    getWeekly(me.id, 4),
    getWorkouts(me.id, 5),
  ]);
  const thisWeek = weekly[weekly.length - 1];
  const target = program?.days.length ?? 0;
  const lastWeight = weights[weights.length - 1];
  const newPRs = prs.filter((p) => p.recent);
  const done = new Set(recent.filter((w) => w.date >= thisWeek.week).map((w) => w.title));
  const nextDay = program?.days.find((d) => !done.has(d.name)) ?? program?.days[0];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="label">{longDate(today())}</p>
          <h1 className="h1">Hoi {me.name.split(" ")[0]}</h1>
        </div>
        <Link href="/workouts/new" className="btn btn-primary">Training loggen</Link>
      </div>

      <section className="hero">
        <p className="label">Deze week</p>
        <div className="actions" style={{ gap: 32, alignItems: "end" }}>
          <p>
            <span className="metric">{thisWeek.sessions}</span>
            <span className="unit" style={{ color: "#cfccc5" }}>{target ? `van ${target} trainingen` : "trainingen"}</span>
          </p>
          <p>
            <span className="metric">{kg(thisWeek.volume, 0)}</span>
            <span className="unit" style={{ color: "#cfccc5" }}>kg volume</span>
          </p>
        </div>
        {target > 0 && (
          <div className="progress" style={{ background: "#3a3936" }} aria-label={`${thisWeek.sessions} van ${target} trainingen gedaan`}>
            <span style={{ width: `${Math.min(100, (thisWeek.sessions / target) * 100)}%` }} />
          </div>
        )}
        {nextDay && (
          <div className="actions">
            <Link href={`/workouts/new?day=${nextDay.id}`} className="btn btn-primary">Start {nextDay.name}</Link>
            <span className="muted body-sm">uit {program!.name}</span>
          </div>
        )}
        {!program && <p className="muted body-sm">Je trainer heeft nog geen schema voor je klaargezet. Je kunt wel vrij trainingen loggen.</p>}
      </section>

      <div className="grid grid-3">
        <Link href="/weight" className="stat" style={{ textDecoration: "none" }}>
          <span className="label">Gewicht</span>
          <span>
            <span className="metric">{lastWeight ? kg(lastWeight.weightKg) : "–"}</span>
            <span className="unit">kg</span>
          </span>
          <span className="body-sm muted">30 dagen: <Delta value={weightDelta(weights, 30)} /></span>
        </Link>
        <Link href="/progress" className="stat" style={{ textDecoration: "none" }}>
          <span className="label">Nieuwe PR&apos;s (14 dagen)</span>
          <span className="metric">{newPRs.length}</span>
          <span className="body-sm muted">{newPRs.slice(0, 2).map((p) => p.exerciseName).join(", ") || "Op naar de volgende"}</span>
        </Link>
        <Link href="/progress" className="stat" style={{ textDecoration: "none" }}>
          <span className="label">Sterkste lift</span>
          <span>
            <span className="metric">{prs[0] ? kg(prs[0].bestE1rm, 0) : "–"}</span>
            <span className="unit">kg geschat 1RM</span>
          </span>
          <span className="body-sm muted">{prs[0]?.exerciseName ?? "Nog geen data"}</span>
        </Link>
      </div>

      <section className="card">
        <div className="card-head">
          <h2 className="h2">Laatste trainingen</h2>
          <Link href="/workouts" className="body-sm">Alles bekijken</Link>
        </div>
        <RecentWorkouts workouts={recent} />
      </section>
    </>
  );
}
