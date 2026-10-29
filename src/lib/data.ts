import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  bodyWeights,
  db,
  exercises,
  programDays,
  programExercises,
  programs,
  users,
  workouts,
  workoutSets,
} from "@/db";
import { daysAgo, e1rm, weekStart } from "./format";

export async function getExercises() {
  return db.select().from(exercises).orderBy(asc(exercises.category), asc(exercises.name));
}

/** Voor de kiezers in schema en logger: alleen wat de client nodig heeft. */
export async function getExerciseOptions() {
  return db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      region: exercises.region,
      purpose: exercises.purpose,
      cues: exercises.cues,
      muscles: exercises.muscles,
      videoUrl: exercises.videoUrl,
    })
    .from(exercises)
    .orderBy(asc(exercises.name));
}

export type ExerciseFilter = { q?: string; cat?: string; region?: string; purpose?: string; equipment?: string; level?: string };

export async function searchExercises(f: ExerciseFilter) {
  const conds = [];
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    conds.push(or(ilike(exercises.name, like), ilike(exercises.muscles, like), ilike(exercises.cues, like)));
  }
  if (f.cat) conds.push(eq(exercises.category, f.cat));
  if (f.region) conds.push(eq(exercises.region, f.region));
  if (f.equipment) conds.push(eq(exercises.equipment, f.equipment));
  if (f.purpose === "revalidatie") conds.push(inArray(exercises.purpose, ["revalidatie", "beide"]));
  if (f.purpose === "kracht") conds.push(inArray(exercises.purpose, ["kracht", "beide"]));
  if (f.level && /^[123]$/.test(f.level)) conds.push(eq(exercises.level, Number(f.level)));
  return db
    .select()
    .from(exercises)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(exercises.category), asc(exercises.name));
}

/** De waarden die voorkomen, voor de filtermenu's. */
export async function getExerciseFacets() {
  const rows = await db
    .select({ category: exercises.category, region: exercises.region, equipment: exercises.equipment })
    .from(exercises);
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "nl"));
  return {
    categories: uniq(rows.map((r) => r.category)),
    regions: uniq(rows.map((r) => r.region)),
    equipment: uniq(rows.map((r) => r.equipment)),
  };
}

export type ProgramWithDays = NonNullable<Awaited<ReturnType<typeof getActiveProgram>>>;

export async function getActiveProgram(clientId: number) {
  const [p] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.clientId, clientId), eq(programs.active, true)))
    .orderBy(desc(programs.createdAt))
    .limit(1);
  if (!p) return null;
  const days = await db.select().from(programDays).where(eq(programDays.programId, p.id)).orderBy(asc(programDays.position));
  const items = days.length
    ? await db
        .select({
          id: programExercises.id,
          dayId: programExercises.dayId,
          exerciseId: programExercises.exerciseId,
          exerciseName: exercises.name,
          cues: exercises.cues,
          videoUrl: exercises.videoUrl,
          position: programExercises.position,
          sets: programExercises.sets,
          reps: programExercises.reps,
          rpe: programExercises.rpe,
          rest: programExercises.rest,
          painLimit: programExercises.painLimit,
          load: programExercises.load,
          notes: programExercises.notes,
        })
        .from(programExercises)
        .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
        .where(inArray(programExercises.dayId, days.map((d) => d.id)))
        .orderBy(asc(programExercises.position))
    : [];
  return { ...p, days: days.map((d) => ({ ...d, items: items.filter((i) => i.dayId === d.id) })) };
}

export async function getWorkouts(clientId: number, limit = 50) {
  const rows = await db
    .select({
      id: workouts.id,
      date: workouts.date,
      title: workouts.title,
      rpe: workouts.rpe,
      sets: sql<number>`count(${workoutSets.id})::int`,
      volume: sql<number>`coalesce(sum(${workoutSets.reps} * ${workoutSets.weight}), 0)::float`,
    })
    .from(workouts)
    .leftJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(eq(workouts.clientId, clientId))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date), desc(workouts.id))
    .limit(limit);
  return rows;
}

export async function getWorkout(id: number) {
  const [w] = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  if (!w) return null;
  const sets = await db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      exerciseName: exercises.name,
      position: workoutSets.position,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(eq(workoutSets.workoutId, id))
    .orderBy(asc(workoutSets.position), asc(workoutSets.setNumber));
  const groups: { exerciseId: number; exerciseName: string; sets: typeof sets }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.exerciseId === s.exerciseId && last.sets[0].position === s.position) last.sets.push(s);
    else groups.push({ exerciseId: s.exerciseId, exerciseName: s.exerciseName, sets: [s] });
  }
  return { ...w, groups };
}

