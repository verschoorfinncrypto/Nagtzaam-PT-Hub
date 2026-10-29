import Link from "next/link";
import { DeleteClientButton } from "@/components/DeleteClientButton";
import { AssignTrainerSelect, TrainerFilterBar } from "@/components/TrainerFilter";
import { requireUser } from "@/lib/auth";
import { countUnassigned, getClients, getTrainers, parseTrainerFilter } from "@/lib/data";
import { daysAgo, kg, shortDate } from "@/lib/format";

export const metadata = { title: "Cliënten" };

export default async function TrainerHome({ searchParams }: { searchParams: { deleted?: string; trainer?: string } }) {
  const me = await requireUser("trainer");
  const filter = parseTrainerFilter(searchParams.trainer, me.id);
  const [clients, trainers, unassigned] = await Promise.all([getClients(filter), getTrainers(), countUnassigned()]);
  const total = trainers.reduce((n, t) => n + t.clients, 0) + unassigned;
  const filterName =
    filter === "all" ? "Alle cliënten" : filter === "none" ? "Nog niet gekoppeld" : filter === me.id ? "Mijn cliënten" : `Cliënten van ${trainers.find((t) => t.id === filter)?.name ?? "onbekende trainer"}`;
  const stale = daysAgo(10);
  const active = clients.filter((c) => c.workoutsThisWeek > 0).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="label">{filterName}</p>
          <h1 className="h1">Cliënten</h1>
        </div>
        <Link href="/trainer/clients/new" className="btn btn-primary">Cliënt toevoegen</Link>
      </div>

      {searchParams.deleted && (
        <p className="notice" role="status">{searchParams.deleted.slice(0, 100)} is verwijderd, met alle bijbehorende gegevens.</p>
      )}

      <TrainerFilterBar basePath="/trainer" trainers={trainers} meId={me.id} current={filter} total={total} unassigned={unassigned} />

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
            {filter === me.id ? (
              <>Je hebt nog geen eigen cliënten. <Link href="/trainer/clients/new">Voeg een cliënt toe</Link> of bekijk <Link href="/trainer?trainer=all">alle cliënten</Link>.</>
            ) : (
              "Geen cliënten bij dit filter."
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Naam</th><th>Trainer</th><th>Schema</th><th>Laatste training</th><th>7 dagen</th><th>Gewicht</th><th aria-label="Verwijderen" /></tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/trainer/clients/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
                      {c.goal && <><br /><span className="body-sm muted">{c.goal}</span></>}
                      {!c.canLogin && <> <span className="tag">Geen login</span></>}
                    </td>
                    <td>
                      <AssignTrainerSelect clientId={c.id} clientName={c.name} trainerId={c.trainerId} trainers={trainers} />
                    </td>
                    <td>{c.program ?? <span className="tag tag-alert">Geen schema</span>}</td>
                    <td>
                      {c.lastWorkout ? shortDate(c.lastWorkout) : <span className="muted">nog niet</span>}
                      {c.lastWorkout && c.lastWorkout < stale && <> <span className="tag tag-alert">10+ dagen</span></>}
                    </td>
                    <td>{c.workoutsThisWeek}</td>
                    <td>{c.weight ? `${kg(c.weight.weightKg)} kg` : <span className="muted">–</span>}</td>
                    <td style={{ textAlign: "right" }}><DeleteClientButton clientId={c.id} name={c.name} /></td>
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
