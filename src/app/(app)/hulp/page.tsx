import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Hulp" };

type Topic = { id: string; title: string; video?: string; mobile?: boolean; steps: React.ReactNode[]; tip?: React.ReactNode };

const TRAINER: Topic[] = [
  {
    id: "inloggen",
    title: "Inloggen",
    video: "inloggen",
    steps: ["Open de PT Hub.", "Typ je e-mailadres.", "Typ je wachtwoord.", <>Klik op <b>Inloggen</b>. Klaar!</>],
    tip: <>Wachtwoord vergeten? Klik op de inlogpagina op <b>Wachtwoord vergeten?</b>. Je krijgt dan een mail.</>,
  },
  {
    id: "client-toevoegen",
    title: "Een cliënt toevoegen",
    video: "client-toevoegen",
    steps: [
      <>Klik bovenin op <b>Cliënten</b>.</>,
      <>Klik op <b>Cliënt toevoegen</b>.</>,
      "Typ de naam.",
      "Typ het e-mailadres. Dat heb je nodig voor de uitnodiging.",
      "Laat het wachtwoord leeg. Dat kiest de cliënt zelf.",
      "Kies of de cliënt uit de fysio komt of van buiten.",
      <>Klik op de knop onderaan. De cliënt staat erin!</>,
    ],
  },
  {
    id: "uitnodigen",
    title: "De cliënt uitnodigen",
    video: "uitnodigen",
    steps: [
      "Open de cliënt.",
      <>Scroll naar beneden naar <b>Toegang tot de hub</b>.</>,
      <>Klik op <b>Uitnodiging mailen</b>.</>,
      "De cliënt krijgt een mail met een knop.",
      "De cliënt klikt op de knop, kiest een wachtwoord en gaat akkoord met de voorwaarden. Dan is hij meteen ingelogd.",
    ],
    tip: "Mail niet aangekomen? Kijk in de spam. Of kopieer de link en stuur hem zelf via WhatsApp. De link werkt 14 dagen.",
  },
  {
    id: "schema-maken",
    title: "Een schema maken",
    video: "schema-maken",
    steps: [
      <>Open de cliënt en klik op <b>Schema maken</b>.</>,
      "Geef het schema een naam.",
      <>Er zijn drie blokken: <b>warming-up</b>, <b>hoofdblok</b> en <b>cooling-down</b>.</>,
      <>Klik op <b>+ Oefening</b> in een blok.</>,
      "Typ een stukje van de naam, bijvoorbeeld \"squat\" of \"knie\". Kies de oefening uit het lijstje.",
      "Vul sets en herhalingen in. RPE, rust en pijngrens mag ook.",
      "Andere volgorde? Houd het bolletjes-icoon vast en schuif omhoog of omlaag.",
      <>Klik op <b>Schema opslaan en activeren</b>.</>,
    ],
    tip: <>Staat een oefening er niet in? Typ de naam, kies een categorie en klik op <b>+ Toevoegen</b>. Hij komt dan ook in de oefeningenlijst.</>,
  },
  {
    id: "delen-printen",
    title: "Schema delen, printen of kopiëren",
    video: "delen-printen",
    steps: [
      "De cliënt ziet zijn schema vanzelf als hij inlogt. Je hoeft niets te sturen.",
      <>Op papier of als PDF? Klik op <b>Print / PDF</b> en kies <b>Opslaan als PDF</b>.</>,
      <>Zelfde schema voor iemand anders? Klik op <b>Kopiëren naar andere cliënten</b>, vink ze aan en klik <b>Kopiëren en activeren</b>.</>,
    ],
  },
  {
    id: "metingen",
    title: "Metingen invoeren (weegschaal)",
    video: "metingen",
    steps: [
      "Open de cliënt.",
      "Vul bij Meting het gewicht in.",
      "Vul de andere getallen van de weegschaal in: vetpercentage, visceraal vet, spiermassa, BMR, en zo verder.",
      "Weet je iets niet? Laat het leeg.",
      <>Klik op <b>Meting opslaan</b>.</>,
      "Bij elke waarde zie je een label: goed, let op of hoog.",
    ],
    tip: "Vul één keer geslacht, geboortejaar en lengte in bij Lichaam. Dan kloppen de labels en rekent de hub de BMI zelf uit.",
  },
  {
    id: "groepen",
    title: "Groepstraining",
    video: "groepen",
    steps: [
      <>Klik bovenin op <b>Groepen</b> en dan op <b>Nieuwe groep</b>.</>,
      "Typ de naam en het tijdstip. Vink de leden aan. Klik Opslaan.",
      <>Klik op <b>Groepsschema maken</b>. Dat werkt net als een gewoon schema.</>,
      <>Na de les: klik op <b>Sessie loggen</b>. Vink aan wie er was en vul de kilo&apos;s in.</>,
      "Iedereen krijgt de training in zijn eigen historie.",
    ],
    tip: <>Wil je dat de leden het groepsschema ook in hun eigen hub zien? Klik op <b>Bij alle leden zetten</b>.</>,
  },
  {
    id: "oefeningen",
    title: "Oefeningen zoeken, toevoegen en video koppelen",
    video: "oefening-toevoegen",
    steps: [
      <>Klik bovenin op <b>Oefeningen</b>.</>,
      "Zoek met het zoekveld, of filter op regio en doel.",
      "Klik op een oefening om de uitleg te zien.",
      <>Eigen video? Plak de YouTube-link en klik <b>Video opslaan</b>. Die video zien je cliënten dan in hun schema.</>,
      <>Oefening mist? Scroll naar <b>Eigen oefening toevoegen</b>.</>,
    ],
  },
  {
    id: "bekijk-als-client",
    title: "Kijken wat de cliënt ziet",
    video: "bekijk-als-client",
    steps: [
      "Open de cliënt.",
      <>Klik op <b>Bekijk als cliënt</b>.</>,
      "Nu zie je de hub zoals de cliënt. Je kunt ook voor hem een training loggen.",
      <>Klaar? Klik bovenin op <b>Terug naar trainer</b>.</>,
    ],
  },
  {
    id: "data",
    title: "Data van de praktijk",
    steps: [
      <>Klik bovenin op <b>Data</b>.</>,
      "Je ziet hoeveel cliënten er actief zijn, hoeveel er trainen en per trainer.",
      <>Onder <b>Aandacht nodig</b> staan cliënten die 14 dagen niet trainden. Onder <b>Hoge pijn</b> wie veel pijn gaf. Bel ze even!</>,
    ],
  },
];

