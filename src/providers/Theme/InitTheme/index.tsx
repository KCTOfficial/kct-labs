import React from 'react'

import { defaultTheme, themeLocalStorageKey } from '../ThemeSelector/types'

/**
 * Sets `data-theme` on <html> before the first paint.
 *
 * Rendered as a plain inline <script> in <head> (server component), so it runs synchronously while
 * the HTML is parsed. `next/script` with `beforeInteractive` is queued until the Next.js runtime
 * has loaded, which delayed the first visible paint (and LCP) by several seconds on mobile.
 * The script body is a static string (no user input), so injecting it is safe.
 */
const script = `
(function () {
  function getImplicitPreference() {
    var mql = window.matchMedia('(prefers-color-scheme: dark)')
    return typeof mql.matches === 'boolean' ? (mql.matches ? 'dark' : 'light') : null
  }
  function themeIsValid(theme) {
    return theme === 'light' || theme === 'dark'
  }
  var themeToSet = '${defaultTheme}'
  var preference = null
  try { preference = window.localStorage.getItem('${themeLocalStorageKey}') } catch (e) {}
  if (themeIsValid(preference)) {
    themeToSet = preference
  } else {
    var implicitPreference = getImplicitPreference()
    if (implicitPreference) themeToSet = implicitPreference
  }
  document.documentElement.setAttribute('data-theme', themeToSet)
})();
`

export const InitTheme: React.FC = () => (
  <script dangerouslySetInnerHTML={{ __html: script }} id="theme-script" />
)
