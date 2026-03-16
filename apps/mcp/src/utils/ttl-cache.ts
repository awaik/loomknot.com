/**
 * Simple in-memory TTL cache for the MCP server process.
 * Replaces ad-hoc Map + expiresAt patterns across auth and permission caches.
 */
export class TtlCache<V> {
  private readonly cache = new Map<string, { value: V; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(options: { ttlMs: number; maxSize?: number }) {
    this.ttlMs = options.ttlMs;
    this.maxSize = options.maxSize ?? 500;
  }

  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.evictIfNeeded();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private evictIfNeeded(): void {
    if (this.cache.size < this.maxSize) return;
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) this.cache.delete(key);
    }
  }
}
