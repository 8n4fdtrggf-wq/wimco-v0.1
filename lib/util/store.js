// Tunn wrapper kring en KV-liknande lagring (Cloudflare KV i produktion, minnes-/filbaserad lokalt).

export function createStore(kv) {
  if (!kv) return null;
  return {
    async get(key) {
      return kv.get(key);
    },
    async put(key, value, ttlSeconds) {
      const opts = ttlSeconds ? { expirationTtl: Math.max(60, Math.round(ttlSeconds)) } : undefined;
      return kv.put(key, String(value), opts);
    },
    async delete(key) {
      return kv.delete(key);
    },
    async getJson(key) {
      const raw = await kv.get(key);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    async putJson(key, value, ttlSeconds) {
      return this.put(key, JSON.stringify(value), ttlSeconds);
    },
    async list(prefix, limit = 100) {
      if (!kv.list) return [];
      const res = await kv.list({ prefix, limit });
      return res.keys.map((k) => k.name);
    },
  };
}

// Fast fönster per nyckel. KV är eventuellt konsistent – det räcker för att stoppa missbruk,
// inte för exakt räkning. Returnerar { ok, retryAfter }.
export async function rateLimit(store, key, { limit, windowSec }) {
  if (!store) return { ok: true, remaining: limit };
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSec);
  const k = `rl:${key}:${windowSec}:${window}`;
  const current = Number((await store.get(k)) || 0);
  if (current >= limit) {
    return { ok: false, retryAfter: (window + 1) * windowSec - now };
  }
  await store.put(k, current + 1, windowSec + 60);
  return { ok: true, remaining: limit - current - 1 };
}
