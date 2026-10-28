import Link from "next/link";
import { ProgramBuilder } from "@/components/ProgramBuilder";
import { requireClientAccess, requireUser } from "@/lib/auth";
import { getActiveProgram, getExerciseOptions } from "@/lib/data";

export const metadata = { title: "Schema" };

export default async function ProgramPage({ params }: { params: { id: string } }) {
  await requireUser("trainer");
  const { client } = await requireClientAccess(Number(params.id));
  const [exercises, program] = await Promise.all([getExerciseOptions(), getActiveProgram(client.id)]);
  const initial = program
    ? {
        name: program.name,
        notes: program.notes ?? "",
        days: program.days.map((d) => ({
          name: d.name,
          items: d.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, load: i.load, notes: i.notes })),
        })),
      }
    : undefined;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/trainer/clients/${client.id}`} className="body-sm">← {client.name}</Link>
          <h1 className="h1">{program ? "Schema aanpassen" : "Nieuw schema"}</h1>
          <p className="muted">voor {client.name}</p>
        </div>
        <Link href="/exercises" className="btn btn-sm">Oefening missen?</Link>
      </div>
      <ProgramBuilder clientId={client.id} exercises={exercises} initial={initial} />
    </>
  );
}
