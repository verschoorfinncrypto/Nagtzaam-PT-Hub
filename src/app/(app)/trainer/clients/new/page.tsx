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
            <span className="label">E-mail</span>
            <input name="email" type="email" required autoComplete="off" />
          </label>
          <label className="field">
            <span className="label">Startwachtwoord</span>
            <input name="password" type="text" minLength={10} required autoComplete="new-password" />
            <span className="hint">Minstens 10 tekens. Geef het persoonlijk door; de cliënt kan het daarna zelf wijzigen onder Account.</span>
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
