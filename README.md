# PT Hub · Fysiotherapie Nagtzaam

Webapp waarin trainers en cliënten trainingen, lichaamsgewicht, schema's en PR's bijhouden.

- **Trainers** maken cliëntaccounts aan, zetten schema's klaar (dagen met oefeningen, sets, reps, belasting), loggen trainingen tijdens een PT-sessie en zien per cliënt voortgang, PR's, volume en gewicht.
- **Cliënten** zien hun schema, starten een training vanuit een schemadag (met "vorige keer" als richtlijn), loggen gewicht en volgen hun PR's en geschatte 1RM.
- Een trainer ziet alleen de eigen cliënten; een cliënt alleen zichzelf.

Stack: Next.js 14 (App Router, server actions), Postgres met Drizzle ORM, sessies via een ondertekende cookie (jose), wachtwoorden met bcrypt. Styling volgt het design system *Nagtzaam PT Hub*.

## Deployen op Railway

1. **New Project → Deploy from GitHub repo** en kies deze repo.
2. Voeg in hetzelfde project een database toe: **New → Database → PostgreSQL**.
3. Zet bij de app-service onder **Variables**:

   | Variabele | Waarde |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `SESSION_SECRET` | een willekeurige string van 32+ tekens (`openssl rand -base64 48`) |
   | `TRAINER_EMAIL` | jouw e-mailadres |
   | `TRAINER_NAME` | jouw naam |
   | `TRAINER_PASSWORD` | startwachtwoord, minstens 10 tekens |

4. Deploy. Bij elke start draaien eerst de migraties (`drizzle/`) en de seed: die vult de oefeningenbibliotheek en maakt het eerste traineraccount aan zolang er nog geen gebruikers zijn. Daarna kun je `TRAINER_PASSWORD` weghalen en je wachtwoord wijzigen onder **Account**.
5. **Settings → Networking → Generate Domain** voor een publieke URL (of koppel een eigen domein, bijv. `hub.fysiotherapienagtzaam.nl`).

Railway gebruikt `railway.json`: build `npm run build`, start `npm start`, healthcheck op `/api/health`.

## Lokaal draaien

```bash
cp .env.example .env   # vul DATABASE_URL, SESSION_SECRET en de TRAINER_* in
npm install
npm run db:migrate && npm run db:seed
npm run dev
```

Schema aangepast in `src/db/schema.ts`? Maak een nieuwe migratie met `npm run db:generate` en commit de map `drizzle/`.

## Structuur

```
src/app/(app)/          ingelogde pagina's (cliënt: dashboard, workouts, schema, weight, progress; trainer: trainer/…)
src/app/login/          inloggen
src/components/         grafieken, workout-logger, schemabouwer, overzichtskaarten
src/lib/actions.ts      alle server actions (opslaan, verwijderen) met validatie en toegangscontrole
src/lib/data.ts         queries: PR's, volume per week, gewicht, schema's
src/db/schema.ts        datamodel
scripts/                migratie en seed (draaien bij start)
```

## Nog niet in deze versie

- Wachtwoord vergeten per e-mail (nu reset de trainer het wachtwoord op de cliëntpagina).
- Trainingen achteraf bewerken (wel verwijderen en opnieuw loggen).
- Logo als SVG: de huidige PNG's in `public/brand/` zijn uitgesneden uit een afbeelding van 447 px. Vervang ze door een SVG zodra de praktijk die heeft.
