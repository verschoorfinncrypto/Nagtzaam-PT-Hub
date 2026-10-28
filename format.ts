const nl = "nl-NL";

export function kg(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString(nl, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function shortDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(nl, { weekday: "short", day: "numeric", month: "short" });
}

export function longDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(nl, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Vandaag als YYYY-MM-DD in Nederlandse tijd. */
export function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function daysAgo(n: number) {
  const d = new Date(today() + "T12:00:00");
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Maandag van de week van een datum (YYYY-MM-DD). */
export function weekStart(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Geschatte 1RM (Epley). Bij 1 herhaling is het het gewicht zelf. */
export function e1rm(weight: number, reps: number) {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Leest "82,4" en "82.4" allebei. */
export function parseNum(v: FormDataEntryValue | string | null | undefined) {
  if (v == null) return NaN;
  return Number(String(v).trim().replace(",", "."));
}
