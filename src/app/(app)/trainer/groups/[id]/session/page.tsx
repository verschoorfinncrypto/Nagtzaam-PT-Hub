import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupSessionForm } from "@/components/GroupSessionForm";
import { requireUser } from "@/lib/auth";
import { getGroup, getLastSets } from "@/lib/data";
import { today } from "@/lib/format";

export const metadata = { title: "Groepssessie loggen" };

export default async function GroupSessionPage({ params }: { params: { id: string } }) {
  await requireUser("trainer");
  const group = await getGroup(Number(params.id));
  if (!group) notFound();
  const previous: Record<number, Record<number, number>> = {};
  await Promise.all(
    group.members.map(async (m) => {
      const last = await getLastSets(m.id);
      previous[m.id] = Object.fromEntries(Object.entries(last).map(([ex, v]) => [Number(ex), v.sets[v.sets.length - 1]?.weight ?? 0]));
    }),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/trainer/groups/${group.id}`} className="body-sm">← {group.name}</Link>
          <h1 className="h1">Groepssessie loggen</h1>
          <p className="muted">{group.name}{group.schedule ? ` · ${group.schedule}` : ""}</p>
        </div>
      </div>
      {!group.program ? (
        <div className="empty">
          Deze groep heeft nog geen schema. <Link href={`/trainer/groups/${group.id}/schema`}>Maak eerst een groepsschema</Link>.
        </div>
      ) : group.members.length === 0 ? (
        <div className="empty">
          Deze groep heeft nog geen leden. <Link href={`/trainer/groups/${group.id}/edit`}>Voeg leden toe</Link>.
        </div>
      ) : (
        <GroupSessionForm
          groupId={group.id}
          days={group.program.days.map((d) => ({ id: d.id, name: d.name, items: d.items }))}
          members={group.members}
          previous={previous}
          defaultDate={today()}
        />
      )}
    </>
  );
}
