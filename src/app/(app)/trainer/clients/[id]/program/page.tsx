import { redirect } from "next/navigation";

// Schema's worden nu gebouwd in het tabblad Schema's.
export default function OldProgramPage({ params }: { params: { id: string } }) {
  redirect(`/trainer/schemas/new?client=${Number(params.id)}`);
}
