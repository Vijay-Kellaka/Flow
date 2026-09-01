import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createJournalUnlockToken } from "@/lib/journal-security";

async function getRecoveryUserId(token: string | undefined) {
  if (!token) return null;
  try {
    const { jwtVerify } = await import("jose");
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;
    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"] });
    return payload.purpose === "journal-recovery" ? payload.sub ?? null : null;
  } catch {
    return null;
  }
}


const schema = z.object({ newPassword: z.string().min(8).max(128) });

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const recovery = cookieStore.get("flow-journal-recovery")?.value;
  const userId = await getRecoveryUserId(recovery);
  if (!userId) {
    return NextResponse.json({ error: "Email re-verification required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Password must be 8–128 characters." }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { journalPasswordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });

  cookieStore.delete("flow-journal-recovery");
  const unlock = await createJournalUnlockToken(userId);
  cookieStore.set("flow-journal-unlocked", unlock, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
