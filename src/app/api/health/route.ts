import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const startedAt = Date.now();
  let database: "ok" | "error" = "ok";
  let cache: "ok" | "unconfigured" | "error" = "unconfigured";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set("flow:health", "ok", { ex: 30 });
      const value = await redis.get("flow:health");
      cache = value === "ok" ? "ok" : "error";
    } catch {
      cache = "error";
    }
  }

  // Redis is an optional acceleration layer. PostgreSQL is the required data store.
  const ok = database === "ok";
  return NextResponse.json(
    { ok, database, cache, latencyMs: Date.now() - startedAt },
    { status: ok ? 200 : 503 },
  );
}
