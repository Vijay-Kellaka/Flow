import { ensureRedis } from "./redis";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await ensureRedis();
    const value = await client.get(key);
    return value as T | null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  try {
    const client = await ensureRedis();
    await client.set(key, value, { ex: ttlSeconds });
  } catch {
    // Cache is an optimization. A cache outage must not break the app.
  }
}

export async function cacheDelete(key: string) {
  try {
    const client = await ensureRedis();
    await client.del(key);
  } catch {
    // See cacheSet: Redis is deliberately non-critical.
  }
}

export async function cacheDeleteMany(keys: string[]) {
  try {
    const client = await ensureRedis();
    if (keys.length) await client.del(...keys);
  } catch {
    // See cacheSet: Redis is deliberately non-critical.
  }
}

export async function cacheRateLimit(key: string, max: number, windowSeconds: number) {
  try {
    const client = await ensureRedis();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSeconds);
    return count <= max;
  } catch {
    // Fail open if Redis is unavailable; auth/data paths remain functional.
    return true;
  }
}
