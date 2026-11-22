import { describe, expect, it } from 'vitest'

import { createTtlLru } from '@/utilities/ttlLru'

const clock = (start = 1_000) => {
  let t = start
  return { now: () => t, advance: (ms: number) => void (t += ms) }
}

describe('createTtlLru', () => {
  it('stores and returns values; unknown keys are undefined', () => {
    const cache = createTtlLru<string>(3, 1000, clock().now)
    cache.set('a', 'A')
    expect(cache.get('a')).toBe('A')
    expect(cache.get('missing')).toBeUndefined()
    expect(cache.size()).toBe(1)
  })

  it('expires entries after the TTL and removes them', () => {
    const c = clock()
    const cache = createTtlLru<string>(3, 1000, c.now)
    cache.set('a', 'A')
    c.advance(999)
    expect(cache.get('a')).toBe('A')
    c.advance(1)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size()).toBe(0)
  })

  it('evicts the least recently used entry beyond capacity (reads refresh recency)', () => {
    const cache = createTtlLru<number>(2, 1000, clock().now)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // a is now the most recent
    cache.set('c', 3) // evicts b
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
    expect(cache.size()).toBe(2)
  })

  it('overwriting a key refreshes both value and TTL without growing the cache', () => {
    const c = clock()
    const cache = createTtlLru<string>(2, 1000, c.now)
    cache.set('a', 'old')
    c.advance(800)
    cache.set('a', 'new')
    c.advance(800)
    expect(cache.get('a')).toBe('new')
    expect(cache.size()).toBe(1)
  })

  it('supports delete and clear, and clamps an invalid capacity to 1', () => {
    const cache = createTtlLru<number>(0, 1000, clock().now)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.size()).toBe(1)
    expect(cache.get('b')).toBe(2)
    cache.delete('b')
    expect(cache.get('b')).toBeUndefined()
    cache.set('c', 3)
    cache.clear()
    expect(cache.size()).toBe(0)
  })
})
