'use client'
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useId, useRef, useState } from 'react'

import type { Dictionary, Locale } from '@/i18n'
import { stripLocale } from '@/i18n/config'
import { BrandLogo } from '@/components/site/BrandLogo'
import { buttonClassName } from '@/components/site/ButtonLink'
import { LanguageSwitch, LanguageToggleButton } from '@/components/site/LanguageSwitch'
import type { NavItem } from '@/components/site/navigation'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { cn } from '@/utilities/ui'

interface HeaderClientProps {
  locale: Locale
  dict: Pick<Dictionary, 'a11y' | 'nav'>
  homeHref: string
  navItems: NavItem[]
  cta: { label: string; href: string } | null
  contactLine?: string
}

// Compares locale-free paths: during SSR usePathname() is the internal `/en/...` path,
// in the browser it is the public one.
const isActive = (href: string, pathname: string) => {
  const path = stripLocale(href.split(/[?#]/)[0] || '/')
  const current = stripLocale(pathname)
  if (href.includes('#') || path === '/') return false
  return current === path || current.startsWith(`${path}/`)
}

const NavLink: React.FC<{
  item: NavItem
  className?: string
  children?: React.ReactNode
  onClick?: () => void
  active?: boolean
}> = ({ item, className, children, onClick, active }) => {
  const props = item.newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={className}
      href={item.href}
      onClick={onClick}
      {...props}
    >
      {children ?? item.label}
    </Link>
  )
}

const Brand: React.FC<{ href: string; compact?: boolean }> = ({ href, compact }) => (
  // No aria-label: the logo's alt text ("KCT Hub") is the accessible name (WCAG 2.5.3 Label in Name).
  <Link className="flex items-center" href={href}>
    <BrandLogo height={compact ? 24 : 28} />
  </Link>
)

export const HeaderClient: React.FC<HeaderClientProps> = ({
  locale,
  dict,
  homeHref,
  navItems,
  cta,
  contactLine,
}) => {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Close the mobile menu on navigation (state adjusted during render, per React guidance).
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  // Lock page scroll and support Escape while the mobile menu is open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-nav-bg backdrop-blur-xl">
        <div className="site-container flex h-[72px] items-center justify-between gap-6 lg:h-[78px]">
          <div className="hidden lg:block">
            <Brand href={homeHref} />
          </div>
          <div className="lg:hidden">
            <Brand compact href={homeHref} />
          </div>

          <nav aria-label={dict.a11y.mainNavigation} className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {navItems.map((item) => {
                const active = isActive(item.href, pathname)
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <NavLink
                      active={active}
                      className={cn(
                        'text-[15px] font-medium transition-colors hover:text-foreground',
                        active ? 'text-foreground' : 'text-text-secondary',
                      )}
                      item={item}
                    />
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitch current={locale} label={dict.a11y.switchLanguage} />
            <ThemeToggle label={dict.a11y.toggleTheme} />
            {cta && (
              <NavLink
                className={buttonClassName('primary', 'sm', 'h-[42px] px-[18px]')}
                item={{ ...cta, newTab: /^https?:/.test(cta.href) }}
              >
                {cta.label}
              </NavLink>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageToggleButton current={locale} label={dict.a11y.switchLanguage} />
            <ThemeToggle label={dict.a11y.toggleTheme} />
            <button
              aria-controls={menuId}
              aria-expanded={open}
              aria-label={open ? dict.a11y.closeMenu : dict.a11y.openMenu}
              className="inline-flex size-11 items-center justify-center rounded-[12px] border border-border-strong text-foreground"
              onClick={() => setOpen((v) => !v)}
              ref={toggleRef}
              type="button"
            >
              {open ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would make this fixed panel header-sized. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto bg-background lg:hidden',
          open ? 'block' : 'hidden',
        )}
        id={menuId}
      >
        <nav aria-label={dict.a11y.mainNavigation} className="px-4 pt-4">
          <ul>
            {navItems.map((item, index) => (
              <li className="border-b border-border" key={`${item.href}-${item.label}`}>
                <NavLink
                  className="flex items-center justify-between py-5"
                  item={item}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-3.5">
                    <span className="font-mono text-xs text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-[26px] font-semibold text-foreground">
                      {item.label}
                    </span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="size-5 text-text-muted" />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 px-4 py-6">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[15px] text-text-secondary">{dict.nav.language}</span>
            <LanguageSwitch current={locale} label={dict.a11y.switchLanguage} />
          </div>
          {cta && (
            <NavLink
              className={buttonClassName('primary', 'md', 'w-full')}
              item={{ ...cta, newTab: /^https?:/.test(cta.href) }}
              onClick={() => setOpen(false)}
            >
              {cta.label}
              <ArrowRight aria-hidden="true" className="size-[18px]" />
            </NavLink>
          )}
          {contactLine && <p className="font-mono text-xs text-text-muted">{contactLine}</p>}
        </div>
      </div>
    </>
  )
}
