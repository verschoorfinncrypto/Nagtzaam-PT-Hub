/** Maximale lengtes van schemavelden; gedeeld door de bouwer (maxLength) en de server-validatie. */
export const PROGRAM_LIMITS = {
  reps: 30,
  rpe: 40,
  rest: 30,
  load: 60,
  notes: 300,
  sets: 20,
  dayName: 80,
  name: 120,
  programNotes: 2000,
} as const;

export const FIELD_LABELS: Record<string, string> = {
  sets: "Sets",
  reps: "Reps",
  rpe: "RPE",
  rest: "Rust",
  load: "Belasting",
  notes: "Notitie",
  exerciseId: "Oefening",
};
