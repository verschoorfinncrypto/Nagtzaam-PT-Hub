/** Blokken binnen een trainingsdag, in vaste volgorde. */
export const SECTIONS = ["warmup", "main", "cooldown"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABEL: Record<Section, string> = {
  warmup: "Warming-up",
  main: "Hoofdblok",
  cooldown: "Cooling-down",
};

export function isSection(v: unknown): v is Section {
  return v === "warmup" || v === "main" || v === "cooldown";
}

/** Sorteer op blok en daarbinnen op positie. */
export function sortBySection<T extends { section: string; position: number }>(items: T[]) {
  return [...items].sort((a, b) => SECTIONS.indexOf(a.section as Section) - SECTIONS.indexOf(b.section as Section) || a.position - b.position);
}
