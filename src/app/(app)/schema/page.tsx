import { ProgramDays } from "@/components/overview";
import { requireUser } from "@/lib/auth";
import { getActiveProgram } from "@/lib/data";

export const metadata = { title: "Mijn schema" };

export default async function SchemaPage() {
  const me = await requireUser("client");
  const program = await getActiveProgram(me.id);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="label">Mijn schema</p>
          <h1 className="h1">{program?.name ?? "Nog geen schema"}</h1>
        </div>
      </div>
      {!program && <div className="empty">Je trainer heeft nog geen schema voor je klaargezet.</div>}
      {program?.notes && (
        <section className="card">
          <h2 className="h2">Toelichting van je trainer</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{program.notes}</p>
        </section>
      )}
      {program && <ProgramDays program={program} startHref={(id) => `/workouts/new?day=${id}`} />}
    </>
  );
}
