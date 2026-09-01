import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

export function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  redisClient = new Redis({ url, token });
  return redisClient;
}

export async function ensureRedis() {
  const client = getRedis();
  if (!client) throw new Error("Redis is not configured");
  return client;
}
