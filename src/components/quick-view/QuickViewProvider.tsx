'use client'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import type { Locale } from '@/i18n/config'
import { isAppDetailPath, parseAppDetailPath } from '@/utilities/apps/appPath'

import { fetchQuickView, peekQuickView, prefetchQuickView, QuickViewError } from './quickViewClient'
import type { QuickViewLabels, QuickViewState, QuickViewView } from './types'

type DialogComponent = typeof import('./QuickViewDialog').default
type Target = { slug: string; locale: Locale; href: string }
type Action = { type: 'show'; view: QuickViewView } | { type: 'close' }

/** `history.state` marker on the entry we push when the popup opens. */
const HISTORY_KEY = 'kctQuickView'
const ANCHOR_SELECTOR = 'a[data-quick-view]'
const HOVER_PREFETCH_DELAY_MS = 80
// If `history.back()` never produces a popstate (should not happen), force-close the popup.
const POP_SAFETY_MS = 500

const reducer = (state: QuickViewState, action: Action): QuickViewState => {
  if (action.type === 'show') return { open: true, view: action.view }
  return state.open ? { ...state, open: false } : state
}

const anchorFrom = (target: EventTarget | null): HTMLAnchorElement | null =>
  target instanceof Element ? target.closest<HTMLAnchorElement>(ANCHOR_SELECTOR) : null

const targetFrom = (anchor: HTMLAnchorElement): Target | null => {
  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return null
  const detail = parseAppDetailPath(url.pathname)
  return detail ? { ...detail, href: `${url.pathname}${url.search}` } : null
}

const hasOpenSelectionInside = (anchor: HTMLAnchorElement): boolean => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return false
  const card = anchor.closest('article') ?? anchor
  return card.contains(selection.anchorNode)
}

const saveData = (): boolean =>
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)

/**
 * App quick-view. Progressive enhancement over the normal card link: a capture-phase click
 * interceptor (runs before next/link's own handler) opens a popup and pushes the real
 * `/apps/<slug>` URL; every other path (modifier keys, no JS, failures, unknown slug) is plain
 * navigation. The dialog UI is a lazy chunk. See docs/DEPLOYMENT.md / CLAUDE.md for the flag.
 */
