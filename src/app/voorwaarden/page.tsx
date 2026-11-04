import Link from "next/link";
import { TERMS_IS_DRAFT, TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "Algemene voorwaarden" };

export default function Page() {
  return (
    <main className="page legal">
      <p><Link href="/login" className="body-sm">← PT Hub</Link></p>
      <p className="label">Fysiotherapie Nagtzaam · versie {TERMS_VERSION}</p>
      <h1 className="h1">Algemene voorwaarden</h1>
      {TERMS_IS_DRAFT && (
        <p className="notice" role="status">
          Concept. De definitieve tekst van Fysiotherapie Nagtzaam komt hier te staan. Vervang de inhoud van dit bestand
          (src/app/voorwaarden/page.tsx) en zet TERMS_IS_DRAFT in src/lib/terms.ts op false.
        </p>
      )}
      <section className="stack">
        <h2 className="h2">1. Wie we zijn</h2>
        <p>De PT Hub is de online omgeving van Fysiotherapie Nagtzaam voor personal training. Je ziet er je trainingsschema, logt je trainingen en volgt je voortgang.</p>
        <h2 className="h2">2. Je account</h2>
        <p>Je account is persoonlijk. Houd je wachtwoord geheim. Je trainer kan je schema en gelogde gegevens inzien en aanpassen.</p>
        <h2 className="h2">3. Trainen op eigen verantwoordelijkheid</h2>
        <p>Volg de aanwijzingen van je trainer en stop bij pijn boven je afgesproken pijngrens. Bij twijfel neem je contact op met de praktijk.</p>
        <h2 className="h2">4. Afspraken, betaling en annulering</h2>
        <p>[Tekst van de praktijk invullen.]</p>
        <h2 className="h2">5. Contact</h2>
        <p>[Adres, telefoon en e-mail van de praktijk invullen.]</p>
      </section>
    </main>
  );
}
