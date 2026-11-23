import React from 'react'

export type LegalTocItem = { id: string; text: string }

/** "On this page" list of the document's h2 sections; renders nothing without headings. */
export const LegalToc: React.FC<{ items: LegalTocItem[]; label: string }> = ({ items, label }) => {
  if (items.length === 0) return null
  return (
    <nav aria-label={label} className="flex flex-col gap-3" data-legal-toc="">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">{label}</p>
      <ol className="flex flex-col gap-2 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className="-ml-px block border-l border-transparent py-0.5 pl-3 text-sm text-text-secondary transition-colors hover:border-primary hover:text-foreground"
              href={`#${item.id}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
