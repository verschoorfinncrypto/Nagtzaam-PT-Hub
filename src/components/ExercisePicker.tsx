"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

export type PickerExercise = {
  id: number;
  name: string;
  category: string;
  region: string | null;
  purpose: string | null;
  cues: string | null;
  muscles?: string | null;
  videoUrl?: string | null;
};

const PURPOSE_LABEL: Record<string, string> = { revalidatie: "Revalidatie", kracht: "Kracht", beide: "Reva + kracht" };

/** Kleine letters, zonder accenten en leestekens: "Cliënt-squat (DB)" → "client squat db". */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Afkortingen en Nederlandse termen die trainers vaak typen → woorden in de oefennamen. */
const ALIASES: Record<string, string> = {
  rdl: "romanian deadlift",
  sldl: "single leg romanian deadlift",
  ohp: "overhead press",
  bss: "bulgarian split squat",
  tke: "terminal knee extension",
  slr: "straight leg raise",
  db: "dumbbell",
  kb: "kettlebell",
  bb: "barbell",
  brug: "bridge",
  bekkenlift: "bridge",
  roeien: "row",
  drukken: "press",
  opdrukken: "push up",
  optrekken: "pull up",
  plankje: "plank",
  kuit: "calf",
  hiel: "heel",
  zijplank: "side plank",
  uitvalspas: "lunge",
  traplopen: "step",
};

/** Punten voor één woord (of woordgroep) tegen naam en extra velden; 0 = komt niet voor. */
function termScore(term: string, name: string, words: string[], extra: string) {
  let total = 0;
  for (const t of term.split(" ")) {
    if (words.some((w) => w === t)) total += 60;
    else if (words.some((w) => w.startsWith(t))) total += 40;
    else if (name.includes(t)) total += 15;
    else if (extra.includes(t)) total += 5;
    else return 0;
  }
  return total;
}

/** Score voor hoe goed een oefening bij de zoektekst past; 0 = geen match. Woorden mogen in elke volgorde,
 *  en een afkorting of Nederlandse term telt ook via zijn vertaling (rdl → romanian deadlift, brug → bridge). */
export function scoreExercise(query: string, e: PickerExercise) {
  const q = normalize(query);
  if (!q) return 0;
  const name = normalize(e.name);
  const words = name.split(" ");
  const extra = normalize(`${e.category} ${e.region ?? ""} ${e.muscles ?? ""}`);
  if (name === q) return 1000;
  let score = name.startsWith(q) ? 300 : 0;
  for (const t of q.split(" ")) {
    const direct = termScore(t, name, words, extra);
    const alias = ALIASES[t] ? termScore(ALIASES[t], name, words, extra) : 0;
    const best = Math.max(direct, alias);
    if (best === 0) return 0; // elk zoekwoord moet ergens voorkomen
    score += best;
  }
  return score + 1 / (name.length + 1); // bij gelijke score wint de kortere naam
}

/** Voor achterwaartse compatibiliteit; de kiezer heeft geen datalist meer nodig. */
export function ExerciseDatalist(_: { id: string; exercises: PickerExercise[] }) {
  return null;
}

/** Zoekveld met suggesties: typ een deel van de naam (woorden in elke volgorde) en kies of druk Enter. */
export function ExercisePicker({
  exercises,
  value,
  onChange,
  ariaLabel,
  compact,
  onUnmatched,
}: {
  listId?: string;
  exercises: PickerExercise[];
  value: number | "";
  onChange: (id: number | "") => void;
  ariaLabel: string;
  compact?: boolean;
  /** Krijgt de getypte tekst als er geen oefening bij past (geen suggesties, of weggeklikt zonder keuze), anders "". */
  onUnmatched?: (text: string) => void;
}) {
  const nameOf = (id: number | "") => (id === "" ? "" : exercises.find((e) => e.id === id)?.name ?? "");
  const [text, setText] = useState(nameOf(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    // Volg externe wijzigingen (andere schemadag, net toegevoegde oefening).
    if (value !== "" && nameOf(value) !== text) setText(nameOf(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, exercises]);

  const suggestions = useMemo(() => {
    if (!text.trim()) return [];
    return exercises
      .map((e) => ({ e, s: scoreExercise(text, e) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.e);
  }, [text, exercises]);

  const selected = value !== "" ? exercises.find((e) => e.id === value) : undefined;
  const isSelected = !!selected && normalize(selected.name) === normalize(text);
  const showList = open && !isSelected && suggestions.length > 0;

  useEffect(() => {
    if (!onUnmatched) return;
    const t = text.trim();
    if (!t || isSelected) onUnmatched("");
    else if (suggestions.length === 0 || !open) onUnmatched(t.length >= 2 ? t : "");
    else onUnmatched("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isSelected, suggestions.length, open]);

  // De lijst staat "fixed" zodat een tabel met overflow hem niet afknipt.
  useLayoutEffect(() => {
    if (!showList) return;
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setPos({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 260) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [showList]);

  function pick(e: PickerExercise) {
    setText(e.name);
    onChange(e.id);
    setOpen(false);
  }

  return (
    <>
      <input
        ref={inputRef}
        className={compact ? "compact" : undefined}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        aria-invalid={(text.trim() !== "" && !isSelected && !open) || undefined}
        placeholder="Typ om te zoeken…"
        value={text}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        style={text.trim() !== "" && !isSelected && !open ? { borderColor: "var(--alert)" } : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
          const exact = exercises.find((x) => normalize(x.name) === normalize(e.target.value));
          onChange(exact ? exact.id : "");
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" || e.key === "Tab") {
            if (suggestions[active]) {
              if (e.key === "Enter") e.preventDefault();
              pick(suggestions[active]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => {
          // Kleine vertraging zodat een tik op een suggestie eerst telt.
          setTimeout(() => {
            setOpen(false);
            if (!isSelected && suggestions.length === 1) pick(suggestions[0]);
          }, 150);
        }}
      />
      {showList && pos && (
        <ul id={listId} role="listbox" className="ex-suggest" style={{ left: pos.left, top: pos.top, width: pos.width }}>
          {suggestions.map((e, i) => (
            <li
              key={e.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : undefined}
              onPointerDown={(ev) => {
                ev.preventDefault(); // focus in het veld houden
                pick(e);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ex-suggest-name">{e.name}</span>
              <span className="ex-suggest-meta">
                {[e.category, e.region, e.purpose ? PURPOSE_LABEL[e.purpose] : null].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