const CLIENT: Topic[] = [
  {
    id: "c-inloggen",
    title: "De eerste keer inloggen",
    video: "c-inloggen",
    mobile: true,
    steps: [
      "Je krijgt een mail van de praktijk.",
      <>Klik op de knop <b>Wachtwoord aanmaken</b>.</>,
      "Kies een wachtwoord. Typ het twee keer.",
      "Vink aan dat je akkoord gaat met de voorwaarden.",
      "Klik op de knop. Je bent binnen!",
      "De volgende keer log je in met je e-mail en wachtwoord.",
    ],
    tip: <>Wachtwoord vergeten? Klik op de inlogpagina op <b>Wachtwoord vergeten?</b>.</>,
  },
  {
    id: "c-app",
    title: "De hub als app op je telefoon",
    mobile: true,
    steps: [
      <><b>iPhone:</b> open de hub in Safari. Tik op het deel-icoon (vierkantje met pijl). Kies <b>Zet op beginscherm</b>.</>,
      <><b>Android:</b> open de hub in Chrome. Tik op de drie puntjes. Kies <b>Toevoegen aan startscherm</b>.</>,
      "Nu staat het logo van Fysiotherapie Nagtzaam op je telefoon. Tik erop en je bent in de hub.",
    ],
  },
  {
    id: "c-training-loggen",
    title: "Een training loggen",
    video: "c-training-loggen",
    mobile: true,
    steps: [
      <>Klik op <b>Start</b> bij je schema.</>,
      "Je oefeningen staan al klaar.",
      "Vul bij elke set de kilo's in. Andere herhalingen? Pas het getal aan.",
      <>Onderaan bij <b>Hoe ging het?</b>: hoe zwaar, hoeveel pijn en hoe je je voelde.</>,
      <>Klik op <b>Training opslaan</b>. Klaar!</>,
    ],
    tip: "Haal je een nieuw record? Dan zie je een PR-label. Goed bezig!",
  },
  {
    id: "c-video",
    title: "Een uitlegvideo kijken",
    video: "c-video",
    mobile: true,
    steps: [
      <>Klik op <b>Mijn schema</b>.</>,
      <>Klik bij een oefening op <b>Bekijk video</b>.</>,
      "Nog een keer klikken en de video is weer dicht.",
    ],
  },
  {
    id: "c-metingen",
    title: "Je gewicht bijhouden",
    video: "c-metingen",
    mobile: true,
    steps: [<>Klik op <b>Metingen</b>.</>, "Vul je gewicht in, en als je het weet de andere getallen van de weegschaal.", <>Klik op <b>Meting opslaan</b>.</>, "In de grafiek zie je hoe het gaat."],
  },
  {
    id: "c-voortgang",
    title: "Je voortgang bekijken",
    mobile: true,
    steps: [<>Klik op <b>Voortgang</b>.</>, "Kies een oefening. Je ziet of je sterker wordt.", "Onder PR's staan je beste prestaties."],
  },
];

