import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { addExercise, setExerciseVideo } from "@/lib/actions";
import { videoHref } from "@/lib/video";
import { requireUser } from "@/lib/auth";
import { getExerciseFacets, searchExercises, type ExerciseFilter } from "@/lib/data";

export const metadata = { title: "Oefeningen" };

const PURPOSE_LABEL: Record<string, string> = { revalidatie: "Revalidatie", kracht: "Kracht", beide: "Reva + kracht" };
const LEVEL_LABEL: Record<number, string> = { 1: "Basis", 2: "Gevorderd", 3: "Zwaar" };

export default async function ExercisesPage({ searchParams }: { searchParams: ExerciseFilter }) {
  const me = await requireUser();
  const f: ExerciseFilter = {
    q: searchParams.q?.slice(0, 80),
    cat: searchParams.cat,
    region: searchParams.region,
    purpose: searchParams.purpose,
    equipment: searchParams.equipment,
    level: searchParams.level,
  };
  const [list, facets] = await Promise.all([searchExercises(f), getExerciseFacets()]);
  const filtered = Object.values(f).some(Boolean);
  const groups = new Map<string, typeof list>();
  for (const e of list) groups.set(e.category, [...(groups.get(e.category) ?? []), e]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Oefeningen</h1>
          <p className="muted">
            {filtered ? `${list.length} gevonden` : `${list.length} oefeningen`} voor revalidatie en spieropbouw
          </p>
        </div>
      </div>

      <form className="card filters" method="get" role="search">
        <label className="field filters-q">
          <span className="label">Zoeken</span>
          <input type="search" name="q" defaultValue={f.q ?? ""} placeholder="Naam, spiergroep of uitvoering, bijv. ‘knie’ of ‘hamstrings’" />
        </label>
        <label className="field">
          <span className="label">Doel</span>
          <select name="purpose" defaultValue={f.purpose ?? ""}>
            <option value="">Alles</option>
            <option value="revalidatie">Revalidatie</option>
            <option value="kracht">Kracht en spieropbouw</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Regio</span>
          <select name="region" defaultValue={f.region ?? ""}>
            <option value="">Alle regio&apos;s</option>
            {facets.regions.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Categorie</span>
          <select name="cat" defaultValue={f.cat ?? ""}>
            <option value="">Alle categorieën</option>
            {facets.categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Materiaal</span>
          <select name="equipment" defaultValue={f.equipment ?? ""}>
            <option value="">Alles</option>
            {facets.equipment.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Niveau</span>
          <select name="level" defaultValue={f.level ?? ""}>
            <option value="">Alle</option>
            <option value="1">Basis</option>
            <option value="2">Gevorderd</option>
            <option value="3">Zwaar</option>
          </select>
        </label>
        <div className="actions filters-actions">
          <button type="submit" className="btn btn-primary">Zoeken</button>
          {filtered && <Link href="/exercises" className="btn btn-ghost">Wis filters</Link>}
        </div>
      </form>

      {list.length === 0 && <div className="empty">Geen oefeningen gevonden met deze filters.</div>}

      {[...groups.entries()].map(([cat, items]) => (
        <section key={cat} className="card">
          <div className="card-head">
            <h2 className="h2">{cat}</h2>
            <span className="body-sm muted">{items.length}</span>
          </div>
          <ul className="list ex-list">
            {items.map((e) => (
              <li key={e.id}>
                <details>
                  <summary>
                    <span className="ex-name">{e.name}</span>
                    <span className="ex-meta">
                      {e.purpose && (
                        <span className={e.purpose === "revalidatie" ? "tag tag-positive" : e.purpose === "kracht" ? "tag" : "tag tag-accent"}>
                          {PURPOSE_LABEL[e.purpose]}
                        </span>
                      )}
                      {e.region && <span className="body-sm muted">{e.region}</span>}
                    </span>
                  </summary>
                  <div className="ex-detail">
                    {e.cues && <p>{e.cues}</p>}
                    <a className="video-link" href={videoHref(e.name, e.videoUrl)} target="_blank" rel="noopener noreferrer">
                      ▶ {e.videoUrl ? "Uitlegvideo" : "Uitlegvideo zoeken op YouTube"}
                    </a>
                    <dl>
                      {e.muscles && <><dt>Spieren</dt><dd>{e.muscles}</dd></>}
                      {e.equipment && <><dt>Materiaal</dt><dd>{e.equipment}</dd></>}
                      {e.level && <><dt>Niveau</dt><dd>{LEVEL_LABEL[e.level]}</dd></>}
                      {!e.builtIn && <><dt>Bron</dt><dd>Toegevoegd door een trainer</dd></>}
                    </dl>
                    {me.role === "trainer" && (
                      <ActionForm action={setExerciseVideo} submitLabel="Video opslaan" submitClass="btn btn-sm" className="video-form">
                        <input type="hidden" name="exerciseId" value={e.id} />
                        <label className="field">
                          <span className="label">Vaste uitlegvideo (optioneel)</span>
                          <input name="videoUrl" type="url" inputMode="url" defaultValue={e.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
                          <span className="hint">Leeg laten = link naar YouTube-zoekresultaten. Een vaste video verschijnt direct in alle schema&apos;s met deze oefening.</span>
                        </label>
                      </ActionForm>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {me.role === "trainer" && (
        <section className="card" style={{ maxWidth: 720 }}>
          <h2 className="h2">Eigen oefening toevoegen</h2>
          <p className="hint">Komt in de bibliotheek van alle trainers en is direct te kiezen in schema&apos;s en de logger.</p>
          <ActionForm action={addExercise} submitLabel="Oefening toevoegen" resetOnOk>
            <label className="field">
              <span className="label">Naam</span>
              <input name="name" required maxLength={80} placeholder="Bijv. Spanish squat op 60°" />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="label">Categorie</span>
                <select name="category" defaultValue="Kniedominant">
                  {facets.categories.map((c) => <option key={c}>{c}</option>)}
                  <option>Overig</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Regio</span>
                <select name="region" defaultValue="">
                  <option value="">–</option>
                  {facets.regions.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="label">Materiaal</span>
                <select name="equipment" defaultValue="">
                  <option value="">–</option>
                  {facets.equipment.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="label">Doel</span>
                <select name="purpose" defaultValue="beide">
                  <option value="revalidatie">Revalidatie</option>
                  <option value="kracht">Kracht</option>
                  <option value="beide">Beide</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Niveau</span>
                <select name="level" defaultValue="1">
                  <option value="1">Basis</option>
                  <option value="2">Gevorderd</option>
                  <option value="3">Zwaar</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span className="label">Spieren</span>
              <input name="muscles" maxLength={200} placeholder="Bijv. Quadriceps, patellapees" />
            </label>
            <label className="field">
              <span className="label">Uitvoering</span>
              <textarea name="cues" maxLength={600} placeholder="Korte instructie voor de cliënt" />
            </label>
            <label className="field">
              <span className="label">Uitlegvideo (optioneel)</span>
              <input name="videoUrl" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" />
            </label>
          </ActionForm>
        </section>
      )}
    </>
  );
}
