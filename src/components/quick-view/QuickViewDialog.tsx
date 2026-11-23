'use client'

import { ArrowRight, Check, FileText, RefreshCw, Store, TriangleAlert, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useId, useRef } from 'react'

import { buttonClassName, ButtonLink } from '@/components/site/ButtonLink'
import { LEGAL_ICON_COMPONENTS } from '@/components/legal/LegalDocNav'
import { StatusChip } from '@/components/site/StatusChip'
import type { QuickViewApp } from '@/utilities/apps/quickView'

import type { QuickViewLabels, QuickViewState } from './types'

export type QuickViewDialogProps = {
  state: QuickViewState
  labels: QuickViewLabels
  onRequestClose: () => void
  onRetry: () => void
  onViewDetails: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void
  /** The dialog finished closing (any reason): the provider restores focus to the trigger. */
  onClosed: () => void
}

const factChip = 'rounded-[6px] bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-secondary'

const SkeletonBody: React.FC = () => (
  <div aria-hidden="true" className="flex flex-col gap-5 p-5 pt-6 md:p-8">
    <div className="flex items-start gap-4 pr-12">
      <div className="skeleton size-20 shrink-0 rounded-[20px]" />
      <div className="flex flex-1 flex-col gap-3 pt-1">
        <div className="skeleton h-[30px] w-20 rounded-full" />
        <div className="skeleton h-7 w-3/4 rounded-md" />
        <div className="skeleton h-4 w-full rounded-md" />
      </div>
    </div>
    <div className="flex flex-col gap-2.5">
      <div className="skeleton h-3.5 w-full rounded-md" />
      <div className="skeleton h-3.5 w-11/12 rounded-md" />
      <div className="skeleton h-3.5 w-2/3 rounded-md" />
    </div>
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 3 }, (_, i) => (
        <div className="skeleton h-[220px] w-[124px] shrink-0 rounded-[14px]" key={i} />
      ))}
    </div>
    <div className="skeleton h-12 w-full rounded-[12px] sm:w-56" />
  </div>
)

const ErrorBody: React.FC<{
  labels: QuickViewLabels
  href: string
  onRetry: () => void
  onViewDetails: QuickViewDialogProps['onViewDetails']
}> = ({ labels, href, onRetry, onViewDetails }) => (
  <div className="flex flex-col items-start gap-5 p-5 pt-6 md:p-8" role="alert">
    <span className="flex size-12 items-center justify-center rounded-[14px] bg-primary-soft">
      <TriangleAlert aria-hidden="true" className="size-6 text-destructive" />
    </span>
    <p className="pr-10 text-[15px] leading-relaxed text-text-secondary">{labels.error}</p>
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        className={buttonClassName('primary', 'md', 'w-full sm:w-auto')}
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden="true" className="size-[18px]" />
        {labels.retry}
      </button>
      <Link
        className={buttonClassName('ghost', 'md', 'w-full sm:w-auto')}
        href={href}
        onClick={(event) => onViewDetails(event, href)}
      >
        {labels.viewFullDetails}
        <ArrowRight aria-hidden="true" className="size-[18px]" />
      </Link>
    </div>
  </div>
)

