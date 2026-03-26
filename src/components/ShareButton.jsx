import React, { useState, useCallback } from 'react'
import { Share2, Check } from 'lucide-react'
import { shareWithFallback, canShareNatively, trackShareInitiated, trackShareCompleted } from '../lib/shareUtils'

const ShareButton = ({ 
  title, 
  url, 
  source = 'unknown',
  size = 'default',
  variant = 'default',
  disabled = false,
  showLabel = false,
  className = '',
  onShareSuccess,
  onShareError
}) => {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleShare = useCallback(async () => {
    if (disabled || loading || !url) return

    setLoading(true)
    trackShareInitiated(source, title)

    const success = await shareWithFallback({
      title,
      url,
      source,
      onSuccess: () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        onShareSuccess?.()
      },
      onError: (error) => {
        onShareError?.(error)
      }
    })

    setLoading(false)
  }, [title, url, source, disabled, loading, onShareSuccess, onShareError])

  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  }

  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  }

  if (disabled) {
    return (
      <button
        className={`flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant/50 cursor-not-allowed ${sizeClasses[size]} ${className}`}
        disabled
        aria-label={`Share ${title} (disabled)`}
        title="Sharing not available"
      >
        <Share2 className={iconSizes[size]} />
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className={`
        flex items-center justify-center rounded-full
        transition-all duration-200 ease-out
        ${variant === 'primary' 
          ? 'bg-primary text-on-primary hover:bg-primary/90' 
          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
        }
        ${sizeClasses[size]}
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-surface
        ${className}
      `}
      aria-label={`Share ${title}`}
      title="Share"
    >
      {copied ? (
        <Check className={`${iconSizes[size]} text-green-400`} />
      ) : (
        <Share2 className={iconSizes[size]} />
      )}
    </button>
  )
}

export default ShareButton