import { Languages } from 'lucide-react'
import React from 'react'

/** Shown on `/id/...` when the document has no Indonesian content and English is rendered. */
export const LegalFallbackNotice: React.FC<{ message: string }> = ({ message }) => (
  <p
    className="flex items-start gap-2.5 rounded-md border border-border bg-surface-2 px-4 py-3 text-sm text-text-secondary"
    data-legal-fallback=""
    role="note"
  >
    <Languages aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
    {message}
  </p>
)
