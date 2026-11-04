import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { requestReset } from "@/lib/invites";

export const metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPage() {
  return (
    <main className="login">
      <section className="login-side">
        <div className="stack" style={{ gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="login-logo" src="/brand/logo-white.png" alt="Fysiotherapie Nagtzaam" width={200} height={40} />
          <p className="label">PT Hub</p>
        </div>
        <h1 className="display">Even een nieuw wachtwoord.</h1>
        <p className="body-sm muted">Geen zorgen, je trainingen blijven gewoon bewaard.</p>
      </section>
      <section className="login-main">
        <div className="login-card">
          <div>
            <h2 className="h1">Wachtwoord vergeten</h2>
            <p className="muted">Vul je e-mailadres in. Je krijgt een mail met een knop om een nieuw wachtwoord te kiezen.</p>
          </div>
          <ActionForm action={requestReset} submitLabel="Stuur mij een link" resetOnOk>
            <label className="field">
              <span className="label">E-mail</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
          </ActionForm>
          <Link href="/login" className="body-sm">← Terug naar inloggen</Link>
        </div>
      </section>
    </main>
  );
}
