import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJournalUnlockToken } from "@/lib/journal-security";
import { cookies } from "next/headers";

const schema = z.object({ password: z.string().min(8).max(128) });

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Password must be 8–128 characters." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, journalPasswordHash: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.journalPasswordHash) return NextResponse.json({ error: "Journal password already exists." }, { status: 409 });

  await prisma.user.update({
    where: { id: user.id },
    data: { journalPasswordHash: await bcrypt.hash(parsed.data.password, 12) },
  });

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
