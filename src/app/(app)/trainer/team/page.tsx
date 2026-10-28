import { asc, eq } from "drizzle-orm";
import { ActionForm } from "@/components/ActionForm";
import { db, users } from "@/db";
import { addTrainer } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  await requireUser("trainer");
  const trainers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "trainer"))
    .orderBy(asc(users.name));
  return (
    <>
      <div className="page-head">
        <h1 className="h1">Team</h1>
      </div>
      <div className="grid grid-2">
        <section className="card">
          <h2 className="h2">Trainers</h2>
          <ul className="list">
            {trainers.map((t) => (
              <li key={t.id}><span style={{ fontWeight: 600 }}>{t.name}</span><span className="body-sm muted">{t.email}</span></li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="h2">Trainer toevoegen</h2>
          <p className="hint">Elke trainer ziet alleen de cliënten die hij of zij zelf heeft aangemaakt.</p>
          <ActionForm action={addTrainer} submitLabel="Trainer toevoegen" resetOnOk>
            <label className="field"><span className="label">Naam</span><input name="name" required /></label>
            <label className="field"><span className="label">E-mail</span><input name="email" type="email" required /></label>
            <label className="field">
              <span className="label">Startwachtwoord</span>
              <input name="password" type="text" minLength={10} required autoComplete="new-password" />
            </label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
