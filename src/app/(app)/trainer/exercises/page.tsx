import { redirect } from "next/navigation";

// De bibliotheek staat nu op /exercises (ook zichtbaar voor cliënten).
export default function OldExercisesPage() {
  redirect("/exercises");
}
