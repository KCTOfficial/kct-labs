/**
 * Tiny, dependency-free part of the home scroll story: media-query gates and the hero phone slot
 * helper. Imported statically (server components + the client loader); the animation builders in
 * scrollStory.ts are loaded lazily together with GSAP, so mobile never downloads them.
 */
// KEEP IN SYNC with the `@media` gate of `.story-pin`/`.story-spacer` in globals.css.
export const STORY_QUERY =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
export const PIN_QUERY = `${STORY_QUERY} and (min-height: 760px) and (scripting: enabled)`

export type PhoneSlot = 'left' | 'center' | 'right'

const SLOTS: PhoneSlot[] = ['left', 'center', 'right']

/** Hero phone slot by stage position (not array index): one phone is always centred. */
export const phoneSlot = (count: number, index: number): PhoneSlot =>
  count <= 1 ? 'center' : (SLOTS[index] ?? 'center')
