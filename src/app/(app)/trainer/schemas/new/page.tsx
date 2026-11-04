import Link from "next/link";
import { ProgramBuilder, type ProgramInit } from "@/components/ProgramBuilder";
import { requireClientAccess, requireUser } from "@/lib/auth";
import { getActiveProgram, getExerciseFacets, getExerciseOptions, getProgramById, getTrainerPrograms } from "@/lib/data";

export const metadata = { title: "Schema bouwen" };

export default async function NewSchemaPage({ searchParams }: { searchParams: { client?: string; from?: string } }) {
  const me = await requireUser("trainer");
  const clientId = searchParams.client ? Number(searchParams.client) : undefined;
  if (clientId) await requireClientAccess(clientId); // bestaande cliënt
  const [exercises, facets, programs, program] = await Promise.all([
    getExerciseOptions(),
    getExerciseFacets(),
    getTrainerPrograms("all"),
    // ?from= : een bestaand schema als startpunt (bijv. om het voor een andere cliënt aan te passen)
    searchParams.from ? getProgramById(Number(searchParams.from)) : clientId ? getActiveProgram(clientId) : Promise.resolve(null),
  ]);
  if (searchParams.from && program) await requireClientAccess(program.clientId);
  const fromTemplate = !!searchParams.from && !!program;
  const clients = programs
    .map((p) => ({ id: p.client_id, name: p.client_name, trainerId: p.trainer_id, trainerName: p.trainer_name }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const activeByClient = Object.fromEntries(programs.filter((p) => p.program_name).map((p) => [p.client_id, p.program_name as string]));
  const initial: ProgramInit | undefined = program
    ? {
        name: program.name,
        notes: program.notes ?? "",
        days: program.days.map((d) => ({
          name: d.name,
          items: d.items.map((i) => ({
            exerciseId: i.exerciseId,
            section: i.section,
            sets: i.sets,
            reps: i.reps,
            rpe: i.rpe,
            rest: i.rest,
            painLimit: i.painLimit,
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
          <h1 className="h1">{fromTemplate ? "Schema op basis van bestaand schema" : program ? "Schema bewerken" : "Nieuw schema"}</h1>
          <p className="muted">{exercises.length} oefeningen beschikbaar. Typ om te zoeken; mist er een, voeg hem dan direct toe.</p>
        </div>
      </div>
      {clients.length === 0 ? (
        <div className="empty">
          Nog geen cliënten. <Link href="/trainer/clients/new">Voeg eerst een cliënt toe</Link>.
        </div>
      ) : (
        <ProgramBuilder
          key={`${clientId ?? "new"}-${searchParams.from ?? ""}`}
          clients={clients}
          meId={me.id}
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
