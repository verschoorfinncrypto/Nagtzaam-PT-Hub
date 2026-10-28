import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getClients } from "@/lib/data";
import { daysAgo, kg, shortDate } from "@/lib/format";

export const metadata = { title: "Cliënten" };

export default async function TrainerHome() {
  const me = await requireUser("trainer");
  const clients = await getClients(me.id);
  const stale = daysAgo(10);
  const active = clients.filter((c) => c.workoutsThisWeek > 0).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="label">Trainer</p>
          <h1 className="h1">Cliënten</h1>
        </div>
        <Link href="/trainer/clients/new" className="btn btn-primary">Cliënt toevoegen</Link>
      </div>

      <div className="grid grid-3">
        <div className="stat"><span className="label">Cliënten</span><span className="metric">{clients.length}</span></div>
        <div className="stat"><span className="label">Getraind afgelopen 7 dagen</span><span className="metric">{active}</span></div>
        <div className="stat">
          <span className="label">Zonder schema</span>
          <span className="metric">{clients.filter((c) => !c.program).length}</span>
        </div>
      </div>

      <section className="card">
        {clients.length === 0 ? (
          <div className="empty">
            Nog geen cliënten. <Link href="/trainer/clients/new">Voeg je eerste cliënt toe</Link>.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Naam</th><th>Schema</th><th>Laatste training</th><th>7 dagen</th><th>Gewicht</th></tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/trainer/clients/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
                      {c.goal && <><br /><span className="body-sm muted">{c.goal}</span></>}
                      {!c.canLogin && <> <span className="tag">Geen login</span></>}
                    </td>
                    <td>{c.program ?? <span className="tag tag-alert">Geen schema</span>}</td>
                    <td>
                      {c.lastWorkout ? shortDate(c.lastWorkout) : <span className="muted">nog niet</span>}
                      {c.lastWorkout && c.lastWorkout < stale && <> <span className="tag tag-alert">10+ dagen</span></>}
                    </td>
                    <td>{c.workoutsThisWeek}</td>
                    <td>{c.weight ? `${kg(c.weight.weightKg)} kg` : <span className="muted">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
