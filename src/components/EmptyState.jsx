import React from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileText, AlertCircle, RefreshCw } from 'lucide-react'

/**
 * Reusable empty state component for various scenarios.
 *
 * @param {{
 *   variant: 'search' | 'upload_error' | 'no_uploads' | 'no_papers' | 'generic',
 *   title: string,
 *   message: string,
 *   ctaLabel: string,
 *   ctaTo: string,
 *   secondaryLabel?: string,
 *   onSecondary?: Function,
 *   illustration?: React.ReactNode,
 *   searchQuery?: string,
 * }} props
 */
const EmptyState = ({
  variant = 'generic',
  title,
  message,
  ctaLabel,
  ctaTo,
  secondaryLabel,
  onSecondary,
  illustration,
  searchQuery = '',
}) => {
  const icons = {
    search: <FileText className="w-12 h-12 md:w-16 md:h-16 text-on-surface-variant opacity-40" />,
    upload_error: <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-400 opacity-60" />,
    no_uploads: <Upload className="w-12 h-12 md:w-16 md:h-16 text-primary opacity-50" />,
    no_papers: <FileText className="w-12 h-12 md:w-16 md:h-16 text-on-surface-variant opacity-40" />,
    generic: <FileText className="w-12 h-12 md:w-16 md:h-16 text-on-surface-variant opacity-40" />,
  }

  return (
    <div
      className="text-center py-12 md:py-16 px-4"
      role="status"
      aria-label={title}
    >
      {/* Illustration or icon */}
      <div className="w-32 h-32 md:w-48 md:h-48 mx-auto mb-4 md:mb-6 flex items-center justify-center">
        {illustration || icons[variant] || icons.generic}
      </div>

      {/* Headline */}
      <h3 className="text-xl md:text-2xl font-display font-bold text-on-surface mb-2">
        {title}
      </h3>

      {/* Body */}
      <p className="text-sm md:text-base text-on-surface-variant mb-6 max-w-md mx-auto leading-relaxed">
        {message}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {ctaTo && ctaLabel && (
          <Link
            to={ctaTo}
            className="btn-primary flex items-center gap-2"
            aria-label={ctaLabel}
          >
            <Upload className="w-4 h-4" />
            {ctaLabel}
          </Link>
        )}
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Preset configurations for common scenarios ────────────────────

/** Zero search results */
export const SearchEmptyState = ({ query, onClear }) => (
  <EmptyState
    variant="search"
    title="No papers found"
    message={`Looks like we don't have any papers for "${query}" yet. Be a hero and upload one!`}
    ctaLabel="Be the first to upload this paper!"
    ctaTo="/upload"
    secondaryLabel="Clear search"
    onSecondary={onClear}
  />
)

/** Upload failure */
export const UploadErrorState = ({ error, onRetry }) => (
  <EmptyState
    variant="upload_error"
    title="Upload failed"
    message={error || 'Something went wrong while uploading your paper. Please try again.'}
    ctaLabel="Try uploading again"
    ctaTo="/upload"
    secondaryLabel="Retry"
    onSecondary={onRetry}
  />
)

/** User has no uploads yet */
export const NoUploadsState = () => (
  <EmptyState
    variant="no_uploads"
    title="You haven't uploaded any papers yet"
    message="Help your fellow students by sharing previous year question papers. Every upload counts!"
    ctaLabel="Upload your first paper"
    ctaTo="/upload"
  />
)

/** No papers in a category */
export const NoPapersState = ({ subject }) => (
  <EmptyState
    variant="no_papers"
    title="Nothing here yet"
    message={`No papers have been uploaded for ${subject || 'this subject'} yet. Be the first to contribute!`}
    ctaLabel="Be the first to upload this paper!"
    ctaTo="/upload"
  />
)

export default EmptyState
