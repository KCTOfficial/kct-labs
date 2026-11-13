'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { ImageSource } from '@/components/site/media'

type Labels = { previous: string; next: string; close: string; hint: string; heading: string }

/**
 * Horizontal, scroll-snapping screenshot strip with a native `<dialog>` lightbox.
 * Images are server-provided; without JS the strip still scrolls and every image is visible.
 */
export const ScreenshotGallery: React.FC<{ images: ImageSource[]; labels: Labels }> = ({
  images,
  labels,
}) => {
  const stripRef = useRef<HTMLUListElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [active, setActive] = useState<number | null>(null)

  const scrollBy = (direction: 1 | -1) => {
    const strip = stripRef.current
    if (!strip) return
    strip.scrollBy({ left: direction * strip.clientWidth * 0.8, behavior: 'smooth' })
  }

  const open = (index: number) => {
    setActive(index)
    dialogRef.current?.showModal()
  }

  const step = useCallback(
    (direction: 1 | -1) =>
      setActive((i) => (i === null ? i : (i + direction + images.length) % images.length)),
    [images.length],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    const onClose = () => setActive(null)
    dialog.addEventListener('keydown', onKey)
    dialog.addEventListener('close', onClose)
    return () => {
      dialog.removeEventListener('keydown', onKey)
      dialog.removeEventListener('close', onClose)
    }
  }, [step])

  const current = active !== null ? images[active] : null
  const navButton =
    'inline-flex size-10 items-center justify-center rounded-[10px] border border-border-strong text-text-secondary transition-colors hover:text-foreground'

  return (
    <section aria-labelledby="gallery-title" className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <h2
          className="flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.09em] text-primary"
          id="gallery-title"
        >
          <span aria-hidden="true" className="h-px w-6 bg-primary" />
          {labels.heading}
        </h2>
        {images.length > 1 && (
          <div className="hidden gap-2 md:flex">
            <button
              aria-label={labels.previous}
              className={navButton}
              onClick={() => scrollBy(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label={labels.next}
              className={navButton}
              onClick={() => scrollBy(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </div>

      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:gap-6 md:px-0"
        ref={stripRef}
      >
        {images.map((image, index) => (
          <li className="shrink-0 snap-start" key={image.src}>
            <button
              aria-label={`${image.alt} — ${labels.hint}`}
              className="block overflow-hidden rounded-[18px] border border-border md:rounded-lg"
              onClick={() => open(index)}
              type="button"
            >
              <Image
                alt={image.alt}
                className="h-[356px] w-[200px] object-cover md:h-[533px] md:w-[300px]"
                height={533}
                priority={index === 0}
                sizes="(min-width: 768px) 300px, 200px"
                src={image.src}
                width={300}
              />
            </button>
          </li>
        ))}
      </ul>
      <p className="hidden font-mono text-xs text-text-muted md:block">{labels.hint}</p>

      <dialog
        aria-label={labels.heading}
        className="m-auto max-h-[92vh] max-w-[92vw] bg-transparent p-0 backdrop:bg-black/80"
        ref={dialogRef}
      >
        {current && (
          <div className="relative flex items-center gap-3">
            <button
              aria-label={labels.previous}
              className="rounded-full bg-white/10 p-2 text-white"
              onClick={() => step(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-6" />
            </button>
            <Image
              alt={current.alt}
              className="max-h-[88vh] w-auto rounded-lg object-contain"
              height={current.height}
              sizes="92vw"
              src={current.src}
              width={current.width}
            />
            <button
              aria-label={labels.next}
              className="rounded-full bg-white/10 p-2 text-white"
              onClick={() => step(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-6" />
            </button>
            <button
              aria-label={labels.close}
              autoFocus
              className="absolute right-14 top-2 rounded-full bg-black/60 p-2 text-white"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        )}
      </dialog>
    </section>
  )
}
