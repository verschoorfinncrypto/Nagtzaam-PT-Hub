// Edge-veilig (geen database): wordt ook door middleware gebruikt.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "hub_session";
export const SESSION_DAYS = 30;

export type SessionPayload = { uid: number; role: "trainer" | "client" };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ontbreekt of is korter dan 32 tekens.");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "number" || (payload.role !== "trainer" && payload.role !== "client")) return null;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}
