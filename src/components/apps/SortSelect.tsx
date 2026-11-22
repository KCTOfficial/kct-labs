'use client'

import { ChevronsUpDown } from 'lucide-react'
import Form from 'next/form'
import React from 'react'

import { FormPendingIcon } from '@/components/apps/PendingIndicators'
import { cn } from '@/utilities/ui'

/**
 * Sort control inside a GET form (`next/form`: client-side navigation). Submits on change; the
 * "Apply" button in <noscript> keeps it usable when JavaScript is unavailable.
 */
export const SortSelect: React.FC<{
  action: string
  label: string
  applyLabel: string
  value: string
  options: Array<{ value: string; label: string }>
  hidden: Record<string, string | undefined>
  id: string
  className?: string
}> = ({ action, label, applyLabel, value, options, hidden, id, className }) => (
  <Form action={action} className={cn('relative flex items-center', className)}>
    {Object.entries(hidden).map(([name, v]) =>
      v ? <input key={name} name={name} type="hidden" value={v} /> : null,
    )}
    <label className="sr-only" htmlFor={id}>
      {label}
    </label>
    <select
      className="h-12 w-full appearance-none rounded-[12px] border border-border bg-surface pl-3.5 pr-10 text-sm text-text-secondary focus:border-primary focus:outline-none"
      defaultValue={value}
      id={id}
      name="sort"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {label}: {o.label}
        </option>
      ))}
    </select>
    <span className="pointer-events-none absolute right-3.5 flex size-4 items-center justify-center text-text-muted">
      <FormPendingIcon
        className="size-4 text-primary"
        idle={<ChevronsUpDown aria-hidden="true" className="size-4" />}
      />
    </span>
    <noscript>
      <button className="ml-2 text-sm text-primary" type="submit">
        {applyLabel}
      </button>
    </noscript>
  </Form>
)
