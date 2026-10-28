import { ProgressView } from "@/components/ProgressView";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Voortgang" };

export default async function ProgressPage({ searchParams }: { searchParams: { ex?: string } }) {
  const me = await requireUser("client");
  return (
    <>
      <div className="page-head">
        <h1 className="h1">Voortgang</h1>
      </div>
      <ProgressView clientId={me.id} exerciseId={searchParams.ex ? Number(searchParams.ex) : undefined} baseHref="/progress" />
    </>
  );
}
