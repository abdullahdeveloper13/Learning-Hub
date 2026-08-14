import { type Request, type Response, type NextFunction } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

export interface RateLimitStore {
  increment(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }
    if (bucket.count >= max) {
      return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    bucket.count += 1;
    return { allowed: true };
  }
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async increment(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const redisKey = encodeURIComponent(`rate-limit:${key}`);
    const incrementResponse = await fetch(`${this.url.replace(/\/$/, "")}/incr/${redisKey}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!incrementResponse.ok) throw new Error("Rate limit provider unavailable");
    const count = Number(readRedisResult(await incrementResponse.json()) ?? 0);
    if (count === 1) {
      await fetch(`${this.url.replace(/\/$/, "")}/pexpire/${redisKey}/${windowMs}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
    }
    if (count > max) {
      const ttlResponse = await fetch(`${this.url.replace(/\/$/, "")}/pttl/${redisKey}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const ttl = ttlResponse.ok ? Number(readRedisResult(await ttlResponse.json()) ?? windowMs) : windowMs;
      return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) };
    }
    return { allowed: true };
  }
}

function readRedisResult(value: unknown) {
  if (typeof value === "object" && value !== null && "result" in value) {
    return (value as { result?: unknown }).result;
  }
  return undefined;
}

let store: RateLimitStore | null = null;

export function getRateLimitStore() {
  if (store) return store;
  if (process.env["RATE_LIMIT_STORE"] === "redis") {
    const url = process.env["UPSTASH_REDIS_REST_URL"];
    const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
    if (!url || !token) throw new Error("Redis rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    store = new RedisRateLimitStore(url, token);
    return store;
  }
  store = new MemoryRateLimitStore();
  return store;
}

export function setRateLimitStore(nextStore: RateLimitStore | null) {
  store = nextStore;
}

export function rateLimit({ windowMs, max, keyPrefix }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identity = req.user?.id ? `user:${req.user.id}` : req.ip || "unknown";
    const key = `${keyPrefix}:${identity}`;
    try {
      const result = await getRateLimitStore().increment(key, windowMs, max);
      if (result.allowed) {
        next();
        return;
      }
      const retryAfter = result.retryAfter ?? Math.ceil(windowMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Too many requests", retryAfter });
    } catch (error) {
      req.log.error({ err: error }, "Rate limit provider failed");
      res.status(503).json({ error: "Rate limit provider unavailable" });
    }
  };
}
