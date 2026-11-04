import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, invites, users } from "@/db";

export const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function findInvite(token: string) {
  const [row] = await db
    .select({ invite: invites, user: users })
    .from(invites)
    .innerJoin(users, eq(users.id, invites.userId))
    .where(eq(invites.tokenHash, sha(token)))
    .limit(1);
  if (!row || row.invite.usedAt || row.invite.expiresAt < new Date()) return null;
  return row;
}

