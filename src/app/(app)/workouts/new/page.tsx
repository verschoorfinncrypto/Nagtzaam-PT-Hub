import Link from "next/link";
import { WorkoutForm } from "@/components/WorkoutForm";
import { requireClientAccess, requireUser } from "@/lib/auth";
import { getActiveProgram, getExerciseOptions, getLastSets } from "@/lib/data";
import { today } from "@/lib/format";

export const metadata = { title: "Training loggen" };

export default async function NewWorkout({ searchParams }: { searchParams: { day?: string; client?: string } }) {
  const me = await requireUser();
  const clientId = me.role === "trainer" ? Number(searchParams.client) : me.id;
  const { client } = await requireClientAccess(clientId);
  const [exercises, program, previous] = await Promise.all([getExerciseOptions(), getActiveProgram(client.id), getLastSets(client.id)]);
  const days = (program?.days ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    items: d.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, load: i.load })),
  }));
  const back = me.role === "trainer" ? `/trainer/clients/${client.id}` : "/workouts";

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={back} className="body-sm">← Terug</Link>
          <h1 className="h1">Training loggen</h1>
          {me.role === "trainer" && <p className="muted">voor {client.name}</p>}
        </div>
      </div>
      <WorkoutForm
        clientId={client.id}
        exercises={exercises}
        days={days}
        initialDayId={searchParams.day ? Number(searchParams.day) : undefined}
        previous={previous}
        defaultDate={today()}
      />
    </>
  );
}
