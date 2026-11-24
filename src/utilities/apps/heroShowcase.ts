/** Max apps rotating in the home hero phone stage (Admin `Home → Hero → Showcase Apps`). */
export const HERO_SHOWCASE_MAX = 8

/**
 * Showcase list as the hero consumes it: repeated ids dropped (the Admin lets an editor pick the
 * same app twice, which would also duplicate React keys), first occurrence wins, then capped.
 */
export const normalizeShowcase = <T extends { id: number | string }>(items: readonly T[]): T[] => {
  const seen = new Set<T['id']>()
  const unique: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
    if (unique.length === HERO_SHOWCASE_MAX) break
  }
  return unique
}
