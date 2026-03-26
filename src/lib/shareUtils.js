const analytics = {
  track: (event, data = {}) => {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', event, data)
      }
      console.log('[Analytics]', event, data)
    } catch (e) {
      console.warn('Analytics not available:', e)
    }
  }
}

export const trackShareInitiated = (source, paperTitle) => {
  analytics.track('share_initiated', {
    source,
    paper_title: paperTitle,
    timestamp: new Date().toISOString()
  })
}

export const trackShareCompleted = (source, paperTitle, method) => {
  analytics.track('share_completed', {
    source,
    paper_title: paperTitle,
    method,
    timestamp: new Date().toISOString()
  })
}

export const canShareNatively = () => {
  return typeof navigator !== 'undefined' && !!navigator.share
}

export const generateShareText = (title, url) => {
  return `Check out this paper on DIT PYQ Hub: ${title} - ${url}`
}

export const generateWhatsAppShareUrl = (title, url) => {
  const text = generateShareText(title, url)
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export const shareItem = async (options) => {
  const { 
    title, 
    url, 
    text, 
    source = 'unknown',
    onSuccess,
    onError 
  } = options

  if (!url) {
    onError?.('No URL available to share')
    return false
  }

  trackShareInitiated(source, title)

  const shareText = text || generateShareText(title, url)

  if (canShareNatively()) {
    try {
      await navigator.share({
        title: title,
        text: shareText,
        url: url
      })
      trackShareCompleted(source, title, 'native_share')
      onSuccess?.()
      return true
    } catch (error) {
      if (error.name === 'AbortError') {
        return false
      }
      trackShareCompleted(source, title, 'native_share_error')
      onError?.(error.message)
      return false
    }
  }

  return false
}

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textArea)
    return result
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

export const shareWithFallback = async (options) => {
  const { 
    title, 
    url, 
    text,
    source = 'unknown',
    onSuccess,
    onError 
  } = options

  if (!url) {
    onError?.('No URL available to share')
    return false
  }

  trackShareInitiated(source, title)

  if (canShareNatively()) {
    try {
      await navigator.share({
        title: title,
        text: text || generateShareText(title, url),
        url: url
      })
      trackShareCompleted(source, title, 'native_share')
      onSuccess?.()
      return true
    } catch (error) {
      if (error.name === 'AbortError') {
        return false
      }
    }
  }

  const shareText = text || generateShareText(title, url)

  try {
    const copied = await copyToClipboard(shareText)
    if (copied) {
      trackShareCompleted(source, title, 'copy_link')
      onSuccess?.()
      return true
    }
  } catch (e) {
    console.error('Copy failed:', e)
  }

  const whatsappUrl = generateWhatsAppShareUrl(title, url)
  if (whatsappUrl) {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    trackShareCompleted(source, title, 'whatsapp')
    onSuccess?.()
    return true
  }

  trackShareCompleted(source, title, 'fallback_failed')
  onError?.('Unable to share')
  return false
}

export default {
  canShareNatively,
  generateShareText,
  generateWhatsAppShareUrl,
  shareItem,
  shareWithFallback,
  copyToClipboard,
  trackShareInitiated,
  trackShareCompleted
}