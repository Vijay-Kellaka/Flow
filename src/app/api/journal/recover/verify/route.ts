import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createJournalRecoveryToken } from "@/lib/journal-security";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; token?: string };
  const email = body.email?.trim().toLowerCase();
  const token = body.token?.trim();

  if (!email || !token) {
    return NextResponse.json({ error: "Invalid verification." }, { status: 400 });
  }

  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.identifier !== `journal:${email}` || row.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired verification." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  await prisma.verificationToken.delete({ where: { token } });
  const grant = await createJournalRecoveryToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set("flow-journal-recovery", grant, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
