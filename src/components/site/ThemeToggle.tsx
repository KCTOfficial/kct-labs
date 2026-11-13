'use client'

import { SunMoon } from 'lucide-react'
import React from 'react'

import { useTheme } from '@/providers/Theme'
import { cn } from '@/utilities/ui'

export const ThemeToggle: React.FC<{ label: string; className?: string }> = ({
  label,
  className,
}) => {
  const { theme, setTheme } = useTheme()

  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-[12px] border border-border-strong text-text-secondary transition-colors hover:text-foreground',
        className,
      )}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      type="button"
    >
      <SunMoon aria-hidden="true" className="size-[18px]" />
    </button>
  )
}
