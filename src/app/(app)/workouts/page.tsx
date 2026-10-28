import Link from "next/link";
import { RecentWorkouts } from "@/components/overview";
import { requireUser } from "@/lib/auth";
import { getWorkouts } from "@/lib/data";

export const metadata = { title: "Trainingen" };

export default async function WorkoutsPage() {
  const me = await requireUser("client");
  const list = await getWorkouts(me.id, 200);
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Trainingen</h1>
          <p className="muted">{list.length} gelogd</p>
        </div>
        <Link href="/workouts/new" className="btn btn-primary">Training loggen</Link>
      </div>
      <section className="card">
        <RecentWorkouts workouts={list} />
      </section>
    </>
  );
}
