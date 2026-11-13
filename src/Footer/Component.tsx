import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { LanguageSwitch } from '@/components/site/LanguageSwitch'
import { footerColumns, toNavItems, type NavItem } from '@/components/site/navigation'
import { getDictionary, localizeHref, type Locale } from '@/i18n'
import { toWhatsAppNumber } from '@/utilities/apps/validation'
import { getCachedLocalizedGlobal } from '@/utilities/getGlobals'

const FooterLink: React.FC<{ item: NavItem }> = ({ item }) => {
  const props =
    item.newTab || /^https?:/.test(item.href)
      ? { rel: 'noopener noreferrer', target: '_blank' }
      : {}
  return (
    <Link
      className="text-sm text-text-secondary transition-colors hover:text-foreground"
      href={item.href}
      {...props}
    >
      {item.label}
    </Link>
  )
}

export async function Footer({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale)
  const footer = await getCachedLocalizedGlobal('footer', locale, 1)()

  const columns = footerColumns(footer, locale)
  const legacyItems = toNavItems(footer?.navItems, locale)
  const contact = footer?.contact
  const holder = footer?.copyrightHolder?.trim() || 'PT Kreasindo Cipta Teknologi'
  const year = new Date().getFullYear()

  const contactItems = [
    contact?.email && { label: contact.email, href: `mailto:${contact.email}` },
    contact?.whatsapp && {
      label: `WhatsApp ${contact.whatsapp}`,
      href: `https://wa.me/${toWhatsAppNumber(contact.whatsapp)}`,
    },
    contact?.phone && { label: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` },
  ].filter(Boolean) as Array<{ label: string; href: string }>

  return (
    <footer className="mt-auto border-t border-border bg-bg-raised">
      <div className="site-container flex flex-col gap-12 pb-8 pt-10 md:pt-16">
        <div className="grid gap-10 md:grid-cols-[minmax(0,360px)_1fr] md:gap-16">
          <div className="flex flex-col gap-4">
            <Link className="flex items-center gap-2.5" href={localizeHref('/', locale)}>
              <Image alt="" className="size-[34px]" height={34} src="/icon-512.png" width={34} />
              <span className="font-display text-[17px] font-semibold text-foreground">
                Kreasindo Cipta Teknologi
              </span>
            </Link>
            {footer?.tagline && (
              <p className="text-sm leading-relaxed text-text-secondary">{footer.tagline}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div className="flex flex-col gap-3.5" key={column.title}>
                <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-text-muted">
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-3.5">
                  {column.links.map((item) => (
                    <li key={`${item.href}-${item.label}`}>
                      <FooterLink item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {!columns.length && legacyItems.length > 0 && (
              <ul className="flex flex-col gap-3.5">
                {legacyItems.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            )}

            {(contactItems.length > 0 || contact?.address) && (
              <div className="col-span-2 flex flex-col gap-3.5 sm:col-span-1">
                <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-text-muted">
                  {dict.footer.contact}
                </h2>
                <ul className="flex flex-col gap-3.5">
                  {contactItems.map((item) => (
                    <li key={item.href}>
                      <a
                        className="text-sm text-text-secondary transition-colors hover:text-foreground"
                        href={item.href}
                        {...(item.href.startsWith('http')
                          ? { rel: 'noopener noreferrer', target: '_blank' }
                          : {})}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                  {contact?.address && (
                    <li className="text-sm text-text-secondary">{contact.address}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-text-muted">
            © {year} {holder}. {dict.footer.rights}
          </p>
          <LanguageSwitch current={locale} label={dict.a11y.switchLanguage} />
        </div>
      </div>
    </footer>
  )
}