export async function getBodyWeights(clientId: number, sinceDays = 365) {
  return db
    .select()
    .from(bodyWeights)
    .where(and(eq(bodyWeights.clientId, clientId), gte(bodyWeights.date, daysAgo(sinceDays))))
    .orderBy(asc(bodyWeights.date));
}

export type PR = {
  exerciseId: number;
  exerciseName: string;
  bestE1rm: number;
  bestSet: { weight: number; reps: number; date: string };
  heaviest: { weight: number; reps: number; date: string };
  recent: boolean;
};

/** Persoonlijke records per oefening: hoogste geschatte 1RM en zwaarste set. */
export async function getPRs(clientId: number): Promise<PR[]> {
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      exerciseName: exercises.name,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      date: workouts.date,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(and(eq(workouts.clientId, clientId), sql`${workoutSets.weight} > 0`));

  const recentFrom = daysAgo(14);
  const map = new Map<number, PR>();
  for (const r of rows) {
    const est = e1rm(r.weight, r.reps);
    const cur = map.get(r.exerciseId);
    if (!cur) {
      map.set(r.exerciseId, {
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        bestE1rm: est,
        bestSet: { weight: r.weight, reps: r.reps, date: r.date },
        heaviest: { weight: r.weight, reps: r.reps, date: r.date },
        recent: false,
      });
      continue;
    }
    if (est > cur.bestE1rm || (est === cur.bestE1rm && r.date < cur.bestSet.date)) {
      cur.bestE1rm = est;
      cur.bestSet = { weight: r.weight, reps: r.reps, date: r.date };
    }
    if (r.weight > cur.heaviest.weight || (r.weight === cur.heaviest.weight && r.reps > cur.heaviest.reps)) {
      cur.heaviest = { weight: r.weight, reps: r.reps, date: r.date };
    }
  }
  const list = [...map.values()];
  for (const p of list) p.recent = p.bestSet.date >= recentFrom;
  return list.sort((a, b) => b.bestE1rm - a.bestE1rm);
}

/** Verloop van de geschatte 1RM voor één oefening (beste per training). */
export async function getE1rmHistory(clientId: number, exerciseId: number) {
  const rows = await db
    .select({ date: workouts.date, weight: workoutSets.weight, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(and(eq(workouts.clientId, clientId), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(asc(workouts.date));
  const best = new Map<string, number>();
  for (const r of rows) best.set(r.date, Math.max(best.get(r.date) ?? 0, e1rm(r.weight, r.reps)));
  return [...best.entries()].map(([date, value]) => ({ date, value }));
}

/** Trainingen en volume (kg × reps) per week, oudste eerst. */
export async function getWeekly(clientId: number, weeks = 8) {
  const from = weekStart(daysAgo((weeks - 1) * 7));
  const rows = await db
    .select({
      id: workouts.id,
      date: workouts.date,
      volume: sql<number>`coalesce(sum(${workoutSets.reps} * ${workoutSets.weight}), 0)::float`,
    })
    .from(workouts)
    .leftJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(and(eq(workouts.clientId, clientId), gte(workouts.date, from)))
    .groupBy(workouts.id);
  const out: { week: string; sessions: number; volume: number }[] = [];
  const start = new Date(from + "T12:00:00");
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    out.push({ week: d.toISOString().slice(0, 10), sessions: 0, volume: 0 });
  }
  for (const r of rows) {
    const bucket = out.find((b) => b.week === weekStart(r.date));
    if (bucket) {
      bucket.sessions += 1;
      bucket.volume += r.volume;
    }
  }
  return out;
}

/** Per oefening de sets van de meest recente training waarin die oefening zat. */
export async function getLastSets(clientId: number) {
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      workoutId: workouts.id,
      date: workouts.date,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
      setNumber: workoutSets.setNumber,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(eq(workouts.clientId, clientId))
    .orderBy(desc(workouts.date), desc(workouts.id), asc(workoutSets.setNumber));
  const out: Record<number, { date: string; sets: { reps: number; weight: number }[] }> = {};
  const seenWorkout: Record<number, number> = {};
  for (const r of rows) {
    if (seenWorkout[r.exerciseId] === undefined) seenWorkout[r.exerciseId] = r.workoutId;
    if (seenWorkout[r.exerciseId] !== r.workoutId) continue;
    (out[r.exerciseId] ??= { date: r.date, sets: [] }).sets.push({ reps: r.reps, weight: r.weight });
  }
  return out;
}

/** Filter op trainer: een trainer-id, "all" (hele praktijk) of "none" (nog niet gekoppeld). */
export type TrainerFilter = number | "all" | "none";

/** Leest ?trainer= uit de URL. Zonder parameter: de eigen cliënten van de ingelogde trainer. */
export function parseTrainerFilter(v: string | undefined, meId: number): TrainerFilter {
  if (v === "all" || v === "none") return v;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : meId;
}

function trainerCond(f: TrainerFilter) {
  if (f === "all") return undefined;
  if (f === "none") return isNull(users.trainerId);
  return eq(users.trainerId, f);
}

export async function getTrainers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      clients: sql<number>`(select count(*) from users c where c.trainer_id = "users"."id" and c.role = 'client')::int`,
    })
    .from(users)
    .where(eq(users.role, "trainer"))
    .orderBy(asc(users.name));
}

