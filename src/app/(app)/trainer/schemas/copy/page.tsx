import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { copyProgram } from "@/lib/actions";
import { requireClientAccess, requireUser } from "@/lib/auth";
import { getProgramById, getTrainerPrograms } from "@/lib/data";
import { PROGRAM_LIMITS } from "@/lib/limits";

export const metadata = { title: "Schema kopiëren" };

export default async function CopySchemaPage({ searchParams }: { searchParams: { from?: string } }) {
  const me = await requireUser("trainer");
  const program = await getProgramById(Number(searchParams.from));
  if (!program) notFound();
  const { client: source } = await requireClientAccess(program.clientId);
  const all = (await getTrainerPrograms("all")).filter((c) => c.client_id !== source.id);
  const mine = all.filter((c) => c.trainer_id === me.id);
  const others = all.filter((c) => c.trainer_id !== me.id);
  const exerciseCount = program.days.reduce((n, d) => n + d.items.length, 0);

  const Row = ({ c }: { c: (typeof all)[number] }) => (
    <label className="copy-row">
      <input type="checkbox" name="clientId" value={c.client_id} />
      <span>
        <b>{c.client_name}</b>
        {c.trainer_id !== me.id && <span className="muted"> · {c.trainer_name ?? "nog niet gekoppeld"}</span>}
        <br />
        <span className="body-sm muted">
          {c.program_name ? <>Vervangt actief schema &quot;{c.program_name}&quot;</> : "Nog geen schema"}
        </span>
      </span>
    </label>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/trainer/schemas?trainer=all" className="body-sm">← Schema&apos;s</Link>
          <h1 className="h1">Schema kopiëren</h1>
          <p className="muted">
            &quot;{program.name}&quot; van {source.name} · {program.days.length} {program.days.length === 1 ? "dag" : "dagen"} · {exerciseCount} oefeningen
          </p>
        </div>
        <Link href={`/trainer/schemas/new?from=${program.id}`} className="btn">Eerst aanpassen voor één cliënt</Link>
      </div>

      <section className="card">
        <h2 className="h2">Inhoud</h2>
        <div className="copy-preview">
          {program.days.map((d) => (
            <div key={d.id}>
              <p className="label">{d.name}</p>
              <p className="body-sm">
                {d.items.map((i) => `${i.exerciseName} ${i.sets}×${i.reps}${i.painLimit ? ` (${i.painLimit})` : ""}`).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {all.length === 0 ? (
        <div className="empty">Er zijn nog geen andere cliënten om dit schema aan te koppelen.</div>
      ) : (
        <section className="card">
          <h2 className="h2">Naar welke cliënten?</h2>
          <ActionForm action={copyProgram} submitLabel="Kopiëren en activeren">
            <input type="hidden" name="fromId" value={program.id} />
            {mine.length > 0 && (
              <fieldset className="copy-group">
                <legend className="label">Mijn cliënten</legend>
                {mine.map((c) => <Row key={c.client_id} c={c} />)}
              </fieldset>
            )}
            {others.length > 0 && (
              <fieldset className="copy-group">
                <legend className="label">Overige cliënten</legend>
                {others.map((c) => <Row key={c.client_id} c={c} />)}
              </fieldset>
            )}
            <label className="field" style={{ maxWidth: 480 }}>
              <span className="label">Naam van het schema</span>
              <input name="name" defaultValue={program.name} maxLength={PROGRAM_LIMITS.name} />
            </label>
            <p className="hint">
              Elke cliënt krijgt een eigen kopie die direct actief wordt; een bestaand actief schema wordt gearchiveerd (gelogde trainingen blijven
              bewaard). Later aanpassen bij de één verandert niets bij de ander.
            </p>
          </ActionForm>
        </section>
      )}
    </>
  );
}
