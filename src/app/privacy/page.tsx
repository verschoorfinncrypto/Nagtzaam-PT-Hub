import Link from "next/link";
import { TERMS_IS_DRAFT, TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "Privacyverklaring" };

export default function Page() {
  return (
    <main className="page legal">
      <p><Link href="/login" className="body-sm">← PT Hub</Link></p>
      <p className="label">Fysiotherapie Nagtzaam · versie {TERMS_VERSION}</p>
      <h1 className="h1">Privacyverklaring</h1>
      {TERMS_IS_DRAFT && (
        <p className="notice" role="status">
          Concept. De definitieve tekst van Fysiotherapie Nagtzaam komt hier te staan. Vervang de inhoud van dit bestand
          (src/app/privacy/page.tsx) en zet TERMS_IS_DRAFT in src/lib/terms.ts op false.
        </p>
      )}
      <section className="stack">
        <h2 className="h2">Welke gegevens bewaren we?</h2>
        <p>Naam, e-mailadres, je doel, trainingsschema&apos;s, gelogde trainingen (sets, herhalingen, gewicht, zwaarte, pijn en gevoel) en metingen zoals gewicht, vetpercentage en omtrek.</p>
        <h2 className="h2">Waarvoor?</h2>
        <p>Alleen om je training te begeleiden en je voortgang te laten zien. We verkopen niets door.</p>
        <h2 className="h2">Wie kan erbij?</h2>
        <p>Jij en de trainers van Fysiotherapie Nagtzaam.</p>
        <h2 className="h2">Hoe lang?</h2>
        <p>[Bewaartermijn van de praktijk invullen.]</p>
        <h2 className="h2">Je rechten</h2>
        <p>Je mag je gegevens inzien, laten aanpassen of laten verwijderen. Vraag dit aan je trainer of de praktijk. [Contactgegevens invullen.]</p>
      </section>
    </main>
  );
}
