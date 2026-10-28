import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteWorkout } from "@/lib/actions";
import { requireClientAccess } from "@/lib/auth";
import { getPRs, getWorkout } from "@/lib/data";
import { e1rm, kg, longDate } from "@/lib/format";

export const metadata = { title: "Training" };

export default async function WorkoutPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const w = await getWorkout(Number(params.id));
  if (!w) notFound();
  const { viewer, client } = await requireClientAccess(w.clientId);
  const prs = await getPRs(client.id);
  const prHere = new Set(
    prs.filter((p) => p.bestSet.date === w.date && w.groups.some((g) => g.exerciseId === p.exerciseId)).map((p) => p.exerciseId),
  );
  const volume = w.groups.flatMap((g) => g.sets).reduce((s, x) => s + x.reps * x.weight, 0);
  const back = viewer.role === "trainer" ? `/trainer/clients/${client.id}` : "/workouts";

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={back} className="body-sm">← Terug</Link>
          <h1 className="h1">{w.title}</h1>
          <p className="muted">
            {longDate(w.date)}
            {viewer.role === "trainer" && ` · ${client.name}`}
          </p>
        </div>
        <form action={deleteWorkout}>
          <input type="hidden" name="id" value={w.id} />
          <button className="btn btn-danger btn-sm" type="submit">Training verwijderen</button>
        </form>
      </div>

      {searchParams.saved && (
        <p className="notice" role="status">
          Training opgeslagen.{prHere.size > 0 && ` Nieuw PR op ${prHere.size === 1 ? "1 oefening" : `${prHere.size} oefeningen`}!`}
        </p>
      )}

      <div className="grid grid-3">
        <div className="stat"><span className="label">Volume</span><span><span className="metric">{kg(volume, 0)}</span><span className="unit">kg</span></span></div>
        <div className="stat"><span className="label">Sets</span><span className="metric">{w.groups.reduce((s, g) => s + g.sets.length, 0)}</span></div>
        <div className="stat"><span className="label">Zwaarte</span><span className="metric">{w.rpe ? `RPE ${w.rpe}` : "–"}</span></div>
      </div>

      {w.groups.map((g, i) => {
        const best = Math.max(...g.sets.map((s) => e1rm(s.weight, s.reps)));
        return (
          <section key={i} className="card">
            <div className="card-head">
              <h2 className="h2">
                {g.exerciseName} {prHere.has(g.exerciseId) && <span className="tag tag-positive">PR</span>}
              </h2>
              {best > 0 && <span className="body-sm muted">geschat 1RM {kg(best)} kg</span>}
            </div>
            <table>
              <thead><tr><th>Set</th><th>Reps</th><th>Gewicht</th></tr></thead>
              <tbody>
                {g.sets.map((s) => (
                  <tr key={s.id}><td>{s.setNumber}</td><td>{s.reps}</td><td>{s.weight ? `${kg(s.weight, 2)} kg` : "lichaamsgewicht"}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {w.notes && (
        <section className="card">
          <h2 className="h2">Notities</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{w.notes}</p>
        </section>
      )}
    </>
  );
}
