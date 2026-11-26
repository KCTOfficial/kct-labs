import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { appIconNames } from '@/fields/appIcons'
import { iconField, iconNameError } from '@/fields/iconField'
import { IconPickerGrid } from '@/fields/IconPicker/IconPickerGrid'
import { siteIconNames } from '@/fields/iconSelect'

afterEach(cleanup)

describe('iconNameError', () => {
  it('treats empty values as valid (icons are optional)', () => {
    expect(iconNameError(undefined, appIconNames)).toBeNull()
    expect(iconNameError(null, appIconNames)).toBeNull()
    expect(iconNameError('', appIconNames)).toBeNull()
  })

  it('accepts names of the allowed list', () => {
    expect(iconNameError('wallet', appIconNames)).toBeNull()
  })

  it('rejects unknown names, markup and non-strings with a message', () => {
    for (const bad of ['nope', '<img src=x>', 'Wallet', 42]) {
      expect(typeof iconNameError(bad, appIconNames), String(bad)).toBe('string')
    }
  })
})

describe('iconField', () => {
  it('is an optional, non-localized text field named icon with the picker component', () => {
    const field = iconField()
    expect(field).toMatchObject({ name: 'icon', type: 'text', localized: false })
    expect(field.required).toBeFalsy()
    expect(field.admin?.components?.Field).toBe(
      '@/fields/IconPicker/IconPickerField#IconPickerField',
    )
    expect(field.admin?.custom).toEqual({ iconSet: 'app' })
  })

  it('validate accepts registry names and empty values, rejects the rest', async () => {
    const validate = iconField().validate!
    const run = (value: unknown) => validate(value as never, {} as never)
    expect(await run('wallet')).toBe(true)
    expect(await run(undefined)).toBe(true)
    expect(await run('')).toBe(true)
    expect(typeof (await run('nope'))).toBe('string')
  })

  it('lets callers override the name', () => {
    expect(iconField({ name: 'glyph' }).name).toBe('glyph')
  })
})

describe('Home icon select', () => {
  it('uses the same picker component with the 20-name Home set (no enum change)', async () => {
    const { iconSelect } = await import('@/fields/iconSelect')
    const field = iconSelect()
    expect(field.admin?.components?.Field).toBe(
      '@/fields/IconPicker/IconPickerField#IconPickerField',
    )
    expect(field.admin?.custom).toEqual({ iconSet: 'site' })
    expect((field.options as Array<{ value: string }>).map((o) => o.value)).toEqual([
      ...siteIconNames,
    ])
  })
})

const labels = { search: 'Search icons', clear: 'Clear selection', empty: 'No icons match' }

const mount = (props: Partial<React.ComponentProps<typeof IconPickerGrid>> = {}) => {
  const onSelect = vi.fn()
  const utils = render(
    React.createElement(IconPickerGrid, {
      names: appIconNames,
      value: null,
      onSelect,
      labels,
      ...props,
    }),
  )
  return { onSelect, ...utils }
}

const options = () => screen.queryAllByRole('option')
const search = (text: string) =>
  fireEvent.change(screen.getByLabelText(labels.search), { target: { value: text } })

describe('IconPickerGrid', () => {
  it('lists every name as an option', () => {
    mount()
    expect(options()).toHaveLength(appIconNames.length)
  })

  it('filters by name (case-insensitive, trimmed) and by Indonesian/English keyword', () => {
    mount()
    search('  WALLET ')
    expect(options().map((o) => o.getAttribute('aria-label'))).toContain('wallet')
    search('uang')
    const names = options().map((o) => o.getAttribute('aria-label'))
    expect(names).toContain('wallet')
    expect(names).toContain('banknote')
    expect(names).not.toContain('workflow')
  })

  it('shows the empty message when nothing matches', () => {
    mount()
    search('zzzzzz')
    expect(options()).toHaveLength(0)
    expect(screen.getByText(labels.empty)).toBeTruthy()
  })

  it('selecting an icon reports its name', () => {
    const { onSelect } = mount()
    fireEvent.click(screen.getByRole('option', { name: 'wallet' }))
    expect(onSelect).toHaveBeenCalledWith('wallet')
  })

  it('marks only the current value as selected', () => {
    mount({ value: 'wallet' })
    const selected = options().filter((o) => o.getAttribute('aria-selected') === 'true')
    expect(selected.map((o) => o.getAttribute('aria-label'))).toEqual(['wallet'])
  })

  it('offers "clear" only while a value is set, and reports null', () => {
    const first = mount({ value: 'wallet' })
    fireEvent.click(screen.getByRole('button', { name: labels.clear }))
    expect(first.onSelect).toHaveBeenCalledWith(null)
    cleanup()
    mount({ value: null })
    expect(screen.queryByRole('button', { name: labels.clear })).toBeNull()
  })

  it('hides "clear" for required fields', () => {
    mount({ value: 'wallet', allowClear: false })
    expect(screen.queryByRole('button', { name: labels.clear })).toBeNull()
  })

  it('arrow keys move focus between options', () => {
    mount({ names: ['wallet', 'camera', 'zap'] })
    const [first, second] = options()
    first!.focus()
    fireEvent.keyDown(first!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(first)
  })

  it('renders a name that is not in the icon map without crashing (legacy values)', () => {
    mount({ names: ['wallet', 'legacy-name'] })
    expect(options()).toHaveLength(2)
  })
})
