# PT Hub · Fysiotherapie Nagtzaam

Webapp waarin trainers en cliënten trainingen, lichaamsgewicht, schema's en PR's bijhouden.

- **Trainers** maken cliëntaccounts aan, zetten schema's klaar (dagen met oefeningen, sets, reps, belasting), loggen trainingen tijdens een PT-sessie en zien per cliënt voortgang, PR's, volume en gewicht.
- **Cliënten** zien hun schema, starten een training vanuit een schemadag (met "vorige keer" als richtlijn), loggen gewicht en volgen hun PR's en geschatte 1RM.
- **Oefenbibliotheek** met 265 oefeningen voor revalidatie en spieropbouw, elk met regio, materiaal, doel, niveau, spiergroepen en een korte uitvoeringsinstructie. Doorzoekbaar en filterbaar op `/exercises`; trainers kunnen eigen oefeningen toevoegen. In schema's en de logger kies je een oefening door te typen.
- **Cliënten zonder login**: e-mail en wachtwoord zijn optioneel bij het aanmaken. Zo'n cliënt beheert de trainer zelf; later kan op de cliëntpagina alsnog een e-mail en wachtwoord worden ingesteld.
- **Bekijk als cliënt**: een trainer kan de hub gebruiken zoals een eigen cliënt hem ziet (om te testen of samen in te vullen), met een balk bovenin om terug te gaan.
- **Schema's** (`/trainer/schemas`): overzicht van alle actieve schema's per cliënt en een schemabouwer met cliëntkeuze. Alle oefeningen uit de database zijn te kiezen; ontbreekt er een, dan voeg je hem direct toe. Per oefening schrijft de trainer sets, reps, RPE en rust voor; de belasting is optioneel: leeg = de cliënt kiest het gewicht tijdens het trainen, ingevuld (bijv. `40 kg`) = wordt in de logger vooraf ingevuld.
- **Data** (`/trainer/data`, voor alle trainers): overzicht van de hele praktijk: aantal en groei van cliënten, aandeel vanuit fysio (herkomst per cliënt), actieve cliënten, behoud na 4 weken, trainingen per week, PR's, gewicht bijhouden, cijfers per trainer, meest getrainde oefeningen en wie aandacht nodig heeft.
- **Cliënten verwijderen** met het prullenbakje in de cliëntenlijst of op de cliëntpagina, na bevestiging. Definitief: trainingen, schema's en metingen van die cliënt worden mee verwijderd.
- **Beheerder**: precies één trainer (`ADMIN_EMAIL`, anders `TRAINER_EMAIL`) beheert onder Team de trainers: toevoegen, wachtwoord resetten, verwijderen (cliënten gaan dan naar een gekozen trainer). Wordt bij elke start opnieuw gezet. Andere trainers hebben verder dezelfde functies.
- **Cliënten per trainer**: elke cliënt is gekoppeld aan een trainer (te kiezen bij aanmaken, op de cliëntpagina of direct in de cliëntenlijst). Alle trainers zien alle cliënten van de praktijk en filteren op *Mijn cliënten*, *Alle*, *Nog niet gekoppeld* of een specifieke trainer (cliëntenlijst en Schema's).
- Een cliënt ziet alleen zichzelf.

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
   | `ADMIN_EMAIL` | optioneel: e-mail van de beheerder van de trainers; standaard `TRAINER_EMAIL` |

4. Deploy. Bij elke start draaien eerst de migraties (`drizzle/`) en de seed: die vult en actualiseert de oefenbibliotheek (`scripts/exercise-library.mjs`) en maakt het eerste traineraccount aan zolang er nog geen gebruikers zijn. Daarna kun je `TRAINER_PASSWORD` weghalen en je wachtwoord wijzigen onder **Account**.
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
scripts/                migratie, seed en oefenbibliotheek (draaien bij start)
```

## Oefenbibliotheek aanpassen

De meegeleverde oefeningen staan in `scripts/exercise-library.mjs`, één regel per oefening. Pas daar een uitvoering aan of voeg een regel toe en deploy opnieuw: bij de start worden bibliotheekoefeningen bijgewerkt. Oefeningen die trainers via de app toevoegen blijven ongemoeid.

## Nog niet in deze versie

- Wachtwoord vergeten per e-mail (nu reset de trainer het wachtwoord op de cliëntpagina).
- Trainingen achteraf bewerken (wel verwijderen en opnieuw loggen).
- Eigen oefeningen bewerken of verwijderen in de app.
- Video's of afbeeldingen bij oefeningen.
- Logo als SVG: de huidige PNG's in `public/brand/` zijn uitgesneden uit een afbeelding van 447 px. Vervang ze door een SVG zodra de praktijk die heeft.
