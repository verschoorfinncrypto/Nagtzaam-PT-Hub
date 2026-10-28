import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { createClient } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Cliënt toevoegen" };

export default async function NewClient() {
  await requireUser("trainer");
  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/trainer" className="body-sm">← Cliënten</Link>
          <h1 className="h1">Cliënt toevoegen</h1>
        </div>
      </div>
      <section className="card" style={{ maxWidth: 560 }}>
        <ActionForm action={createClient} submitLabel="Account aanmaken">
          <label className="field">
            <span className="label">Naam</span>
            <input name="name" required maxLength={100} autoComplete="off" />
          </label>
          <label className="field">
            <span className="label">E-mail (optioneel)</span>
            <input name="email" type="email" autoComplete="off" />
          </label>
          <label className="field">
            <span className="label">Startwachtwoord (optioneel)</span>
            <input name="password" type="text" minLength={10} autoComplete="new-password" />
            <span className="hint">
              Leeg laten = de cliënt kan nog niet zelf inloggen. Je beheert alles zelf en kunt via &quot;Bekijk als cliënt&quot; de
              hub testen zoals de cliënt hem ziet. Later stel je op de cliëntpagina alsnog een e-mail en wachtwoord in (minstens 10 tekens).
            </span>
          </label>
          <label className="field">
            <span className="label">Herkomst</span>
            <select name="source" defaultValue={"fysio"}>
              <option value="">Onbekend</option>
              <option value="fysio">Doorgestroomd vanuit fysiotherapie</option>
              <option value="extern">Van buiten de praktijk</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Doel (optioneel)</span>
            <input name="goal" maxLength={300} placeholder="Bijv. na kniereva terug naar voetbal" />
          </label>
        </ActionForm>
      </section>
    </>
  );
}
