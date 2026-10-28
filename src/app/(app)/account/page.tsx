import { ActionForm } from "@/components/ActionForm";
import { changePassword } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const me = await requireUser();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Account</h1>
          <p className="muted">{me.name} · {me.email}</p>
        </div>
      </div>
      <section className="card" style={{ maxWidth: 520 }}>
        <h2 className="h2">Wachtwoord wijzigen</h2>
        <ActionForm action={changePassword} submitLabel="Wachtwoord opslaan" resetOnOk>
          <label className="field">
            <span className="label">Huidig wachtwoord</span>
            <input name="current" type="password" autoComplete="current-password" required />
          </label>
          <label className="field">
            <span className="label">Nieuw wachtwoord</span>
            <input name="next" type="password" autoComplete="new-password" minLength={10} required />
            <span className="hint">Minstens 10 tekens.</span>
          </label>
          <label className="field">
            <span className="label">Herhaal nieuw wachtwoord</span>
            <input name="repeat" type="password" autoComplete="new-password" minLength={10} required />
          </label>
        </ActionForm>
      </section>
    </>
  );
}
