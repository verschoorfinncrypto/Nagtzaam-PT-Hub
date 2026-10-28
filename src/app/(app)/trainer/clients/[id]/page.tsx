import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { DeleteClientButton } from "@/components/DeleteClientButton";
import { ProgramDays, RecentWorkouts, WeightCard, WeightForm } from "@/components/overview";
import { ProgressView } from "@/components/ProgressView";
import { stopProgram, updateClient, viewAsClient } from "@/lib/actions";
import { displayEmail, hasLogin, requireClientAccess, requireUser } from "@/lib/auth";
import { getActiveProgram, getBodyWeights, getWorkouts } from "@/lib/data";

export const metadata = { title: "Cliënt" };

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; program?: string; ex?: string };
}) {
  await requireUser("trainer");
  const { client } = await requireClientAccess(Number(params.id));
  const [program, weights, recent] = await Promise.all([
    getActiveProgram(client.id),
    getBodyWeights(client.id, 365),
    getWorkouts(client.id, 8),
  ]);
  const email = displayEmail(client.email);
  const canLogin = hasLogin(client);

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/trainer" className="body-sm">← Cliënten</Link>
          <h1 className="h1">{client.name}</h1>
          <p className="muted">
            {client.goal ?? email ?? "Geen e-mailadres"}{" "}
            {!canLogin && <span className="tag">Geen login</span>}
          </p>
        </div>
        <div className="actions">
          <Link href={`/workouts/new?client=${client.id}`} className="btn btn-primary">Training loggen</Link>
          <Link href={`/trainer/schemas/new?client=${client.id}`} className="btn">
            {program ? "Schema aanpassen" : "Schema maken"}
          </Link>
          <form action={viewAsClient}>
            <input type="hidden" name="clientId" value={client.id} />
            <button type="submit" className="btn">Bekijk als cliënt</button>
          </form>
        </div>
      </div>

      {searchParams.created === "login" && (
        <p className="notice" role="status">Account aangemaakt. {client.name} kan nu inloggen met {client.email} en het startwachtwoord.</p>
      )}
      {searchParams.created === "nologin" && (
        <p className="notice" role="status">
          {client.name} is aangemaakt zonder login. Je kunt alles zelf bijhouden of via &quot;Bekijk als cliënt&quot; de hub testen zoals {client.name.split(" ")[0]} hem ziet.
        </p>
      )}
      {searchParams.program && <p className="notice" role="status">Schema opgeslagen en actief gezet.</p>}

      <section className="stack">
        <div className="card-head">
          <h2 className="h2">Schema{program ? `: ${program.name}` : ""}</h2>
          {program && (
            <form action={stopProgram}>
              <input type="hidden" name="clientId" value={client.id} />
              <button type="submit" className="btn btn-ghost btn-sm">Schema stoppen</button>
            </form>
          )}
        </div>
        {program ? (
          <ProgramDays program={program} startHref={(id) => `/workouts/new?client=${client.id}&day=${id}`} />
        ) : (
          <div className="empty">Nog geen actief schema.</div>
        )}
      </section>

      <ProgressView clientId={client.id} exerciseId={searchParams.ex ? Number(searchParams.ex) : undefined} baseHref={`/trainer/clients/${client.id}`} />

      <div className="grid grid-2">
        <section className="card">
          <h2 className="h2">Laatste trainingen</h2>
          <RecentWorkouts workouts={recent} />
        </section>
        <WeightCard weights={weights} />
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="h2">Gewicht invoeren</h2>
          <WeightForm clientId={client.id} />
        </section>
        <section className="card">
          <h2 className="h2">Gegevens</h2>
          <ActionForm action={updateClient} submitLabel="Opslaan" submitClass="btn">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="field">
              <span className="label">Naam</span>
              <input name="name" defaultValue={client.name} required />
            </label>
            <label className="field">
              <span className="label">Doel</span>
              <input name="goal" defaultValue={client.goal ?? ""} maxLength={300} />
            </label>
            <label className="field">
              <span className="label">Herkomst</span>
              <select name="source" defaultValue={client.source ?? ""}>
                <option value="">Onbekend</option>
                <option value="fysio">Doorgestroomd vanuit fysiotherapie</option>
                <option value="extern">Van buiten de praktijk</option>
              </select>
            </label>
            <label className="field">
              <span className="label">E-mail{canLogin ? "" : " (nodig om in te loggen)"}</span>
              <input name="email" type="email" defaultValue={email ?? ""} autoComplete="off" />
            </label>
            <label className="field">
              <span className="label">{canLogin ? "Nieuw wachtwoord (optioneel)" : "Wachtwoord instellen (optioneel)"}</span>
              <input name="password" type="text" minLength={10} autoComplete="new-password" placeholder={canLogin ? "Leeg laten om niet te wijzigen" : "Minstens 10 tekens; dan kan de cliënt zelf inloggen"} />
            </label>
          </ActionForm>
          <div className="danger-zone">
            <DeleteClientButton clientId={client.id} name={client.name} withLabel />
          </div>
        </section>
      </div>
    </>
  );
}
