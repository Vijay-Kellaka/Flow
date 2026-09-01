import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJournalUnlockToken } from "@/lib/journal-security";

const schema = z.object({ password: z.string().min(1).max(128) });

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid password." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, journalPasswordHash: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.journalPasswordHash) return NextResponse.json({ error: "Journal password not set." }, { status: 409 });

  const ok = await bcrypt.compare(parsed.data.password, user.journalPasswordHash);
  if (!ok) return NextResponse.json({ error: "Incorrect journal password." }, { status: 403 });

  const token = await createJournalUnlockToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set("flow-journal-unlocked", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("flow-journal-unlocked");
  return NextResponse.json({ ok: true });
}
