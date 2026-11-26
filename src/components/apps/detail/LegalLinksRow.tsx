import { ArrowRight, FileText, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { LEGAL_ICON_COMPONENTS } from '@/components/legal/LegalDocNav'
import type { Dictionary } from '@/i18n'
import type { LegalIcon } from '@/utilities/legal/constants'

/**
 * Small row of the app's legal documents (Google Play links to them), the legacy external privacy
 * link and the support email. Quiet by design: the page itself follows the design, which has no
 * legal panel, but these links must stay reachable. Nothing renders when there is nothing to show.
 */
export const LegalLinksRow: React.FC<{
  docs: Array<{ href: string; title: string; icon: string }>
  legacyPrivacyUrl: string | null
  allDocsHref: string | null
  supportEmail: string | null
  dict: Dictionary
}> = ({ docs, legacyPrivacyUrl, allDocsHref, supportEmail, dict }) => {
  const hasLegal = docs.length > 0 || legacyPrivacyUrl !== null
  if (!hasLegal && !supportEmail) return null
  const linkClass =
    'inline-flex items-center gap-2 font-medium text-text-secondary transition-colors hover:text-foreground'
  return (
    <div className="site-container pb-10 pt-2 lg:pb-16">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-sm">
        {hasLegal && (
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3" data-legal-links="">
            {docs.map((doc) => {
              const Icon = LEGAL_ICON_COMPONENTS[doc.icon as LegalIcon] ?? FileText
              return (
                <li key={doc.href}>
                  <Link className={linkClass} href={doc.href}>
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {doc.title}
                  </Link>
                </li>
              )
            })}
            {legacyPrivacyUrl && (
              <li>
                <a
                  className={linkClass}
                  href={legacyPrivacyUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  {dict.detail.privacyPolicy}
                </a>
              </li>
            )}
            {allDocsHref && docs.length > 0 && (
              <li>
                <Link className={linkClass} href={allDocsHref}>
                  {dict.legal.allDocuments}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            )}
          </ul>
        )}
        {supportEmail && (
          <a className={linkClass} href={`mailto:${supportEmail}`}>
            <Mail aria-hidden="true" className="size-4" />
            {dict.detail.contactSupport}
          </a>
        )}
      </div>
    </div>
  )
}
