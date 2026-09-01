import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for journal security");
  return encoder.encode(secret);
}

export async function createJournalUnlockToken(userId: string) {
  return new SignJWT({ purpose: "journal-unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());
}

export async function verifyJournalUnlockToken(token: string | undefined, userId: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return payload.purpose === "journal-unlock" && payload.sub === userId;
  } catch {
    return false;
  }
}

export async function createJournalRecoveryToken(userId: string) {
  return new SignJWT({ purpose: "journal-recovery" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function verifyJournalRecoveryToken(token: string | undefined, userId: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return payload.purpose === "journal-recovery" && payload.sub === userId;
  } catch {
    return false;
  }
}
