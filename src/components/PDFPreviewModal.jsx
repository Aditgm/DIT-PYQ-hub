import React, { useState, useEffect } from 'react'
import { X, FileText, Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react'
import { getPreviewUrl, isPDF } from '../lib/fileType'
import { usePreviewCounter } from '../hooks/usePreviewCounter'
import PreviewLimitGuard, { PreviewCounterBanner } from './PreviewLimitGuard'
import PdfJsViewer from './PdfJsViewer'

const PDFPreviewModal = ({ 
  isOpen, 
  onClose, 
  paper, 
  onDownload 
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isStandaloneMobile, setIsStandaloneMobile] = useState(false)
  const [forcePdfJsFallback, setForcePdfJsFallback] = useState(false)

  const { increment } = usePreviewCounter()

  // Reset state when paper changes
  useEffect(() => {
    if (isOpen && paper) {
      setIsLoading(true)
      setError(null)
      setForcePdfJsFallback(false)
      increment()
    }
  }, [isOpen, paper, increment])

  useEffect(() => {
    const detectStandaloneMobile = () => {
      const isSmallScreen = window.matchMedia('(max-width: 767px)').matches
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
      setIsStandaloneMobile(Boolean(isSmallScreen && isStandalone))
    }

    detectStandaloneMobile()
    window.addEventListener('resize', detectStandaloneMobile)

    return () => {
      window.removeEventListener('resize', detectStandaloneMobile)
    }
  }, [])

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  useEffect(() => {
    const activeFileUrl = paper?.file_url || paper?.fileUrl
    if (!isOpen || !activeFileUrl) return
    if (isPDF(paper) && (isStandaloneMobile || forcePdfJsFallback)) {
      setIsLoading(false)
      return
    }

    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false)
        if (isPDF(paper)) {
          setForcePdfJsFallback(true)
          setError(null)
          return
        }
        setError('Inline preview is not available on this device. Use open/download below.')
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [isOpen, paper, isLoading, isStandaloneMobile, forcePdfJsFallback])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Don't render if not open
  if (!isOpen || !paper) return null

  // PDF: browser renders natively in iframe
  // DOCX: wrapped in Microsoft Office Online viewer
  const previewUrl = getPreviewUrl(paper)
  const fileUrl = paper?.file_url || paper?.fileUrl
  const isPdfFile = isPDF(paper)
  const showPdfJsViewer = Boolean(isPdfFile && (isStandaloneMobile || forcePdfJsFallback))
  const canRenderIframe = Boolean(previewUrl) && !showPdfJsViewer

  return (
    <PreviewLimitGuard>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl h-[calc(100dvh-1rem)] md:h-[90vh] bg-surface-container rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 md:px-6 py-2 border-b border-white/5">
          <PreviewCounterBanner />
        </div>
        
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-white/10 bg-surface-container-highest">
          <div className="min-w-0 flex-1 mr-4">
            <h2 
              id="modal-title" 
              className="text-lg font-semibold text-on-surface truncate"
            >
              {paper.title}
            </h2>
            <p className="text-sm text-on-surface-variant truncate">
              {paper.subject} • Semester {paper.semester} • {paper.examType} {paper.year}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Download Button */}
            <button
              onClick={() => onDownload(paper)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* PDF Viewer — uses iframe so browser's built-in PDF viewer renders the document */}
        <div className="flex-1 relative bg-surface">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container z-10">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
                <p className="text-on-surface-variant">Loading preview...</p>
              </div>
            </div>
          )}

          {/* Mobile PWA fallback for PDF */}
          {showPdfJsViewer && fileUrl && (
            <PdfJsViewer
              fileUrl={fileUrl}
              title={paper.title}
              className="h-full"
              onDownload={() => onDownload(paper)}
            />
          )}
          
          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container z-10">
              <div className="text-center max-w-md px-4">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-on-surface mb-2">{error}</p>
                <p className="text-sm text-on-surface-variant mb-4">
                  You can still download the file to view it locally.
                </p>
                <button
                  onClick={() => onDownload(paper)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download file
                </button>
              </div>
            </div>
          )}
          
          {/* Preview via iframe — PDF renders natively, DOCX uses Microsoft viewer */}
          {!error && canRenderIframe && (
            <iframe
              src={previewUrl}
              title={`Preview: ${paper.title}`}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={() => {
                setIsLoading(false)
                if (isPdfFile) {
                  setForcePdfJsFallback(true)
                  setError(null)
                  return
                }
                setError('Unable to load preview on this device.')
              }}
            />
          )}
          
          {/* Fallback for no URL */}
          {!previewUrl && !error && !showPdfJsViewer && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
              <div className="text-center px-4">
                <FileText className="w-16 h-16 text-on-surface-variant mx-auto mb-3 opacity-50" />
                <p className="text-on-surface font-medium mb-1">No file available</p>
                <p className="text-sm text-on-surface-variant mb-4">
                  No file has been uploaded for this paper.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 md:px-6 py-3 border-t border-white/10 bg-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-on-surface-variant">
            Full document preview. Download for offline access.
          </p>
          {(previewUrl || fileUrl) && (
            <a
              href={fileUrl || previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Open in new tab
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
    </PreviewLimitGuard>
  )
}

export default PDFPreviewModal
