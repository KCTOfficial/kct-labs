import { cleanup, render } from '@testing-library/react'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { appIconNames, isAppIconName } from '@/fields/appIcons'
import { siteIconNames } from '@/fields/iconSelect'
import { ICON_MAP } from '@/components/site/iconMap'
import { SiteIcon } from '@/components/site/SiteIcon'

afterEach(cleanup)

/** Names that were valid on the day the registry shipped. The list is append-only. */
const SNAPSHOT_V1 = [
  'workflow',
  'list-checks',
  'plug-zap',
  'search',
  'pen-tool',
  'shield-check',
  'rocket',
  'code',
  'smartphone',
  'cpu',
  'boxes',
  'globe',
  'sparkles',
  'users',
  'briefcase',
  'book-open',
  'wallet',
  'calendar-check',
  'gamepad-2',
  'bar-chart-3',
  'check',
]

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

describe('app icon registry', () => {
  it('contains every Home icon name (siteIconNames) so stored Home data stays valid', () => {
    for (const name of siteIconNames) expect(appIconNames).toContain(name)
  })

  it('has no duplicates and only kebab-case names', () => {
    expect(new Set(appIconNames).size).toBe(appIconNames.length)
    for (const name of appIconNames) expect(name).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('offers a useful number of icons for the picker', () => {
    expect(appIconNames.length).toBeGreaterThanOrEqual(120)
    expect(appIconNames.length).toBeLessThanOrEqual(200)
  })

  it('maps every name to a component and nothing else', () => {
    for (const name of appIconNames) expect(ICON_MAP[name], name).toBeTruthy()
    expect(Object.keys(ICON_MAP).sort()).toEqual([...appIconNames].sort())
  })

  it('is append-only: every v1 name is still present', () => {
    for (const name of SNAPSHOT_V1) expect(appIconNames, name).toContain(name)
  })

  it('isAppIconName accepts registry names and rejects everything else', () => {
    expect(isAppIconName('wallet')).toBe(true)
    for (const bad of ['', null, undefined, 42, '<script>', 'Check', 'not-an-icon']) {
      expect(isAppIconName(bad), String(bad)).toBe(false)
    }
  })
})

describe('SiteIcon', () => {
  it('renders the mapped icon for a known name', () => {
    const { container } = render(React.createElement(SiteIcon, { name: 'wallet' }))
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('falls back to an icon (no error) for unknown, empty and null names', () => {
    for (const name of ['nope', '', null, undefined]) {
      const { container, unmount } = render(React.createElement(SiteIcon, { name }))
      expect(container.querySelector('svg'), String(name)).not.toBeNull()
      unmount()
    }
  })
})

describe('icon map bundling rule', () => {
  it('no public Client Component imports iconMap (it would ship every icon to visitors)', () => {
    const allowed = [
      path.join('src', 'collections'),
      path.join('src', 'fields', 'IconPicker'),
      path.join('src', 'components', 'site', 'SiteIcon.tsx'),
    ]
    const offenders = walk(path.resolve(process.cwd(), 'src'))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => ({ file, rel: path.relative(process.cwd(), file) }))
      .filter(({ rel }) => !allowed.some((a) => rel.startsWith(a)))
      .filter(({ file }) => {
        const source = readFileSync(file, 'utf8')
        const isClient = /^\s*(\/\*[\s\S]*?\*\/\s*)?['"]use client['"]/.test(source)
        return isClient && /iconMap/.test(source)
      })
      .map(({ rel }) => rel)
    expect(offenders).toEqual([])
  })
})
