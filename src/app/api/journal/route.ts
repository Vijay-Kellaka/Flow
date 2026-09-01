import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyJournalUnlockToken } from "@/lib/journal-security";
import { logActivity } from "@/lib/activity";
import { decryptJournalContent, encryptJournalContent, isServerEncryptedJournal } from "@/lib/journal-crypto";

async function getUser() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

async function assertUnlocked(userId: string) {
  const cookieStore = await cookies();
  return verifyJournalUnlockToken(cookieStore.get("flow-journal-unlocked")?.value, userId);
}

const schema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().max(100000),
  mood: z.string().max(40).optional(),
  tags: z.array(z.string()).max(10).default([]),
  wordCount: z.coerce.number().int().min(0).max(100000).optional(),
});

function dayToDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function todayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertUnlocked(user.id))) return NextResponse.json({ error: "Journal locked" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  if (params.get("list") === "1") {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: user.id },
      select: { id: true, entryDate: true, mood: true, tags: true, wordCount: true, updatedAt: true },
      orderBy: { entryDate: "desc" },
      take: 90,
    });
    return NextResponse.json(entries);
  }

  const day = params.get("date") ?? todayUtcKey();
  const entry = await prisma.journalEntry.findUnique({
    where: { userId_entryDate: { userId: user.id, entryDate: dayToDate(day) } },
  });

  if (!entry) return NextResponse.json(null);

  if (!isServerEncryptedJournal(entry.content)) {
    return NextResponse.json({ ...entry, legacyEncrypted: true });
  }

  try {
    return NextResponse.json({ ...entry, content: decryptJournalContent(entry.content), encryptionVersion: 2 });
  } catch {
    return NextResponse.json({ error: "Journal entry could not be decrypted." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertUnlocked(user.id))) return NextResponse.json({ error: "Journal locked" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid journal entry" }, { status: 400 });

  const date = dayToDate(parsed.data.entryDate);
  const content = parsed.data.content;
  const wordCount = parsed.data.wordCount ?? (content.replace(/<[^>]*>/g, " ").trim() ? content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length : 0);

  const entry = await prisma.journalEntry.upsert({
    where: { userId_entryDate: { userId: user.id, entryDate: date } },
    create: {
      userId: user.id,
      entryDate: date,
      content: encryptJournalContent(content),
      mood: parsed.data.mood,
      tags: parsed.data.tags,
      wordCount,
    },
    update: {
      content: encryptJournalContent(content),
      mood: parsed.data.mood,
      tags: parsed.data.tags,
      wordCount,
    },
  });

  await logActivity(user.id, "JOURNAL_UPDATED", `Updated journal entry for ${parsed.data.entryDate}`);
  return NextResponse.json({ ...entry, content, encryptionVersion: 2 });
}
export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertUnlocked(user.id))) return NextResponse.json({ error: "Journal locked" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const day = params.get("date");
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "A valid journal date is required." }, { status: 400 });
  }

  const result = await prisma.journalEntry.deleteMany({
    where: { userId: user.id, entryDate: dayToDate(day) },
  });

  if (result.count) {
    await logActivity(user.id, "JOURNAL_UPDATED", `Deleted journal entry for ${day}`);
  }

  return NextResponse.json({ deleted: result.count > 0 });
}
