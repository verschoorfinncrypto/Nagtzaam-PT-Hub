import { WeightCard, WeightForm, WeightTable } from "@/components/overview";
import { requireUser } from "@/lib/auth";
import { getBodyWeights } from "@/lib/data";

export const metadata = { title: "Gewicht" };

export default async function WeightPage() {
  const me = await requireUser("client");
  const weights = await getBodyWeights(me.id, 365);
  return (
    <>
      <div className="page-head">
        <h1 className="h1">Gewicht</h1>
      </div>
      <div className="grid grid-2">
        <WeightCard weights={weights} title="Afgelopen jaar" />
        <section className="card">
          <h2 className="h2">Nieuwe meting</h2>
          <WeightForm clientId={me.id} />
          <p className="hint">Weeg je bij voorkeur op hetzelfde moment van de dag, bijvoorbeeld &apos;s ochtends na het opstaan. Een tweede meting op dezelfde dag overschrijft de eerste.</p>
        </section>
      </div>
      {weights.length > 0 && (
        <section className="card">
          <h2 className="h2">Alle metingen</h2>
          <WeightTable weights={weights} />
        </section>
      )}
    </>
  );
}
