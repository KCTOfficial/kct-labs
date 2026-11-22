/**
 * Tiny in-memory LRU cache with per-entry TTL (client-side popup data). Pure and framework-free;
 * the clock is injectable so expiry is unit-testable without fake timers.
 */
export type TtlLru<T> = {
  get: (key: string) => T | undefined
  set: (key: string, value: T) => void
  delete: (key: string) => void
  clear: () => void
  size: () => number
}

type Entry<T> = { value: T; expiresAt: number }

export const createTtlLru = <T>(
  max = 20,
  ttlMs = 60_000,
  now: () => number = Date.now,
): TtlLru<T> => {
  const capacity = Math.max(1, Math.floor(max))
  // Map iteration order = insertion order, so re-inserting on access keeps the oldest first.
  const entries = new Map<string, Entry<T>>()

  return {
    get(key) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= now()) {
        entries.delete(key)
        return undefined
      }
      entries.delete(key)
      entries.set(key, entry)
      return entry.value
    },
    set(key, value) {
      entries.delete(key)
      entries.set(key, { value, expiresAt: now() + ttlMs })
      while (entries.size > capacity) {
        const oldest = entries.keys().next().value
        if (oldest === undefined) break
        entries.delete(oldest)
      }
    },
    delete: (key) => void entries.delete(key),
    clear: () => entries.clear(),
    size: () => entries.size,
  }
}