function TopicCard({ t }: { t: Topic }) {
  return (
    <section className="card" id={t.id}>
      <div className={t.mobile ? "help-topic mobile" : "help-topic"}>
        {t.video ? (
          <video controls preload="none" playsInline poster={`/help/${t.video}.jpg`} src={`/help/${t.video}.mp4`} aria-label={`Uitlegvideo: ${t.title}`} />
        ) : (
          <div />
        )}
        <div className="stack">
          <h2 className="h2">{t.title}</h2>
          <ol className="help-steps">{t.steps.map((s, i) => <li key={i}><span>{s}</span></li>)}</ol>
          {t.tip && <p className="help-tip"><b>Tip:</b> {t.tip}</p>}
        </div>
      </div>
    </section>
  );
}

export default async function HelpPage({ searchParams }: { searchParams: { voor?: string } }) {
  const me = await requireUser();
  const forClient = me.role === "client" || searchParams.voor === "client";
  const topics = forClient ? CLIENT : TRAINER;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="label">Handboek</p>
          <h1 className="h1">Hulp</h1>
          <p className="muted">Kort filmpje + stap voor stap. Klik op een onderwerp.</p>
        </div>
        {me.role === "trainer" && (
          <div className="actions">
            <Link href="/hulp" className={forClient ? "btn" : "btn btn-primary"}>Voor trainers</Link>
            <Link href="/hulp?voor=client" className={forClient ? "btn btn-primary" : "btn"}>Voor cliënten</Link>
          </div>
        )}
      </div>
      <nav className="help-toc" aria-label="Onderwerpen">
        {topics.map((t) => <a key={t.id} href={`#${t.id}`} className="btn btn-sm">{t.title}</a>)}
      </nav>
      {topics.map((t) => <TopicCard key={t.id} t={t} />)}
      <p className="body-sm muted">
        Vraag of probleem? Vraag het je {forClient ? "trainer" : "collega of Finn"}. Lees ook de <Link href="/voorwaarden">voorwaarden</Link> en de{" "}
        <Link href="/privacy">privacyverklaring</Link>.
      </p>
    </>
  );
}