export async function countUnassigned() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "client"), isNull(users.trainerId)));
  return r?.n ?? 0;
}

const trainerUser = alias(users, "trainer_user");

export async function getClients(filter: TrainerFilter) {
  const clients = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      goal: users.goal,
      createdAt: users.createdAt,
      // Volledig gekwalificeerd i.v.m. de join met trainer_user.
      canLogin: sql<boolean>`"users"."password_hash" like '$2%'`,
      trainerId: users.trainerId,
      trainerName: trainerUser.name,
    })
    .from(users)
    .leftJoin(trainerUser, eq(trainerUser.id, users.trainerId))
    .where(and(eq(users.role, "client"), trainerCond(filter)))
    .orderBy(asc(users.name));
  if (!clients.length) return [];
  const ids = clients.map((c) => c.id);
  const weekFrom = daysAgo(6);
  const lastWorkouts = await db
    .select({
      clientId: workouts.clientId,
      last: sql<string | null>`max(${workouts.date})::text`,
      week: sql<number>`count(*) filter (where ${workouts.date} >= ${weekFrom})::int`,
    })
    .from(workouts)
    .where(inArray(workouts.clientId, ids))
    .groupBy(workouts.clientId);
  const weights = await db
    .selectDistinctOn([bodyWeights.clientId], {
      clientId: bodyWeights.clientId,
      weightKg: bodyWeights.weightKg,
      date: bodyWeights.date,
    })
    .from(bodyWeights)
    .where(inArray(bodyWeights.clientId, ids))
    .orderBy(bodyWeights.clientId, desc(bodyWeights.date));
  const active = await db
    .select({ clientId: programs.clientId, name: programs.name })
    .from(programs)
    .where(and(inArray(programs.clientId, ids), eq(programs.active, true)));
  return clients.map((c) => ({
    ...c,
    lastWorkout: lastWorkouts.find((w) => w.clientId === c.id)?.last ?? null,
    workoutsThisWeek: lastWorkouts.find((w) => w.clientId === c.id)?.week ?? 0,
    weight: weights.find((w) => w.clientId === c.id) ?? null,
    program: active.find((p) => p.clientId === c.id)?.name ?? null,
  }));
}

/** Cliënten (gefilterd op trainer) met hun actieve schema (of null), voor het tabblad Schema's. */
export async function getTrainerPrograms(filter: TrainerFilter) {
  const cond = filter === "all" ? sql`true` : filter === "none" ? sql`u.trainer_id is null` : sql`u.trainer_id = ${filter}`;
  const r = await db.execute(sql`
    select u.id as client_id, u.name as client_name, u.trainer_id, t.name as trainer_name,
           p.id as program_id, p.name as program_name, (p.created_at at time zone 'Europe/Amsterdam')::date::text as created,
           (select count(*) from program_days d where d.program_id = p.id)::int as days,
           (select count(*) from program_exercises e join program_days d on d.id = e.day_id where d.program_id = p.id)::int as exercises
    from users u
    left join users t on t.id = u.trainer_id
    left join programs p on p.client_id = u.id and p.active
    where u.role = 'client' and ${cond}
    order by (p.id is null), u.name`);
  return r.rows as {
    client_id: number;
    client_name: string;
    trainer_id: number | null;
    trainer_name: string | null;
    program_id: number | null;
    program_name: string | null;
    created: string | null;
    days: number;
    exercises: number;
  }[];
}
