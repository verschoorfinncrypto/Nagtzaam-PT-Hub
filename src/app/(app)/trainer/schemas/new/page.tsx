import Link from "next/link";
import { ProgramBuilder, type ProgramInit } from "@/components/ProgramBuilder";
import { requireClientAccess, requireUser } from "@/lib/auth";
import { getActiveProgram, getExerciseFacets, getExerciseOptions, getTrainerPrograms } from "@/lib/data";

export const metadata = { title: "Schema bouwen" };

export default async function NewSchemaPage({ searchParams }: { searchParams: { client?: string } }) {
  const me = await requireUser("trainer");
  const clientId = searchParams.client ? Number(searchParams.client) : undefined;
  if (clientId) await requireClientAccess(clientId); // alleen eigen cliënten
  const [exercises, facets, programs, program] = await Promise.all([
    getExerciseOptions(),
    getExerciseFacets(),
    getTrainerPrograms(me.id),
    clientId ? getActiveProgram(clientId) : Promise.resolve(null),
  ]);
  const clients = programs.map((p) => ({ id: p.client_id, name: p.client_name })).sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const activeByClient = Object.fromEntries(programs.filter((p) => p.program_name).map((p) => [p.client_id, p.program_name as string]));
  const initial: ProgramInit | undefined = program
    ? {
        name: program.name,
        notes: program.notes ?? "",
        days: program.days.map((d) => ({
          name: d.name,
          items: d.items.map((i) => ({
            exerciseId: i.exerciseId,
            sets: i.sets,
            reps: i.reps,
            rpe: i.rpe,
            rest: i.rest,
            load: i.load,
            notes: i.notes,
          })),
        })),
      }
    : undefined;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/trainer/schemas" className="body-sm">← Schema&apos;s</Link>
          <h1 className="h1">{program ? "Schema bewerken" : "Nieuw schema"}</h1>
          <p className="muted">{exercises.length} oefeningen beschikbaar. Typ om te zoeken; mist er een, voeg hem dan direct toe.</p>
        </div>
      </div>
      {clients.length === 0 ? (
        <div className="empty">
          Nog geen cliënten. <Link href="/trainer/clients/new">Voeg eerst een cliënt toe</Link>.
        </div>
      ) : (
        <ProgramBuilder
          key={clientId ?? "new"}
          clients={clients}
          clientId={clientId}
          exercises={exercises}
          categories={facets.categories}
          initial={initial}
          activeByClient={activeByClient}
          returnTo="schemas"
        />
      )}
    </>
  );
}
