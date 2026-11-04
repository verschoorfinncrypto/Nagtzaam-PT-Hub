import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAccess, requireUser } from "@/lib/auth";
import { getActiveProgram, getGroup } from "@/lib/data";
import { longDate, today } from "@/lib/format";
import { SECTION_LABEL, type Section } from "@/lib/sections";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Schema printen" };
export const dynamic = "force-dynamic";

/** Printvriendelijk schema (A4), voor de cliënt zelf of voor een trainer (?client=). */
export default async function PrintSchemaPage({ searchParams }: { searchParams: { client?: string; group?: string } }) {
  const me = await requireUser();
  let who: string;
  let program;
  let back: string;
  if (me.role === "trainer" && searchParams.group) {
    const g = await getGroup(Number(searchParams.group));
    if (!g) notFound();
    who = g.name;
    program = g.program;
    back = `/trainer/groups/${g.id}`;
  } else {
    const clientId = me.role === "trainer" ? Number(searchParams.client) : me.id;
    const { client } = await requireClientAccess(clientId);
    who = client.name;
    program = await getActiveProgram(client.id);
    back = me.role === "trainer" ? `/trainer/clients/${client.id}` : "/schema";
  }
  if (!program) notFound();

  return (
    <main className="print-page">
      <div className="print-toolbar no-print">
        <Link href={back} className="btn">← Terug</Link>
        <PrintButton />
        <span className="hint">Kies bij printen &quot;Opslaan als PDF&quot; om het schema als bestand te bewaren of te delen.</span>
      </div>

      <header className="print-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-navy.png" alt="Fysiotherapie Nagtzaam" width={180} height={36} />
        <div>
          <h1>{program.name}</h1>
          <p>
            {who} · {longDate(today())}
          </p>
        </div>
      </header>

      {program.notes && <p className="print-notes">{program.notes}</p>}

      {program.days.map((d) => (
        <section key={d.id} className="print-day">
          <h2>{d.name}</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Oefening</th>
                <th>Sets × reps</th>
                <th>RPE</th>
                <th>Rust</th>
                <th>Pijngrens</th>
                <th>Belasting</th>
                <th className="print-check">✓</th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((it, idx) => [
                (idx === 0 || d.items[idx - 1].section !== it.section) && d.items.some((x) => x.section !== "main") ? (
                  <tr key={`h-${it.section}`} className="print-section">
                    <td colSpan={7}>{SECTION_LABEL[it.section as Section] ?? "Hoofdblok"}</td>
                  </tr>
                ) : null,
                <tr key={it.id}>
                  <td>
                    <b>{it.exerciseName}</b>
                    {it.notes && <div className="print-small">{it.notes}</div>}
                    {it.cues && <div className="print-small print-cue">{it.cues}</div>}
                  </td>
                  <td>{it.sets} × {it.reps}</td>
                  <td>{it.rpe || "–"}</td>
                  <td>{it.rest || "–"}</td>
                  <td>{it.painLimit || "–"}</td>
                  <td>{it.load || "zelf kiezen"}</td>
                  <td className="print-check">☐</td>
                </tr>,
              ])}
            </tbody>
          </table>
        </section>
      ))}

      <footer className="print-foot">
        Fysiotherapie Nagtzaam · PT Hub. Uitlegvideo&apos;s en je voortgang vind je in de hub. Bij pijn boven je pijngrens: stop en overleg met je trainer.
      </footer>
    </main>
  );
}
