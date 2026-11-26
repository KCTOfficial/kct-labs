'use client'

import React, { useRef } from 'react'

import {
  ACCENT_PRESETS,
  accentLabel,
  accentSwatches,
  isAccentPreset,
} from '@/utilities/apps/accent'

import './accentColor.scss'

type Props = {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

/** `null` is the brand colours (no preset). */
const OPTIONS: Array<(typeof ACCENT_PRESETS)[number] | null> = [null, ...ACCENT_PRESETS]

/**
 * Swatch grid (radio group) for the accent preset. Each swatch shows the light and dark version
 * of the colour. Arrow keys select the next/previous option and wrap around.
 */
export const AccentSwatchGroup: React.FC<Props> = ({ value, onChange, disabled }) => {
  const groupRef = useRef<HTMLDivElement>(null)
  const current = isAccentPreset(value) ? value : null

  const move = (from: number, delta: number) => {
    const next = (from + delta + OPTIONS.length) % OPTIONS.length
    onChange(OPTIONS[next] ?? null)
    groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div aria-label="Accent colour" className="accent-swatches" ref={groupRef} role="radiogroup">
      {OPTIONS.map((preset, index) => {
        const checked = preset === current
        const label = preset ? accentLabel(preset) : 'Brand (default)'
        return (
          <button
            aria-checked={checked}
            aria-label={label}
            className="accent-swatches__option"
            disabled={disabled}
            key={preset ?? 'brand'}
            onClick={() => onChange(preset)}
            onKeyDown={(event) => {
              const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
              if (!delta) return
              event.preventDefault()
              move(index, delta)
            }}
            role="radio"
            style={
              preset
                ? ({
                    '--swatch-light': accentSwatches[preset].light,
                    '--swatch-dark': accentSwatches[preset].dark,
                  } as React.CSSProperties)
                : undefined
            }
            tabIndex={checked ? 0 : -1}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`accent-swatches__chip${preset ? '' : ' accent-swatches__chip--brand'}`}
            />
            <span className="accent-swatches__label">{preset ? label : 'Brand'}</span>
          </button>
        )
      })}
    </div>
  )
}
