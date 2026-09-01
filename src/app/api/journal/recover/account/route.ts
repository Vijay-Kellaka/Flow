import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJournalUnlockToken } from "@/lib/journal-security";

const schema = z.object({ accountPassword: z.string().min(1).max(128), newJournalPassword: z.string().min(8).max(128) });

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Sign in to Flow first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your Flow login password and a journal password of at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "This account does not have an email/password login. Use email recovery instead." }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.accountPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Incorrect Flow login password." }, { status: 403 });

  await prisma.user.update({
    where: { id: user.id },
    data: { journalPasswordHash: await bcrypt.hash(parsed.data.newJournalPassword, 12) },
  });

  const cookieStore = await cookies();
  const unlock = await createJournalUnlockToken(user.id);
  cookieStore.set("flow-journal-unlocked", unlock, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
