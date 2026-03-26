/**
 * Analytics helper for empty state events.
 * Plugs into any analytics system (GA4, Segment, custom).
 * Falls back to console.log in development.
 */

const isDev = import.meta.env.DEV

/**
 * Track an empty state impression.
 * @param {{ search_query: string, illustration_variant: string, copy_variant: string, locale: string }} data
 */
export function trackEmptyStateImpression(data) {
  const event = {
    event: 'emptyStateImpression',
    search_query: data.search_query,
    illustration_variant: data.illustration_variant,
    copy_variant: data.copy_variant,
    locale: data.locale,
    timestamp: new Date().toISOString(),
  }

  if (isDev) {
    console.log('[analytics]', event)
  }

  // GA4
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'emptyStateImpression', event)
  }

  // Custom data layer
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event)
  }
}

/**
 * Track empty state CTA click.
 * @param {{ search_query: string, illustration_variant: string, copy_variant: string, locale: string }} data
 */
export function trackEmptyStateCtaClick(data) {
  const event = {
    event: 'emptyStateCtaClick',
    search_query: data.search_query,
    illustration_variant: data.illustration_variant,
    copy_variant: data.copy_variant,
    locale: data.locale,
    timestamp: new Date().toISOString(),
  }

  if (isDev) {
    console.log('[analytics]', event)
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'emptyStateCtaClick', event)
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event)
  }
}
