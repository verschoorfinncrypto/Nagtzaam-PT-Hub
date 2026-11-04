import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupForm } from "@/components/GroupForm";
import { requireUser } from "@/lib/auth";
import { getGroup, getTrainerPrograms, getTrainers } from "@/lib/data";

export const metadata = { title: "Groep bewerken" };

export default async function EditGroupPage({ params }: { params: { id: string } }) {
  const me = await requireUser("trainer");
  const [group, trainers, clients] = await Promise.all([getGroup(Number(params.id)), getTrainers(), getTrainerPrograms("all")]);
  if (!group) notFound();
  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/trainer/groups/${group.id}`} className="body-sm">← {group.name}</Link>
          <h1 className="h1">Groep bewerken</h1>
        </div>
      </div>
      <section className="card" style={{ maxWidth: 760 }}>
        <GroupForm
          meId={me.id}
          trainers={trainers}
          clients={clients}
          group={{ id: group.id, name: group.name, schedule: group.schedule, notes: group.notes, trainerId: group.trainerId, memberIds: group.members.map((m) => m.id) }}
        />
      </section>
    </>
  );
}
