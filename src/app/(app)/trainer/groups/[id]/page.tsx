import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgramDays } from "@/components/overview";
import { deleteGroup } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getGroup } from "@/lib/data";

export const metadata = { title: "Groep" };

export default async function GroupPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; program?: string; logged?: string } }) {
  await requireUser("trainer");
  const group = await getGroup(Number(params.id));
  if (!group) notFound();
  const pre = group.members.map((m) => m.id).join(",");
  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/trainer/groups" className="body-sm">← Groepen</Link>
          <h1 className="h1">{group.name}</h1>
          <p className="muted">
            {group.schedule ?? "Geen vast moment"} · {group.members.length} {group.members.length === 1 ? "lid" : "leden"}
          </p>
        </div>
        <div className="actions">
          {group.program && group.members.length > 0 && <Link href={`/trainer/groups/${group.id}/session`} className="btn btn-primary">Sessie loggen</Link>}
          <Link href={`/trainer/groups/${group.id}/schema`} className="btn">{group.program ? "Groepsschema aanpassen" : "Groepsschema maken"}</Link>
          <Link href={`/trainer/groups/${group.id}/edit`} className="btn">Groep bewerken</Link>
        </div>
      </div>

      {searchParams.saved && <p className="notice" role="status">Groep opgeslagen.</p>}
      {searchParams.program && <p className="notice" role="status">Groepsschema opgeslagen. Zet het met de knop hieronder ook bij de leden, dan zien ze het in hun eigen hub.</p>}
      {searchParams.logged && <p className="notice" role="status">Sessie opgeslagen voor {searchParams.logged} {searchParams.logged === "1" ? "deelnemer" : "deelnemers"}.</p>}

      <div className="grid grid-2">
        <section className="card">
          <h2 className="h2">Leden</h2>
          {group.members.length === 0 ? (
            <div className="empty">Nog geen leden. <Link href={`/trainer/groups/${group.id}/edit`}>Leden toevoegen</Link>.</div>
          ) : (
            <ul className="list">
              {group.members.map((m) => (
                <li key={m.id}><Link href={`/trainer/clients/${m.id}`} style={{ fontWeight: 600 }}>{m.name}</Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="h2">Groepsschema</h2>
          {group.program ? (
            <>
              <p><b>{group.program.name}</b> · {group.program.days.length} {group.program.days.length === 1 ? "dag" : "dagen"}</p>
              {group.members.length > 0 && (
                <div className="actions">
                  <Link href={`/trainer/schemas/copy?from=${group.program.id}&pre=${pre}`} className="btn">Bij alle leden zetten</Link>
                  <Link href={`/print/schema?group=${group.id}`} className="btn btn-ghost">Print / PDF</Link>
                </div>
              )}
              <p className="hint">&quot;Bij alle leden zetten&quot; geeft iedereen een eigen kopie als actief schema, zodat ze het in hun hub zien en zelf kunnen loggen.</p>
            </>
          ) : (
            <div className="empty">Nog geen schema. <Link href={`/trainer/groups/${group.id}/schema`}>Maak het groepsschema</Link>.</div>
          )}
        </section>
      </div>

      {group.program && <ProgramDays program={group.program} />}

      <section className="card danger-zone-card">
        <form action={deleteGroup} className="actions" style={{ justifyContent: "space-between" }}>
          <input type="hidden" name="groupId" value={group.id} />
          <span className="hint">Groep verwijderen haalt de groep en het groepsschema weg. Cliënten en hun trainingen blijven bewaard.</span>
          <button type="submit" className="btn btn-sm btn-danger">Groep verwijderen</button>
        </form>
      </section>
    </>
  );
}
