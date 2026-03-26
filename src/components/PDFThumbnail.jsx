import { useState, useEffect, useMemo, useCallback } from 'react'
import { FileText, ImageOff } from 'lucide-react'
import { isPDF } from '../lib/fileType'
import { getCloudinaryThumbnailUrl, canGenerateThumbnail } from '../lib/cloudinary'

const thumbnailCache = new Map()

const THUMBNAIL_CONFIG = {
  width: 200,
  height: 260,
  quality: 80,
}

const PDFThumbnail = ({ paper, size = 'default', showErrorIcon = true, className = '' }) => {
  const [loadState, setLoadState] = useState('idle')
  const [imageSrc, setImageSrc] = useState(null)
  
  const fileUrl = paper?.file_url || paper?.fileUrl
  const title = paper?.title || 'document'
  const isPdf = isPDF(paper)
  
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'small':
        return { container: 'w-10 h-12', icon: 'w-5 h-5' }
      case 'large':
        return { container: 'w-20 h-24', icon: 'w-8 h-8' }
      default:
        return { container: 'w-12 h-16', icon: 'w-6 h-6' }
    }
  }, [size])

  const thumbnailUrl = useMemo(() => {
    if (!fileUrl || !isPdf) return null
    if (!canGenerateThumbnail(fileUrl)) return null
    
    if (thumbnailCache.has(fileUrl)) {
      return thumbnailCache.get(fileUrl)
    }
    
    const url = getCloudinaryThumbnailUrl(fileUrl, THUMBNAIL_CONFIG)
    if (url) {
      thumbnailCache.set(fileUrl, url)
    }
    return url
  }, [fileUrl, isPdf])

  useEffect(() => {
    if (!thumbnailUrl) {
      setLoadState('skipped')
      return
    }

    if (thumbnailCache.get(`loaded:${thumbnailUrl}`)) {
      setImageSrc(thumbnailUrl)
      setLoadState('loaded')
      return
    }

    setLoadState('loading')

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    
    const handleLoad = () => {
      setImageSrc(thumbnailUrl)
      setLoadState('loaded')
      thumbnailCache.set(`loaded:${thumbnailUrl}`, true)
    }
    
    const handleError = () => {
      thumbnailCache.set(`failed:${thumbnailUrl}`, true)
      setLoadState('error')
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)
    
    img.src = thumbnailUrl

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [thumbnailUrl])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
    }
  }, [])

  if (!isPdf) {
    return (
      <div 
        className={`${sizeClasses.container} rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ${className}`}
        role="img"
        aria-label={`${title} (document)`}
      >
        <FileText className={`${sizeClasses.icon} text-primary`} />
      </div>
    )
  }

  if (!thumbnailUrl || loadState === 'skipped') {
    return (
      <div 
        className={`${sizeClasses.container} rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ${className}`}
        role="img"
        aria-label={`Preview of ${title}`}
      >
        <FileText className={`${sizeClasses.icon} text-primary`} />
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <div 
        className={`${sizeClasses.container} rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 skeleton ${className}`}
        role="img"
        aria-label={`Loading preview of ${title}`}
      >
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (loadState === 'error' || !imageSrc) {
    return (
      <div 
        className={`${sizeClasses.container} rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ${className}`}
        role="img"
        aria-label={`No preview available for ${title}`}
      >
        {showErrorIcon ? (
          <ImageOff className={`${sizeClasses.icon} text-primary/50`} />
        ) : (
          <FileText className={`${sizeClasses.icon} text-primary`} />
        )}
      </div>
    )
  }

  return (
    <div 
      className={`${sizeClasses.container} rounded-xl bg-surface-container overflow-hidden flex-shrink-0 ${className}`}
      role="img"
    >
      <img
        src={imageSrc}
        alt={`Preview of ${title}`}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      />
    </div>
  )
}

export default PDFThumbnail