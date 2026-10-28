import { asc, eq, sql } from "drizzle-orm";
import { ActionForm } from "@/components/ActionForm";
import { db, users } from "@/db";
import { addTrainer, deleteTrainer, resetTrainerPassword } from "@/lib/actions";
import { currentSession, requireUser } from "@/lib/auth";

export const metadata = { title: "Team" };

export default async function TeamPage({ searchParams }: { searchParams: { msg?: string } }) {
  const me = await requireUser("trainer");
  const isAdmin = me.isAdmin && !(await currentSession())?.by;
  const trainers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isAdmin: users.isAdmin,
      // Volledig gekwalificeerd: een kale kolomnaam zou in de subquery naar c.id wijzen.
      clients: sql<number>`(select count(*) from users c where c.trainer_id = "users"."id" and c.role = 'client')::int`,
    })
    .from(users)
    .where(eq(users.role, "trainer"))
    .orderBy(asc(users.name));
  const admin = trainers.find((t) => t.isAdmin);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Team</h1>
          <p className="muted">
            {isAdmin
              ? "Jij bent beheerder: je kunt trainers toevoegen, verwijderen en hun wachtwoord resetten."
              : admin
                ? `Trainers worden beheerd door ${admin.name}.`
                : "Er is nog geen beheerder ingesteld."}
          </p>
        </div>
      </div>

      {searchParams.msg && <p className="notice" role="status">{searchParams.msg.slice(0, 200)}</p>}

      <div className="grid grid-2">
        <section className="card">
          <h2 className="h2">Trainers</h2>
          <ul className="list team-list">
            {trainers.map((t) => (
              <li key={t.id}>
                <div className="team-row">
                  <span>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    {t.isAdmin && <> <span className="tag tag-accent">Beheerder</span></>}
                    {t.id === me.id && <span className="muted"> (jij)</span>}
                    <br />
                    <span className="body-sm muted">{t.email} · {t.clients} {t.clients === 1 ? "cliënt" : "cliënten"}</span>
                  </span>
                </div>
                {isAdmin && t.id !== me.id && (
                  <details className="team-manage">
                    <summary>Beheren</summary>
                    <div className="stack">
                      <ActionForm action={resetTrainerPassword} submitLabel="Wachtwoord resetten" submitClass="btn btn-sm" resetOnOk>
                        <input type="hidden" name="trainerId" value={t.id} />
                        <label className="field">
                          <span className="label">Nieuw wachtwoord voor {t.name.split(" ")[0]}</span>
                          <input name="password" type="text" minLength={10} required autoComplete="new-password" />
                        </label>
                      </ActionForm>
                      {!t.isAdmin && (
                        <ActionForm action={deleteTrainer} submitLabel={`${t.name.split(" ")[0]} verwijderen`} submitClass="btn btn-sm btn-danger-solid">
                          <input type="hidden" name="trainerId" value={t.id} />
                          <label className="field">
                            <span className="label">Cliënten ({t.clients}) overdragen aan</span>
                            <select name="transferTo" defaultValue={me.id}>
                              {trainers.filter((o) => o.id !== t.id).map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="check">
                            <input type="checkbox" required /> Ik weet zeker dat ik {t.name} wil verwijderen
                          </label>
                        </ActionForm>
                      )}
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>

        {isAdmin && (
          <section className="card">
            <h2 className="h2">Trainer toevoegen</h2>
            <p className="hint">Elke trainer ziet alleen de cliënten die hij of zij zelf heeft aangemaakt. De nieuwe trainer heeft dezelfde functies als nu, maar kan geen trainers beheren.</p>
            <ActionForm action={addTrainer} submitLabel="Trainer toevoegen" resetOnOk>
              <label className="field"><span className="label">Naam</span><input name="name" required /></label>
              <label className="field"><span className="label">E-mail</span><input name="email" type="email" required /></label>
              <label className="field">
                <span className="label">Startwachtwoord</span>
                <input name="password" type="text" minLength={10} required autoComplete="new-password" />
              </label>
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
