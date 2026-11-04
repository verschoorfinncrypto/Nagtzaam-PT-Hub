import Link from "next/link";
import { findInvite } from "@/lib/invite-lookup";
import { TERMS_VERSION } from "@/lib/terms";
import { AcceptForm } from "./form";

export const metadata = { title: "Wachtwoord aanmaken" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const row = await findInvite(params.token);
  return (
    <main className="login">
      <section className="login-side">
        <div className="stack" style={{ gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="login-logo" src="/brand/logo-white.png" alt="Fysiotherapie Nagtzaam" width={200} height={40} />
          <p className="label">PT Hub</p>
        </div>
        <h1 className="display">Welkom bij de PT Hub.</h1>
        <p className="body-sm muted">Je schema, je trainingen en je voortgang op één plek.</p>
      </section>
      <section className="login-main">
        <div className="login-card">
          {!row ? (
            <>
              <h2 className="h1">Deze link werkt niet meer</h2>
              <p className="muted">De link is verlopen of al gebruikt. Vraag je trainer om een nieuwe link, of kies hieronder voor wachtwoord vergeten.</p>
              <div className="actions">
                <Link href="/wachtwoord-vergeten" className="btn">Wachtwoord vergeten</Link>
                <Link href="/login" className="btn btn-ghost">Naar inloggen</Link>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="h1">{row.invite.purpose === "invite" ? `Hoi ${row.user.name.split(" ")[0]}!` : "Nieuw wachtwoord"}</h2>
                <p className="muted">
                  {row.invite.purpose === "invite" ? "Kies een wachtwoord. Daarna ben je meteen ingelogd." : "Kies een nieuw wachtwoord voor je account."} Je
                  logt in met <b>{row.user.email}</b>.
                </p>
              </div>
              <AcceptForm token={params.token} needsTerms={row.user.termsVersion !== TERMS_VERSION} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
