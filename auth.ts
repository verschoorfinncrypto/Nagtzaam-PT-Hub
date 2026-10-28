import "server-only";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db, users, type User } from "@/db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(user: Pick<User, "id" | "role">) {
  const token = await signSession({ uid: user.id, role: user.role });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}

export const currentUser = cache(async (): Promise<User | null> => {
  const s = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const [u] = await db.select().from(users).where(eq(users.id, s.uid)).limit(1);
  return u ?? null;
});

export async function requireUser(role?: User["role"]) {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (role && u.role !== role) redirect(u.role === "trainer" ? "/trainer" : "/dashboard");
  return u;
}

/** De cliënt waarvan de ingelogde gebruiker de gegevens mag zien: zichzelf, of een cliënt van deze trainer. */
export async function requireClientAccess(clientId: number) {
  const u = await requireUser();
  if (u.role === "client") {
    if (u.id !== clientId) notFound();
    return { viewer: u, client: u };
  }
  const [c] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, clientId), eq(users.trainerId, u.id), eq(users.role, "client")))
    .limit(1);
  if (!c) notFound();
  return { viewer: u, client: c };
}
