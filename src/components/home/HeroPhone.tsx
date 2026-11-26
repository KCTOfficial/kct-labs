'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { PhoneFrame } from '@/components/site/PhoneFrame'

import { layerWindow, slotScreenIndex, stepActive, type SlideDirection } from './heroCarouselModel'
import type { HeroApp } from './HeroStage'
import type { PhoneSlot } from './scrollStoryConfig'

const SIZES = '(min-width: 1024px) 260px, 170px'

type LayerRole = 'prev' | 'cur' | 'next'
type Layer = { index: number; role: LayerRole }

type Props = {
  apps: HeroApp[]
  /** Active app index (committed state, before a running slide). */
  appIndex: number
  slot: PhoneSlot
  slide: SlideDirection | null
  /** Neighbour screens are mounted only after idle/first interaction (keeps LCP/bandwidth clean). */
  neighborsReady: boolean
}

/**
 * One phone of the hero stage. Every phone belongs to the active app and shows the screenshot of
 * its slot; its prev/next layers hold the neighbour apps' screenshot for the same slot (empty
 * screen when that app has no phone there). The pose wrapper (position/rotation) lives in
 * HeroStage. The anchor is a decorative mouse/touch shortcut (aria-hidden, not tabbable): keyboard
 * users reach the app through the caption link.
 */
export const HeroPhone: React.FC<Props> = ({ apps, appIndex, slot, slide, neighborsReady }) => {
  const count = apps.length
  const [prevIndex, curIndex, nextIndex] = layerWindow(appIndex, count)

  // DOM order stays fixed per app count (layers are absolutely positioned, keyed by app id), so
  // committing a step never reorders or remounts a screen that is already loaded.
  const layers: Layer[] = []
  if (!neighborsReady || count < 2) {
    layers.push({ index: curIndex, role: 'cur' })
  } else if (count === 2) {
    // Only one other app exists: it waits on the side it will slide in from.
    layers.push(
      { index: curIndex, role: 'cur' },
      { index: nextIndex, role: slide === 'prev' ? 'prev' : 'next' },
    )
  } else {
    layers.push(
      { index: prevIndex, role: 'prev' },
      { index: curIndex, role: 'cur' },
      { index: nextIndex, role: 'next' },
    )
  }

  // While sliding, the link already points at the app arriving on the stage.
  const target = apps[slide ? stepActive(appIndex, count, slide) : curIndex]!

  const screen = (
    <div className="hero-track absolute inset-0" data-slide={slide ?? undefined} data-slot={slot}>
      {layers.map(({ index, role }) => {
        const app = apps[index]!
        const shot = slotScreenIndex(app.screens.length, slot)
        const image = shot === null ? null : (app.screens[shot] ?? null)
        // Same preload policy as the static hero: only screenshot 1 of the first app (centre) is the LCP.
        const priority = slot === 'center' && index === 0
        return (
          <div className="absolute inset-0 bg-surface-2" data-role={role} key={app.id}>
            {image && (
              <Image
                alt={image.alt}
                className="object-cover object-top"
                draggable={false}
                fetchPriority={priority ? undefined : 'low'}
                fill
                loading={priority ? undefined : 'eager'}
                priority={priority}
                sizes={SIZES}
                src={image.src}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <Link
        aria-hidden="true"
        className="block cursor-pointer"
        data-hero-phone-link
        data-slot={slot}
        draggable={false}
        href={target.href}
        tabIndex={-1}
      >
        <PhoneFrame
          className="w-full max-lg:rounded-[26px] max-lg:p-1.5 [&>div]:max-lg:rounded-[20px]"
          image={null}
          screen={screen}
          sizes={SIZES}
        />
      </Link>
    </div>
  )
}
