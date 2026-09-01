import { prisma } from "./prisma";
import { cacheDeleteMany } from "./cache";
import { cacheKeys } from "./cache-keys";
import type { ActivityType, Prisma } from "@prisma/client";

export async function logActivity(userId: string, type: ActivityType, message: string, metadata?: Prisma.InputJsonValue) {
  await prisma.activity.create({ data: { userId, type, message, metadata } });
  await cacheDeleteMany([cacheKeys.dashboard(userId), cacheKeys.activity(userId)]);
}
