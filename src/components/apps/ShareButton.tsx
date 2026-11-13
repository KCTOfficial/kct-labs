'use client'

import { Check, Share2 } from 'lucide-react'
import React, { useState } from 'react'

/** Uses the Web Share API when available, otherwise copies the canonical URL to the clipboard. */
export const ShareButton: React.FC<{
  url: string
  title: string
  label: string
  copiedLabel: string
}> = ({ url, title, label, copiedLabel }) => {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // User cancelled the share sheet or clipboard is blocked: nothing to do.
    }
  }

  return (
    <button
      aria-label={copied ? copiedLabel : label}
      className="inline-flex size-[50px] items-center justify-center rounded-[12px] border border-border-strong text-text-secondary transition-colors hover:text-foreground"
      onClick={onClick}
      title={copied ? copiedLabel : label}
      type="button"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-[18px]" />
      ) : (
        <Share2 aria-hidden="true" className="size-[18px]" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </button>
  )
}
