/**
 * Whether app cards open the quick-view popup. Cards now go straight to the full detail page; the
 * popup code stays in place and is re-enabled with `QUICK_VIEW_CARDS=true` (read at build time →
 * redeploy). `QUICK_VIEW_ENABLED=false` remains a master kill-switch. Never active in draft mode.
 */
export const isQuickViewEnabled = (isDraftMode: boolean): boolean =>
  process.env.QUICK_VIEW_CARDS === 'true' &&
  process.env.QUICK_VIEW_ENABLED !== 'false' &&
  !isDraftMode
