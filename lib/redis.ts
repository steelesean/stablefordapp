import { Redis } from "@upstash/redis";

/**
 * Storage client. Uses Upstash Redis in production (env vars injected by the
 * Vercel Marketplace integration). Falls back to a tiny in-memory store when
 * KV_REST_API_URL is not set, so local `npm run dev` works out of the box.
 *
 * The in-memory store is NOT persistent — it lives for the lifetime of the
 * process. That's fine for local smoke testing; never rely on it in prod.
 *
 * The client is constructed lazily on first use so that build-time module
 * evaluation (e.g. Next.js collecting page data) doesn't trip on missing env.
 */

type AnyObj = Record<string, unknown>;

interface MinimalClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  sadd(key: string, ...members: string[]): Promise<unknown>;
  srem(key: string, ...members: string[]): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
}

function makeMemoryClient(): MinimalClient {
  const kv = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  const getSet = (k: string) => {
    let s = sets.get(k);
    if (!s) {
      s = new Set();
      sets.set(k, s);
    }
    return s;
  };
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      return (kv.get(key) as T | undefined) ?? null;
    },
    async set(key, value) {
      kv.set(key, JSON.parse(JSON.stringify(value as AnyObj)));
      return "OK";
    },
    async del(key) {
      kv.delete(key);
      sets.delete(key);
      return 1;
    },
    async sadd(key, ...members) {
      const s = getSet(key);
      members.forEach((m) => s.add(m));
      return members.length;
    },
    async srem(key, ...members) {
      const s = getSet(key);
      members.forEach((m) => s.delete(m));
      return members.length;
    },
    async smembers(key) {
      return Array.from(getSet(key));
    },
  };
}

function buildClient(): MinimalClient {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    return new Redis({ url, token }) as unknown as MinimalClient;
  }
  console.warn(
    "[redis] Using in-memory fallback — no persistence. Configure Upstash for production.",
  );
  return makeMemoryClient();
}

const g = globalThis as unknown as { __stablefordRedis?: MinimalClient };

function getClient(): MinimalClient {
  if (!g.__stablefordRedis) g.__stablefordRedis = buildClient();
  return g.__stablefordRedis;
}

/** Proxy that lazy-initializes the underlying client on first method call. */
export const redis: MinimalClient = {
  get: (k) => getClient().get(k),
  set: (k, v) => getClient().set(k, v),
  del: (k) => getClient().del(k),
  sadd: (k, ...m) => getClient().sadd(k, ...m),
  srem: (k, ...m) => getClient().srem(k, ...m),
  smembers: (k) => getClient().smembers(k),
};

export const KEYS = {
  round: "round:config",
  playerSet: "round:players",
  player: (id: string) => `player:${id}`,
};
