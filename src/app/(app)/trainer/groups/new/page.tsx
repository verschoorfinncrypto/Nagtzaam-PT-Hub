import Link from "next/link";
import { GroupForm } from "@/components/GroupForm";
import { requireUser } from "@/lib/auth";
import { getTrainerPrograms, getTrainers } from "@/lib/data";

export const metadata = { title: "Nieuwe groep" };

export default async function NewGroupPage() {
  const me = await requireUser("trainer");
  const [trainers, clients] = await Promise.all([getTrainers(), getTrainerPrograms("all")]);
  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/trainer/groups" className="body-sm">← Groepen</Link>
          <h1 className="h1">Nieuwe groep</h1>
        </div>
      </div>
      <section className="card" style={{ maxWidth: 760 }}>
        <GroupForm meId={me.id} trainers={trainers} clients={clients} />
      </section>
    </>
  );
}
