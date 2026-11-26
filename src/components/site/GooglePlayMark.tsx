import React from 'react'

/**
 * The four-colour Google Play triangle for the install button. A brand mark: its colours are the same
 * in every theme and live in `globals.css` (`--gplay-*`), never in the component. Decorative: the
 * button's text names the action.
 */
export const GooglePlayMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    className={className}
    data-google-play
    focusable="false"
    viewBox="0 0 512 512"
  >
    <path
      d="M48 59.49v393a4.33 4.33 0 007.37 3.07L260 256 55.37 56.42A4.33 4.33 0 0048 59.49z"
      fill="var(--gplay-blue)"
    />
    <path
      d="M345.8 174L89.22 30.64l-.16-.09c-4.42-2.4-8.62.58-9.2 1.8L260 256z"
      fill="var(--gplay-green)"
    />
    <path
      d="M80.18 480.55c.58 1.22 4.78 4.2 9.2 1.8l.16-.09L345.8 338 260 256z"
      fill="var(--gplay-red)"
    />
    <path
      d="M464.35 256a36.5 36.5 0 00-14.35-30.2L387 190.27 296.14 256 387 321.73l63-35.53A36.5 36.5 0 00464.35 256z"
      fill="var(--gplay-yellow)"
    />
  </svg>
)