export const QuickViewProvider: React.FC<{ enabled: boolean; labels: QuickViewLabels }> = ({
  enabled,
  labels,
}) => {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, { open: false, view: null })
  const [Dialog, setDialog] = useState<DialogComponent | null>(null)

  const stateRef = useRef(state)
  // True while the active history entry is the one this popup pushed.
  const ownedRef = useRef(false)
  // Synchronous guard against double clicks (state updates are async).
  const busyRef = useRef(false)
  const requestRef = useRef(0)
  const triggerRef = useRef<HTMLElement | null>(null)
  // A close that pops our history entry is in flight: further close requests must NOT pop again
  // (a second history.back() would leave the page), and its safety timer must not outlive it.
  const closingRef = useRef(false)
  const popTimerRef = useRef<number | undefined>(undefined)
  const dialogLoadRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const ensureDialog = useCallback((): Promise<void> => {
    dialogLoadRef.current ??= import('./QuickViewDialog')
      .then((module) => setDialog(() => module.default))
      .catch((error: unknown) => {
        dialogLoadRef.current = null
        throw error
      })
    return dialogLoadRef.current
  }, [])

  const closeUi = useCallback(() => {
    window.clearTimeout(popTimerRef.current)
    popTimerRef.current = undefined
    closingRef.current = false
    requestRef.current += 1
    busyRef.current = false
    dispatch({ type: 'close' })
  }, [])

  /** Leave the popup for the real page. The pushed entry has the same URL, so Next replaces it. */
  const navigateToFull = useCallback(
    (href: string) => {
      ownedRef.current = false
      closeUi()
      router.push(href)
    },
    [closeUi, router],
  )

  const load = useCallback(
    (target: Target, id: number) => {
      const base = { slug: target.slug, href: target.href }
      fetchQuickView(target.slug, target.locale)
        .then((app) => {
          if (id === requestRef.current)
            dispatch({ type: 'show', view: { status: 'ready', ...base, app } })
        })
        .catch((error: unknown) => {
          if (id !== requestRef.current) return
          // Unknown/archived/unpublished: let the real page decide (404, redirect, noindex page).
          if (error instanceof QuickViewError && error.reason === 'not_found') {
            navigateToFull(target.href)
            return
          }
          dispatch({ type: 'show', view: { status: 'error', ...base } })
        })
    },
    [navigateToFull],
  )

  const openApp = useCallback(
    (target: Target, trigger: HTMLElement | null, push: boolean) => {
      window.clearTimeout(popTimerRef.current)
      popTimerRef.current = undefined
      closingRef.current = false
      if (push) window.history.pushState({ [HISTORY_KEY]: target.href }, '', target.href)
      ownedRef.current = true
      busyRef.current = true
      triggerRef.current = trigger
      const id = (requestRef.current += 1)
      const base = { slug: target.slug, href: target.href }

      const cached = peekQuickView(target.slug, target.locale)
      dispatch({
        type: 'show',
        view: cached ? { status: 'ready', ...base, app: cached } : { status: 'loading', ...base },
      })
      ensureDialog().catch(() => {
        if (id === requestRef.current) navigateToFull(target.href)
      })
      if (!cached) load(target, id)
    },
    [ensureDialog, load, navigateToFull],
  )

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    if (!ownedRef.current) {
      closeUi()
      return
    }
    // Pop our history entry (once); the popstate handler closes the UI.
    closingRef.current = true
    window.history.back()
    popTimerRef.current = window.setTimeout(() => {
      if (stateRef.current.open && ownedRef.current) {
        ownedRef.current = false
        closeUi()
      }
    }, POP_SAFETY_MS)
  }, [closeUi])

  const retry = useCallback(() => {
    const view = stateRef.current.view
    const target = view ? parseAppDetailPath(view.href.split('?')[0] ?? '') : null
    if (!view || !target) return
    const id = (requestRef.current += 1)
    const next = { slug: view.slug, locale: target.locale, href: view.href }
    dispatch({ type: 'show', view: { status: 'loading', slug: view.slug, href: view.href } })
    load(next, id)
  }, [load])

  const viewDetails = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      // Let the browser handle new-tab/window gestures.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      event.preventDefault()
      navigateToFull(href)
    },
    [navigateToFull],
  )

  const restoreFocus = useCallback(() => {
    const trigger = triggerRef.current
    const active = document.activeElement
    if (trigger?.isConnected && (!active || active === document.body)) {
      trigger.focus({ preventScroll: true })
    }
  }, [])

  // Click interception, history sync and warm-ups.
  useEffect(() => {
    if (!enabled || typeof HTMLDialogElement === 'undefined') return
    if (typeof HTMLDialogElement.prototype.showModal !== 'function') return

    const controller = new AbortController()
    const { signal } = controller
    let hoverTimer: number | undefined

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = anchorFrom(event.target)
      if (!anchor) return
      if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
      const target = targetFrom(anchor)
      if (!target) return
      // On a detail page (e.g. related apps) behave like a normal link: no stacked popups.
      if (isAppDetailPath(window.location.pathname)) return
      if (hasOpenSelectionInside(anchor)) return

      event.preventDefault()
      event.stopPropagation()
      if (busyRef.current) return
      openApp(target, anchor, true)
    }

    const onPopState = () => {
      const marker = (window.history.state as Record<string, unknown> | null)?.[HISTORY_KEY]
      const detail =
        typeof marker === 'string' ? parseAppDetailPath(window.location.pathname) : null
      if (detail) {
        // Forward onto an entry we pushed earlier: reopen.
        ownedRef.current = true
        if (!stateRef.current.open) {
          openApp(
            { ...detail, href: `${window.location.pathname}${window.location.search}` },
            null,
            false,
          )
        }
        return
      }
      ownedRef.current = false
      if (stateRef.current.open) closeUi()
    }

    const warm = (anchor: HTMLAnchorElement) => {
      const target = targetFrom(anchor)
      if (!target || isAppDetailPath(window.location.pathname)) return
      ensureDialog().catch(() => undefined)
      prefetchQuickView(target.slug, target.locale)
    }

    // Mouse hover (debounced) and keyboard focus only: never prefetch on touch or for every card.
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || saveData()) return
      const anchor = anchorFrom(event.target)
      if (!anchor) return
      window.clearTimeout(hoverTimer)
      hoverTimer = window.setTimeout(() => warm(anchor), HOVER_PREFETCH_DELAY_MS)
    }
    const onPointerOut = () => window.clearTimeout(hoverTimer)
    const onFocusIn = (event: FocusEvent) => {
      const anchor = anchorFrom(event.target)
      if (anchor?.matches(':focus-visible') && !saveData()) warm(anchor)
    }

    document.addEventListener('click', onClick, { capture: true, signal })
    document.addEventListener('pointerover', onPointerOver, { signal })
    document.addEventListener('pointerout', onPointerOut, { signal })
    document.addEventListener('focusin', onFocusIn, { signal })
    window.addEventListener('popstate', onPopState, { signal })

    // Preload the dialog chunk when idle so the first click opens instantly.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          // Not on detail pages: cards there navigate normally, so the popup chunk would be dead weight.
          if (saveData() || isAppDetailPath(window.location.pathname)) return
          if (document.querySelector(ANCHOR_SELECTOR)) ensureDialog().catch(() => undefined)
        })
      : undefined

    document.documentElement.dataset.qvReady = 'true'
    return () => {
      controller.abort()
      window.clearTimeout(hoverTimer)
      window.clearTimeout(popTimerRef.current)
      if (idle !== undefined) window.cancelIdleCallback(idle)
      delete document.documentElement.dataset.qvReady
    }
  }, [enabled, closeUi, ensureDialog, openApp])

  if (!enabled || !Dialog) return null
  return (
    <Dialog
      labels={labels}
      onClosed={restoreFocus}
      onRequestClose={requestClose}
      onRetry={retry}
      onViewDetails={viewDetails}
      state={state}
    />
  )
}