const ReadyBody: React.FC<{
  app: QuickViewApp
  href: string
  titleId: string
  labels: QuickViewLabels
  onViewDetails: QuickViewDialogProps['onViewDetails']
}> = ({ app, href, titleId, labels, onViewDetails }) => (
  <div className="flex flex-col gap-5 p-5 pt-6 md:gap-6 md:p-8">
    <div className="flex items-start gap-4 pr-12">
      {app.icon ? (
        <Image
          alt=""
          className="size-20 shrink-0 rounded-[20px] border border-border bg-surface-2 object-cover"
          height={80}
          sizes="80px"
          src={app.icon.src}
          width={80}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-20 shrink-0 items-center justify-center rounded-[20px] border border-border bg-surface-2 font-display text-3xl font-semibold text-primary"
        >
          {app.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-col items-start gap-2">
        <StatusChip label={app.statusLabel} status={app.status} />
        <h2
          className="font-display text-2xl font-semibold leading-tight text-foreground [overflow-wrap:anywhere]"
          id={titleId}
        >
          {app.name}
        </h2>
        {app.tagline && (
          <p className="text-[15px] leading-snug text-text-secondary">{app.tagline}</p>
        )}
      </div>
    </div>

    {app.shortDescription && (
      <p className="text-[15px] leading-[1.6] text-text-secondary">{app.shortDescription}</p>
    )}

    <ul className="flex flex-wrap items-center gap-2">
      {app.categoryTitle && <li className={factChip}>{app.categoryTitle}</li>}
      {app.ageRating && (
        <li className={factChip}>
          <span className="sr-only">{labels.ageRating}: </span>
          {app.ageRating}
        </li>
      )}
      <li className="font-mono text-xs text-text-muted">{app.downloadsText}</li>
    </ul>

    {app.screenshots.length > 0 && (
      <section aria-label={labels.screenshots}>
        <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scrollbar-none md:-mx-8 md:px-8">
          {app.screenshots.map((shot) => (
            <li className="shrink-0 snap-start" key={shot.src}>
              <Image
                alt={shot.alt}
                className="h-[220px] w-auto rounded-[14px] border border-border bg-surface-2"
                height={shot.height}
                sizes="(min-width: 768px) 140px, 124px"
                src={shot.src}
                width={shot.width}
              />
            </li>
          ))}
        </ul>
      </section>
    )}

    {app.features.length > 0 && (
      <section className="flex flex-col gap-3">
        <h3 className="font-mono text-[13px] font-medium uppercase tracking-[0.09em] text-primary">
          {labels.highlights}
        </h3>
        <ul className="flex flex-col gap-2.5">
          {app.features.map((feature) => (
            <li className="flex items-start gap-3 text-[15px] text-foreground" key={feature}>
              <Check aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-primary" />
              <span className="[overflow-wrap:anywhere]">{feature}</span>
            </li>
          ))}
        </ul>
      </section>
    )}

    {app.legal.length > 0 && (
      <nav aria-label={labels.legal} className="flex flex-col gap-2" data-quick-view-legal="">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
          {labels.legal}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {app.legal.map((doc) => {
            const Icon = LEGAL_ICON_COMPONENTS[doc.icon] ?? FileText
            return (
              <li key={doc.href}>
                <Link
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  href={doc.href}
                  onClick={(event) => onViewDetails(event, doc.href)}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {doc.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    )}

    <div className="flex flex-col gap-3 sm:flex-row">
      {app.playStoreUrl && (
        <ButtonLink className="w-full sm:w-auto" href={app.playStoreUrl}>
          <Store aria-hidden="true" className="size-[18px]" />
          {labels.getOnGooglePlay}
        </ButtonLink>
      )}
      <Link
        className={buttonClassName(
          app.playStoreUrl ? 'ghost' : 'primary',
          'md',
          'w-full sm:w-auto',
        )}
        href={href}
        onClick={(event) => onViewDetails(event, href)}
      >
        {labels.viewFullDetails}
        <ArrowRight aria-hidden="true" className="size-[18px]" />
      </Link>
    </div>
  </div>
)

/**
 * App quick-view popup (native <dialog>: focus trap, Escape and top-layer for free). Always mounted
 * once loaded so the exit transition can play; `state.open` opens/closes it. The provider owns
 * history and data — this component is presentation + dialog plumbing only.
 */
export default function QuickViewDialog({
  state,
  labels,
  onRequestClose,
  onRetry,
  onViewDetails,
  onClosed,
}: QuickViewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { open, view } = state

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const isOutside = (event: MouseEvent | PointerEvent) => {
      const rect = dialog.getBoundingClientRect()
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
    }
    // A drag that starts inside and ends on the backdrop must not close the popup.
    let pressedOutside = false
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event)
    }
    const onClick = (event: MouseEvent) => {
      if (pressedOutside && isOutside(event)) onRequestClose()
      pressedOutside = false
    }
    // Escape: route through the provider so the history entry is popped as well.
    const onCancel = (event: Event) => {
      event.preventDefault()
      onRequestClose()
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('click', onClick)
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onClosed)
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('click', onClick)
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onClosed)
    }
  }, [onRequestClose, onClosed])

  const ready = view?.status === 'ready' ? view : null

  return (
    <dialog
      aria-busy={view?.status === 'loading' || undefined}
      aria-label={ready ? undefined : labels.loading}
      aria-labelledby={ready ? titleId : undefined}
      className="qv-dialog"
      ref={dialogRef}
    >
      <button aria-label={labels.close} className="qv-close" onClick={onRequestClose} type="button">
        <X aria-hidden="true" className="size-5" />
      </button>
      {view?.status === 'ready' ? (
        <ReadyBody
          app={view.app}
          href={view.href}
          labels={labels}
          onViewDetails={onViewDetails}
          titleId={titleId}
        />
      ) : view?.status === 'error' ? (
        <ErrorBody
          href={view.href}
          labels={labels}
          onRetry={onRetry}
          onViewDetails={onViewDetails}
        />
      ) : (
        <SkeletonBody />
      )}
    </dialog>
  )
}
