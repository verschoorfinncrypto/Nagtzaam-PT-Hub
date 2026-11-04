import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgramBuilder, type ProgramInit } from "@/components/ProgramBuilder";
import { requireUser } from "@/lib/auth";
import { getExerciseFacets, getExerciseOptions, getGroup } from "@/lib/data";

export const metadata = { title: "Groepsschema" };

export default async function GroupSchemaPage({ params }: { params: { id: string } }) {
  const me = await requireUser("trainer");
  const [group, exercises, facets] = await Promise.all([getGroup(Number(params.id)), getExerciseOptions(), getExerciseFacets()]);
  if (!group) notFound();
  const p = group.program;
  const initial: ProgramInit | undefined = p
    ? {
        name: p.name,
        notes: p.notes ?? "",
        days: p.days.map((d) => ({
          name: d.name,
          items: d.items.map((i) => ({ exerciseId: i.exerciseId, section: i.section, sets: i.sets, reps: i.reps, rpe: i.rpe, rest: i.rest, painLimit: i.painLimit, load: i.load, notes: i.notes })),
        })),
      }
    : { name: group.name, notes: "", days: [] };
  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/trainer/groups/${group.id}`} className="body-sm">← {group.name}</Link>
          <h1 className="h1">{p ? "Groepsschema aanpassen" : "Groepsschema maken"}</h1>
        </div>
      </div>
      <ProgramBuilder
        clients={[]}
        meId={me.id}
        exercises={exercises}
        categories={facets.categories}
        initial={initial}
        activeByClient={{}}
        group={{ id: group.id, name: group.name }}
      />
    </>
  );
}
