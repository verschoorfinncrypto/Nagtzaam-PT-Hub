/**
 * Indicatieve referentiewaarden voor lichaamsmetingen, om in één oogopslag te zien wat gezond is of aandacht vraagt.
 * Bronnen: BMI en buikomtrek volgens WHO; vetpercentage volgens Gallagher et al. (2000) per leeftijd en geslacht;
 * visceraal vet en vochtpercentage volgens de schalen van Tanita/Omron. Geen diagnose: altijd in context bekijken.
 */

export type Sex = "m" | "v";
export type Level = "good" | "attention" | "high" | "low" | "info";
export type Marker = { level: Level; label: string; range?: string };

export type MetricKey =
  | "weightKg"
  | "bmi"
  | "fatPct"
  | "visceralFat"
  | "muscleKg"
  | "boneKg"
  | "waterPct"
  | "bmr"
  | "metabolicAge"
  | "waistCm"
  | "hipCm";

export const METRICS: { key: MetricKey; label: string; unit: string; step: string; min: number; max: number; group: "Weegschaal" | "Omtrek" }[] = [
  { key: "weightKg", label: "Gewicht", unit: "kg", step: "0.1", min: 20, max: 400, group: "Weegschaal" },
  { key: "bmi", label: "BMI", unit: "", step: "0.1", min: 10, max: 80, group: "Weegschaal" },
  { key: "fatPct", label: "Vetpercentage", unit: "%", step: "0.1", min: 2, max: 75, group: "Weegschaal" },
  { key: "visceralFat", label: "Visceraal vet", unit: "", step: "0.5", min: 1, max: 59, group: "Weegschaal" },
  { key: "muscleKg", label: "Spiermassa", unit: "kg", step: "0.1", min: 5, max: 150, group: "Weegschaal" },
  { key: "boneKg", label: "Botmassa", unit: "kg", step: "0.1", min: 0.5, max: 10, group: "Weegschaal" },
  { key: "waterPct", label: "Vochtpercentage", unit: "%", step: "0.1", min: 20, max: 80, group: "Weegschaal" },
  { key: "bmr", label: "BMR (rustverbranding)", unit: "kcal", step: "1", min: 500, max: 5000, group: "Weegschaal" },
  { key: "metabolicAge", label: "Metabole leeftijd", unit: "jaar", step: "1", min: 10, max: 99, group: "Weegschaal" },
  { key: "waistCm", label: "Buikomtrek", unit: "cm", step: "0.5", min: 40, max: 200, group: "Omtrek" },
  { key: "hipCm", label: "Heupomtrek", unit: "cm", step: "0.5", min: 50, max: 200, group: "Omtrek" },
];

export function bmiFrom(weightKg: number | null | undefined, heightCm: number | null | undefined) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Vetpercentage-grenzen (gezond van–tot, overgewicht tot) per geslacht en leeftijdsgroep, Gallagher 2000. */
function fatRanges(sex: Sex, age: number) {
  const band = age < 40 ? 0 : age < 60 ? 1 : 2;
  const v = [
    [21, 32, 38],
    [23, 33, 39],
    [24, 35, 41],
  ];
  const m = [
    [8, 19, 24],
    [11, 21, 27],
    [13, 24, 29],
  ];
  const [lo, hi, over] = (sex === "v" ? v : m)[band];
  return { lo, hi, over };
}

export function assess(key: MetricKey, value: number | null | undefined, ctx: { sex?: Sex | null; age?: number | null; heightCm?: number | null }): Marker | null {
  if (value == null || Number.isNaN(value)) return null;
  const { sex, age } = ctx;
  switch (key) {
    case "bmi":
      if (value < 18.5) return { level: "low", label: "Ondergewicht", range: "18,5–24,9" };
      if (value < 25) return { level: "good", label: "Gezond", range: "18,5–24,9" };
      if (value < 30) return { level: "attention", label: "Overgewicht", range: "18,5–24,9" };
      return { level: "high", label: "Obesitas", range: "18,5–24,9" };
    case "fatPct": {
      if (!sex || !age) return { level: "info", label: "Vul geslacht en geboortejaar in voor een referentie" };
      const r = fatRanges(sex, age);
      const range = `${r.lo}–${r.hi}%`;
      if (value < r.lo) return { level: "low", label: "Laag", range };
      if (value <= r.hi) return { level: "good", label: "Gezond", range };
      if (value <= r.over) return { level: "attention", label: "Verhoogd", range };
      return { level: "high", label: "Hoog", range };
    }
    case "visceralFat":
      if (value <= 12) return { level: "good", label: "Gezond", range: "1–12" };
      return { level: "high", label: "Te hoog", range: "1–12" };
    case "waterPct": {
      if (!sex) return { level: "info", label: "Vul geslacht in voor een referentie" };
      const [lo, hi] = sex === "v" ? [45, 60] : [50, 65];
      const range = `${lo}–${hi}%`;
      if (value < lo) return { level: "low", label: "Laag", range };
      if (value > hi) return { level: "attention", label: "Hoog", range };
      return { level: "good", label: "Gezond", range };
    }
    case "waistCm": {
      if (!sex) return { level: "info", label: "Vul geslacht in voor een referentie" };
      const [ok, high] = sex === "v" ? [80, 88] : [94, 102];
      const range = `< ${ok} cm`;
      if (value < ok) return { level: "good", label: "Gezond", range };
      if (value <= high) return { level: "attention", label: "Verhoogd risico", range };
      return { level: "high", label: "Sterk verhoogd risico", range };
    }
    case "metabolicAge":
      if (!age) return { level: "info", label: "Vul geboortejaar in om te vergelijken" };
      if (value <= age) return { level: "good", label: `Gelijk aan of jonger dan echte leeftijd (${age})` };
      return { level: "attention", label: `Ouder dan echte leeftijd (${age})` };
    default:
      return null; // gewicht, spier-, botmassa, BMR, heupomtrek: alleen het verloop
  }
}

export const LEVEL_TAG: Record<Level, string> = {
  good: "tag tag-positive",
  attention: "tag tag-alert",
  high: "tag tag-alert",
  low: "tag tag-alert",
  info: "tag",
};

/** Bij deze metingen is lager beter (voor de pijlrichting bij het verschil). */
export const LOWER_IS_BETTER: Partial<Record<MetricKey, boolean>> = { fatPct: true, visceralFat: true, waistCm: true, metabolicAge: true, bmi: true };
