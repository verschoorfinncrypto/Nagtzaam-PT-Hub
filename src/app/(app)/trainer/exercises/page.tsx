import { ActionForm } from "@/components/ActionForm";
import { addExercise } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getExercises } from "@/lib/data";

export const metadata = { title: "Oefeningen" };

const CATEGORIES = ["Benen", "Heup", "Duwen", "Trekken", "Core", "Armen", "Revalidatie", "Mobiliteit", "Conditie", "Overig"];

export default async function ExercisesPage() {
  await requireUser("trainer");
  const list = await getExercises();
  const groups = new Map<string, string[]>();
  for (const e of list) groups.set(e.category, [...(groups.get(e.category) ?? []), e.name]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Oefeningen</h1>
          <p className="muted">{list.length} in de bibliotheek, gedeeld door alle trainers</p>
        </div>
      </div>
      <div className="grid grid-2">
        <section className="card">
          <h2 className="h2">Oefening toevoegen</h2>
          <ActionForm action={addExercise} submitLabel="Toevoegen" resetOnOk>
            <label className="field">
              <span className="label">Naam</span>
              <input name="name" required maxLength={80} placeholder="Bijv. Spanish squat" />
            </label>
            <label className="field">
              <span className="label">Categorie</span>
              <select name="category" defaultValue="Overig">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </ActionForm>
        </section>
        <section className="card">
          {[...groups.entries()].map(([cat, names]) => (
            <div key={cat}>
              <p className="label">{cat}</p>
              <p className="body-sm">{names.join(" · ")}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
