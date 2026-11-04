import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroups } from "@/lib/data";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Groepen" };

export default async function GroupsPage({ searchParams }: { searchParams: { deleted?: string } }) {
  const me = await requireUser("trainer");
  const list = await getGroups();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Groepen</h1>
          <p className="muted">Groepstrainingen met één schema voor iedereen; log de sessie in één keer voor alle aanwezigen.</p>
        </div>
        <Link href="/trainer/groups/new" className="btn btn-primary">Nieuwe groep</Link>
      </div>
      {searchParams.deleted && <p className="notice" role="status">Groep verwijderd. De trainingen van de leden blijven bewaard.</p>}
      {list.length === 0 ? (
        <div className="empty">
          Nog geen groepen. <Link href="/trainer/groups/new">Maak je eerste groep</Link>, bijvoorbeeld &quot;Knie-groep dinsdag&quot;.
        </div>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Groep</th><th>Moment</th><th>Trainer</th><th>Leden</th><th>Schema</th><th>Laatste sessie</th><th aria-label="Acties" /></tr></thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id}>
                    <td><Link href={`/trainer/groups/${g.id}`} style={{ fontWeight: 600 }}>{g.name}</Link></td>
                    <td>{g.schedule ?? <span className="muted">–</span>}</td>
                    <td>{g.trainer_name ?? <span className="muted">–</span>}{g.trainer_id === me.id && <span className="muted"> (jij)</span>}</td>
                    <td>{g.members}</td>
                    <td>{g.program_name ?? <span className="tag tag-alert">Geen schema</span>}</td>
                    <td>{g.last_session ? shortDate(g.last_session) : <span className="muted">nog niet</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      {g.program_name && <Link href={`/trainer/groups/${g.id}/session`} className="btn btn-sm btn-primary">Sessie loggen</Link>}
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
