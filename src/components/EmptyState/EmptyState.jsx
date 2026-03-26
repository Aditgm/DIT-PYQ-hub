import React, { useEffect, useRef } from 'react'
import { Upload, Search } from 'lucide-react'
import { trackEmptyStateImpression, trackEmptyStateCtaClick } from '../../lib/analytics/emptyState'
import spec from './empty-state.spec.json'

/**
 * EmptyState — shown when search returns no results.
 *
 * @param {{
 *   searchQuery: string,
 *   illustration?: string,
 *   copyVariant?: string,
 *   locale?: string,
 *   onUpload: Function,
 *   onClearFilters: Function,
 * }} props
 */
const EmptyState = ({
  searchQuery = '',
  illustration = 'search_void',
  copyVariant = 'friendly',
  locale = 'en',
  onUpload,
  onClearFilters,
}) => {
  const trackedRef = useRef(false)

  // Get copy for the selected variant and locale
  const copy = spec.copy_variants[copyVariant]?.[locale]
    || spec.copy_variants[spec.default_copy_variant][spec.default_locale]

  // Interpolate query into body text
  const bodyText = copy.body.replace('{query}', searchQuery)

  // Get illustration path
  const illustrationPath = spec.illustrations[illustration]
    || spec.illustrations[spec.default_illustration]

  // Get alt text
  const altText = spec.alt_text[locale] || spec.alt_text.en

  // Get aria label for CTA
  const ctaAriaLabel = spec.aria.cta_label[locale] || spec.aria.cta_label.en

  // Track impression once
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true
      trackEmptyStateImpression({
        search_query: searchQuery,
        illustration_variant: illustration,
        copy_variant: copyVariant,
        locale,
      })
    }
  }, [searchQuery, illustration, copyVariant, locale])

  const handleCtaClick = () => {
    trackEmptyStateCtaClick({
      search_query: searchQuery,
      illustration_variant: illustration,
      copy_variant: copyVariant,
      locale,
    })
    onUpload?.()
  }

  return (
    <div
      className="empty-state text-center py-12 md:py-16 px-4"
      role="status"
      aria-label={copy.headline}
    >
      {/* Illustration */}
      <img
        src={illustrationPath}
        alt={altText}
        className="empty-state__illustration w-32 h-32 md:w-48 md:h-48 mx-auto mb-4 md:mb-6"
        loading="lazy"
        decoding="async"
      />

      {/* Headline */}
      <h3 className="empty-state__headline text-xl md:text-2xl font-display font-bold text-on-surface mb-2">
        {copy.headline}
      </h3>

      {/* Body */}
      <p className="empty-state__body text-sm md:text-base text-on-surface-variant mb-6 max-w-md mx-auto leading-relaxed">
        {bodyText}
      </p>

      {/* Actions */}
      <div className="empty-state__actions flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleCtaClick}
          className="empty-state__cta btn-primary flex items-center gap-2"
          aria-label={ctaAriaLabel}
        >
          <Upload className="w-4 h-4" />
          {copy.cta}
        </button>

        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="empty-state__secondary btn-secondary flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {copy.secondary}
          </button>
        )}
      </div>
    </div>
  )
}

export default EmptyState
