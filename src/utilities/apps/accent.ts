/**
 * Accent colour presets for app detail pages. An editor picks one per app; the page sets
 * `data-accent="<preset>"` and `globals.css` maps it to `--app-accent*` tokens per theme (contrast is
 * tested for every preset on every surface). Stored as text, so presets can be appended without a
 * migration. **Append-only**: never rename or remove one. The hex values here are only for the admin
 * swatches and must equal `--app-accent` in `globals.css` (a test enforces it).
 */
export const ACCENT_PRESETS = [
  'blue',
  'sky',
  'cyan',
  'teal',
  'green',
  'lime',
  'amber',
  'orange',
  'red',
  'rose',
  'pink',
  'purple',
] as const

export type AccentPreset = (typeof ACCENT_PRESETS)[number]

const ACCENT_SET: ReadonlySet<string> = new Set(ACCENT_PRESETS)

export const isAccentPreset = (value: unknown): value is AccentPreset =>
  typeof value === 'string' && ACCENT_SET.has(value)

/** Preset for the markup, or `null` (brand colours) for empty and unknown values. */
export const toAccent = (value: unknown): AccentPreset | null =>
  isAccentPreset(value) ? value : null

/** Validation message, or `null` when valid. Empty means "brand colours" and is allowed. */
export const accentPresetError = (value: unknown): string | null =>
  value === undefined || value === null || value === '' || isAccentPreset(value)
    ? null
    : 'Choose one of the listed colours.'

/** Display name in the admin, e.g. `purple` → `Purple`. */
export const accentLabel = (preset: AccentPreset): string =>
  preset.charAt(0).toUpperCase() + preset.slice(1)

/** Fill colour per theme, for the admin swatches (`light` / `dark` = `--app-accent`). */
export const accentSwatches: Record<AccentPreset, { light: string; dark: string }> = {
  blue: { light: '#2563eb', dark: '#60a5fa' },
  sky: { light: '#0284c7', dark: '#38bdf8' },
  cyan: { light: '#0891b2', dark: '#22d3ee' },
  teal: { light: '#0d9488', dark: '#2dd4bf' },
  green: { light: '#15803d', dark: '#4ade80' },
  lime: { light: '#4d7c0f', dark: '#a3e635' },
  amber: { light: '#b45309', dark: '#fbbf24' },
  orange: { light: '#ea580c', dark: '#fb923c' },
  red: { light: '#dc2626', dark: '#f87171' },
  rose: { light: '#e11d48', dark: '#fb7185' },
  pink: { light: '#db2777', dark: '#f472b6' },
  purple: { light: '#9333ea', dark: '#c084fc' },
}
