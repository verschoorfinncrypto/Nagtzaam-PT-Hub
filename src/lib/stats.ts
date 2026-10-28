import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { daysAgo, e1rm, today, weekStart } from "./format";

/** Praktijkbrede cijfers voor de Data-pagina. Alle data in Nederlandse kalenderdagen. */

async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  const r = await db.execute(q);
  return r.rows as T[];
}

export type PracticeStats = Awaited<ReturnType<typeof getPracticeStats>>;

export async function getPracticeStats() {
  const t = today();
  const d14 = daysAgo(13); // vandaag + 13 dagen terug = 14 dagen
  const d28 = daysAgo(27);
  const d30 = daysAgo(29);
  const monthStart = t.slice(0, 8) + "01";
  const weeks = 12;
  const weekFrom = weekStart(daysAgo((weeks - 1) * 7));

  const [clients, workoutsPerClient, weekly, trainers, topEx, weights, programs, allSets] = await Promise.all([
    rows<{ id: number; name: string; source: string | null; trainer_id: number | null; created: string; can_login: boolean }>(sql`
      select id, name, source, trainer_id, (created_at at time zone 'Europe/Amsterdam')::date::text as created,
             password_hash like '$2%' as can_login
      from users where role = 'client'`),
    rows<{ client_id: number; last: string | null; w14: number; w28: number; w30: number }>(sql`
      select client_id, max(date)::text as last,
             count(*) filter (where date >= ${d14})::int as w14,
             count(*) filter (where date >= ${d28})::int as w28,
             count(*) filter (where date >= ${d30})::int as w30
      from workouts group by client_id`),
    rows<{ week: string; workouts: number; clients: number }>(sql`
      select date_trunc('week', date)::date::text as week, count(*)::int as workouts, count(distinct client_id)::int as clients
      from workouts where date >= ${weekFrom} group by 1 order by 1`),
    rows<{ id: number; name: string }>(sql`select id, name from users where role = 'trainer' order by name`),
    rows<{ name: string; sets: number; clients: number }>(sql`
      select e.name, count(*)::int as sets, count(distinct w.client_id)::int as clients
      from workout_sets s join workouts w on w.id = s.workout_id join exercises e on e.id = s.exercise_id
      where w.date >= ${d30} group by e.name order by sets desc, e.name limit 10`),
    rows<{ client_id: number }>(sql`select distinct client_id from body_weights where date >= ${d30}`),
    rows<{ client_id: number }>(sql`select distinct client_id from programs where active`),
    rows<{ client_id: number; exercise_id: number; date: string; weight: number; reps: number }>(sql`
      select w.client_id, s.exercise_id, w.date::text as date, s.weight, s.reps
      from workout_sets s join workouts w on w.id = s.workout_id
      where s.weight > 0 order by w.date, w.id`),
  ]);

  const byClient = new Map(workoutsPerClient.map((w) => [w.client_id, w]));
  const withProgram = new Set(programs.map((p) => p.client_id));
  const tracking = new Set(weights.map((w) => w.client_id));
  const trainerName = new Map(trainers.map((tr) => [tr.id, tr.name]));

  // PR's: een set die de beste geschatte 1RM tot dan toe voor die cliënt en oefening overtreft.
  const best = new Map<string, number>();
  let prs30 = 0;
  const prClients = new Set<number>();
  for (const s of allSets) {
    const key = `${s.client_id}:${s.exercise_id}`;
    const v = e1rm(s.weight, s.reps);
    const prev = best.get(key);
    if (prev !== undefined && v > prev + 1e-9 && s.date >= d30) {
      prs30++;
      prClients.add(s.client_id);
    }
    if (prev === undefined || v > prev) best.set(key, v);
  }

  const total = clients.length;
  const active14 = clients.filter((c) => (byClient.get(c.id)?.w14 ?? 0) > 0);
  const active28 = clients.filter((c) => (byClient.get(c.id)?.w28 ?? 0) > 0);
  const workouts28 = active28.reduce((n, c) => n + (byClient.get(c.id)?.w28 ?? 0), 0);
  const workouts30 = clients.reduce((n, c) => n + (byClient.get(c.id)?.w30 ?? 0), 0);

  // Behoud: cliënten die minstens 4 weken geleden begonnen zijn en de laatste 14 dagen trainden.
  const cohort = clients.filter((c) => c.created <= daysAgo(28));
  const retained = cohort.filter((c) => (byClient.get(c.id)?.w14 ?? 0) > 0);

  // Nieuwe cliënten per maand (laatste 6 maanden), uitgesplitst naar herkomst.
  const months: { month: string; fysio: number; extern: number; onbekend: number }[] = [];
  const base = new Date(t + "T12:00:00");
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1, 12);
    months.push({ month: d.toISOString().slice(0, 7), fysio: 0, extern: 0, onbekend: 0 });
  }
  for (const c of clients) {
    const m = months.find((x) => x.month === c.created.slice(0, 7));
    if (m) m[(c.source as "fysio" | "extern") ?? "onbekend"] += 1;
  }

  // Volledige reeks van 12 weken, ook weken zonder trainingen.
  const weekSeries: { week: string; workouts: number; clients: number }[] = [];
  const ws = new Date(weekFrom + "T12:00:00");
  for (let i = 0; i < weeks; i++) {
    const d = new Date(ws);
    d.setDate(d.getDate() + i * 7);
    const key = d.toISOString().slice(0, 10);
    const hit = weekly.find((w) => w.week === key);
    weekSeries.push({ week: key, workouts: hit?.workouts ?? 0, clients: hit?.clients ?? 0 });
  }

  const perTrainer = trainers
    .map((tr) => {
      const mine = clients.filter((c) => c.trainer_id === tr.id);
      return {
        id: tr.id,
        name: tr.name,
        clients: mine.length,
        active14: mine.filter((c) => (byClient.get(c.id)?.w14 ?? 0) > 0).length,
        workouts30: mine.reduce((n, c) => n + (byClient.get(c.id)?.w30 ?? 0), 0),
        withProgram: mine.filter((c) => withProgram.has(c.id)).length,
      };
    })
    .filter((x) => x.clients > 0);

  // Aandacht nodig: 14+ dagen niet getraind, of nog nooit (en al langer dan een week cliënt).
  const attention = clients
    .map((c) => {
      const last = byClient.get(c.id)?.last ?? null;
      const days = last ? Math.round((new Date(t).getTime() - new Date(last).getTime()) / 86_400_000) : null;
      return { id: c.id, name: c.name, trainerId: c.trainer_id, trainer: c.trainer_id ? trainerName.get(c.trainer_id) ?? "–" : "–", last, days, created: c.created };
    })
    .filter((c) => (c.last ? c.last < d14 : c.created <= daysAgo(7)))
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));

  return {
    total,
    newThisMonth: clients.filter((c) => c.created >= monthStart).length,
    fysio: clients.filter((c) => c.source === "fysio").length,
    extern: clients.filter((c) => c.source === "extern").length,
    unknownSource: clients.filter((c) => !c.source).length,
    active14: active14.length,
    workouts30,
    perActivePerWeek: active28.length ? workouts28 / active28.length / 4 : 0,
    withProgram: clients.filter((c) => withProgram.has(c.id)).length,
    withLogin: clients.filter((c) => c.can_login).length,
    weightTracking: clients.filter((c) => tracking.has(c.id)).length,
    prs30,
    prClients: prClients.size,
    retention: { cohort: cohort.length, retained: retained.length },
    months,
    weekSeries,
    perTrainer,
    attention,
    topExercises: topEx,
  };
}
