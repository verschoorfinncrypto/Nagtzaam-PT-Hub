import Link from "next/link";
import { TrainerFilterBar } from "@/components/TrainerFilter";
import { requireUser } from "@/lib/auth";
import { countUnassigned, getTrainerPrograms, getTrainers, parseTrainerFilter } from "@/lib/data";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Schema's" };

export default async function SchemasPage({ searchParams }: { searchParams: { saved?: string; trainer?: string } }) {
  const me = await requireUser("trainer");
  const filter = parseTrainerFilter(searchParams.trainer, me.id);
  const [list, all, trainers, unassigned] = await Promise.all([
    getTrainerPrograms(filter),
    getTrainerPrograms("all"),
    getTrainers(),
    countUnassigned(),
  ]);
  const saved = searchParams.saved ? all.find((r) => r.client_id === Number(searchParams.saved)) : undefined;
  const withProgram = list.filter((r) => r.program_id);
  const without = list.filter((r) => !r.program_id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Schema&apos;s</h1>
          <p className="muted">
            {withProgram.length} actief · {without.length} {without.length === 1 ? "cliënt" : "cliënten"} zonder schema
          </p>
        </div>
        <Link href="/trainer/schemas/new" className="btn btn-primary">Nieuw schema</Link>
      </div>

      {saved && (
        <p className="notice" role="status">
          Schema &quot;{saved.program_name}&quot; opgeslagen en actief voor {saved.client_name}.
        </p>
      )}

      <TrainerFilterBar basePath="/trainer/schemas" trainers={trainers} meId={me.id} current={filter} total={all.length} unassigned={unassigned} />

      {list.length === 0 ? (
        <div className="empty">
          {all.length === 0 ? (
            <>Nog geen cliënten. <Link href="/trainer/clients/new">Voeg eerst een cliënt toe</Link>.</>
          ) : (
            <>Geen cliënten bij dit filter. <Link href="/trainer/schemas?trainer=all">Toon alle cliënten</Link>.</>
          )}
        </div>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Cliënt</th><th>Trainer</th><th>Schema</th><th>Dagen</th><th>Oefeningen</th><th>Sinds</th><th aria-label="Acties" /></tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.client_id}>
                    <td><Link href={`/trainer/clients/${r.client_id}`} style={{ fontWeight: 600 }}>{r.client_name}</Link></td>
                    <td>{r.trainer_name ?? <span className="muted">nog niet gekoppeld</span>}</td>
                    <td>{r.program_name ?? <span className="tag tag-alert">Geen schema</span>}</td>
                    <td>{r.program_id ? r.days : "–"}</td>
                    <td>{r.program_id ? r.exercises : "–"}</td>
                    <td>{r.created ? shortDate(r.created) : "–"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/trainer/schemas/new?client=${r.client_id}`} className="btn btn-sm">
                        {r.program_id ? "Bewerken" : "Schema maken"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
