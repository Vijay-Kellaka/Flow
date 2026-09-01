import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache-keys";
import { DEFAULT_WIDGETS } from "@/lib/dashboard";
import { logActivity } from "@/lib/activity";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const widgetSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  size: z.enum(["small", "medium", "large"]),
  visible: z.boolean(),
  config: z.record(z.string(), z.unknown()),
});
const schema = z.object({ layout: z.array(widgetSchema).min(1).max(30) });

async function getUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = cacheKeys.dashboard(user.id);
  const cached = await cacheGet(key);
  if (cached) return NextResponse.json(cached);
  const row = await prisma.dashboard.findUnique({ where: { userId: user.id } });
  const payload = row?.layout ?? DEFAULT_WIDGETS;
  await cacheSet(key, payload, 300);
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid dashboard layout" }, { status: 400 });
  const saved = await prisma.dashboard.upsert({
    where: { userId: user.id },
    create: { userId: user.id, layout: parsed.data.layout as unknown as Prisma.InputJsonValue },
    update: { layout: parsed.data.layout as unknown as Prisma.InputJsonValue },
  });
  await cacheDelete(cacheKeys.dashboard(user.id));
  await logActivity(user.id, "DASHBOARD_UPDATED", "Updated dashboard layout");
  return NextResponse.json(saved);
}
