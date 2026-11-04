import { BodyProfileForm, MeasurementChart, MeasurementForm, MeasurementSummary, MeasurementTable } from "@/components/measurements";
import { requireUser } from "@/lib/auth";
import { getBodyWeights } from "@/lib/data";

export const metadata = { title: "Metingen" };

export default async function MeasurementsPage({ searchParams }: { searchParams: { m?: string } }) {
  const me = await requireUser("client");
  const rows = await getBodyWeights(me.id, 3650);
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Metingen</h1>
          <p className="muted">Gewicht en alle waarden van de weegschaal, met wat gezond is en wat aandacht vraagt.</p>
        </div>
      </div>
      <section className="card">
        <h2 className="h2">Laatste meting</h2>
        <MeasurementSummary rows={rows} profile={me} />
      </section>
      <div className="grid grid-2">
        <MeasurementChart rows={rows} metric={searchParams.m} baseHref="/weight" />
        <section className="card">
          <h2 className="h2">Nieuwe meting</h2>
          <MeasurementForm clientId={me.id} />
        </section>
      </div>
      <section className="card">
        <h2 className="h2">Over jou</h2>
        <BodyProfileForm profile={me} />
      </section>
      {rows.length > 0 && (
        <section className="card">
          <h2 className="h2">Alle metingen</h2>
          <MeasurementTable rows={rows} profile={me} />
        </section>
      )}
    </>
  );
}
