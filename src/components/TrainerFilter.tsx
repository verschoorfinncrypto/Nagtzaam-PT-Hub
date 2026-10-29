"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { assignTrainer } from "@/lib/actions";

type Trainer = { id: number; name: string; clients: number };

/** Filter op trainer: Mijn cliënten · Alle · Nog niet gekoppeld · of een specifieke trainer. */
export function TrainerFilterBar({
  basePath,
  trainers,
  meId,
  current,
  total,
  unassigned,
}: {
  basePath: string;
  trainers: Trainer[];
  meId: number;
  current: number | "all" | "none";
  total: number;
  unassigned: number;
}) {
  const router = useRouter();
  const href = (v: string | null) => (v ? `${basePath}?trainer=${v}` : basePath);
  const mine = trainers.find((t) => t.id === meId)?.clients ?? 0;
  const chip = (active: boolean) => (active ? "tag tag-accent filter-chip" : "tag filter-chip");
  return (
    <nav className="filter-bar" aria-label="Filter op trainer">
      <Link href={href(null)} className={chip(current === meId)} aria-current={current === meId ? "true" : undefined}>
        Mijn cliënten ({mine})
      </Link>
      <Link href={href("all")} className={chip(current === "all")} aria-current={current === "all" ? "true" : undefined}>
        Alle ({total})
      </Link>
      {unassigned > 0 && (
        <Link href={href("none")} className={chip(current === "none")} aria-current={current === "none" ? "true" : undefined}>
          Nog niet gekoppeld ({unassigned})
        </Link>
      )}
      <label className="filter-select">
        <span className="label">Trainer</span>
        <select
          className="compact"
          value={typeof current === "number" ? String(current) : ""}
          onChange={(e) => router.push(e.target.value ? (Number(e.target.value) === meId ? href(null) : href(e.target.value)) : href("all"))}
        >
          <option value="">Alle trainers</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}{t.id === meId ? " (jij)" : ""} · {t.clients}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}

/** Trainer van een cliënt direct wijzigen; slaat op zodra je een andere trainer kiest. */
export function AssignTrainerSelect({
  clientId,
  clientName,
  trainerId,
  trainers,
}: {
  clientId: number;
  clientName: string;
  trainerId: number | null;
  trainers: { id: number; name: string }[];
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={assignTrainer}>
      <input type="hidden" name="clientId" value={clientId} />
      <select
        className="compact"
        name="trainerId"
        aria-label={`Trainer van ${clientName}`}
        defaultValue={trainerId ?? ""}
        onChange={() => ref.current?.requestSubmit()}
        style={trainerId ? undefined : { borderColor: "var(--alert)" }}
      >
        <option value="">Nog niet gekoppeld</option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </form>
  );
}
