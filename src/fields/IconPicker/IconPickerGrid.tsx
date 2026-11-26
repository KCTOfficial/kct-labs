'use client'

import type { LucideIcon } from 'lucide-react'
import React, { useMemo, useRef, useState } from 'react'

import { ICON_MAP } from '@/components/site/iconMap'
import { iconKeywords, type AppIconName } from '@/fields/appIcons'

import './iconPicker.scss'

export type IconPickerLabels = { search: string; clear: string; empty: string }

type Props = {
  names: readonly string[]
  value: string | null
  onSelect: (name: string | null) => void
  labels: IconPickerLabels
  /** Required fields cannot be emptied. */
  allowClear?: boolean
}

const matches = (name: string, query: string): boolean =>
  name.includes(query) ||
  name.replaceAll('-', ' ').includes(query) ||
  (iconKeywords[name as AppIconName] ?? []).some((keyword) => keyword.includes(query))

/** Options in the first visual row: arrow up/down moves by that many. */
const columnsOf = (options: HTMLElement[]): number => {
  const top = options[0]?.offsetTop
  return Math.max(1, options.filter((option) => option.offsetTop === top).length)
}

/**
 * Searchable icon grid (listbox). Pure presentation: the Payload field wraps it in a modal.
 * Roving tabindex: one tab stop; arrows, Home and End move between icons.
 */
export const IconPickerGrid: React.FC<Props> = ({
  names,
  value,
  onSelect,
  labels,
  allowClear = true,
}) => {
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () => (needle ? names.filter((name) => matches(name, needle)) : [...names]),
    [names, needle],
  )
  const tabStop = visible.includes(value ?? '') ? value : visible[0]

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const options = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
    const index = options.indexOf(event.target as HTMLElement)
    if (index < 0) return
    const columns = columnsOf(options)
    const target: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + columns,
      ArrowUp: index - columns,
      Home: 0,
      End: options.length - 1,
    }
    const next = target[event.key]
    if (next === undefined) return
    event.preventDefault()
    options[Math.min(options.length - 1, Math.max(0, next))]?.focus()
  }

  return (
    <div className="icon-picker__panel">
      <div className="icon-picker__bar">
        <input
          aria-label={labels.search}
          autoComplete="off"
          className="icon-picker__search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.search}
          type="search"
          value={query}
        />
        {allowClear && value && (
          <button className="icon-picker__clear" onClick={() => onSelect(null)} type="button">
            {labels.clear}
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="icon-picker__empty" role="status">
          {labels.empty}
        </p>
      ) : (
        <div className="icon-picker__grid" onKeyDown={onKeyDown} ref={listRef} role="listbox">
          {visible.map((name) => {
            const Icon = (ICON_MAP as Record<string, LucideIcon | undefined>)[name]
            return (
              <button
                aria-label={name}
                aria-selected={name === value}
                className="icon-picker__option"
                key={name}
                onClick={() => onSelect(name)}
                role="option"
                tabIndex={name === tabStop ? 0 : -1}
                title={name}
                type="button"
              >
                {Icon ? <Icon aria-hidden="true" className="icon-picker__glyph" /> : null}
                <span className="icon-picker__name">{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
