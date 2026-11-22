import { Search } from 'lucide-react'
import Form from 'next/form'
import React from 'react'

import { FormPendingIcon } from '@/components/apps/PendingIndicators'
import type { Dictionary } from '@/i18n'
import { SEARCH_MAX_LENGTH } from '@/utilities/apps/params'
import { cn } from '@/utilities/ui'

/**
 * GET form → `/apps?q=…` via `next/form`: client-side navigation (no full reload, shows the listing
 * skeleton) and, without JavaScript, a plain GET form. Results stay crawlable/shareable.
 * `hidden` carries the active filters (category, sort) so searching doesn't reset them.
 */
export const SearchForm: React.FC<{
  action: string
  dict: Dictionary
  defaultValue?: string
  hidden?: Record<string, string | undefined>
  className?: string
  /** Must be unique per page when several search forms are rendered. */
  id?: string
}> = ({ action, dict, defaultValue, hidden, className, id = 'app-search' }) => (
  <Form
    action={action}
    className={cn(
      'flex h-12 items-center gap-2.5 rounded-[12px] border border-border bg-surface px-4 focus-within:border-primary',
      className,
    )}
    role="search"
  >
    <FormPendingIcon
      className="size-[18px] shrink-0 text-primary"
      idle={<Search aria-hidden="true" className="size-[18px] shrink-0 text-text-muted" />}
    />
    <label className="sr-only" htmlFor={id}>
      {dict.listing.searchLabel}
    </label>
    <input
      autoComplete="off"
      className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
      defaultValue={defaultValue}
      enterKeyHint="search"
      id={id}
      maxLength={SEARCH_MAX_LENGTH}
      name="q"
      placeholder={dict.listing.searchPlaceholder}
      type="search"
    />
    {Object.entries(hidden ?? {}).map(([name, value]) =>
      value ? <input key={name} name={name} type="hidden" value={value} /> : null,
    )}
    <button className="sr-only" type="submit">
      {dict.listing.searchSubmit}
    </button>
  </Form>
)
