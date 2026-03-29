import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Minus, Plus, Maximize2, Minimize2, StretchHorizontal } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const PDF_CACHE_NAME = 'pwa-pdf-cache-v1'

async function readPdfFromCache(fileUrl) {
  if (!('caches' in window)) return null

  try {
    const cache = await caches.open(PDF_CACHE_NAME)
    const cached = await cache.match(fileUrl)
    if (!cached || !cached.ok) return null
    return cached.arrayBuffer()
  } catch {
    return null
  }
}

async function writePdfToCache(fileUrl, response) {
  if (!('caches' in window)) return

  try {
    const cache = await caches.open(PDF_CACHE_NAME)
    await cache.put(fileUrl, response)
  } catch {
    // Cache writes are best-effort and should not block viewing.
  }
}

const PdfJsViewer = ({ fileUrl, title = 'PDF Preview', className = '', onDownload }) => {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const loadingTaskRef = useRef(null)
  const renderTaskRef = useRef(null)

  // Zoom configuration - safe defaults
  const ZOOM_MIN = 0.5    // 50% - prevents tiny rendering
  const ZOOM_DEFAULT = 1  // 100% - natural size, but may cause issues on large docs
  const ZOOM_MAX = 3      // 300% - max zoom allowed
  const ZOOM_STEP = 0.25  // 25% increments

  // Fit modes
  const [fitMode, setFitMode] = useState('width') // 'width', 'page', 'custom'

  // Calculate fit-to-width zoom based on container
  const calculateFitZoom = useCallback((pageWidth) => {
    if (!containerWidth || !pageWidth) return ZOOM_DEFAULT
    const padding = 32 // 16px padding on each side
    const availableWidth = containerWidth - padding
    return Math.min(availableWidth / pageWidth, ZOOM_MAX)
  }, [containerWidth])

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Auto-fit on container resize (not on every page change to avoid jank)
  useEffect(() => {
    // Only auto-fit if in fit mode and container has a valid width
    if (fitMode === 'width' && pdfDoc && containerWidth > 0 && pageCount > 0) {
      const adjustZoom = async () => {
        try {
          const page = await pdfDoc.getPage(currentPage)
          const originalViewport = page.getViewport({ scale: 1 })
          const newZoom = calculateFitZoom(originalViewport.width)
          // Only update if significantly different to avoid re-render loops
          if (Math.abs(newZoom - zoom) > 0.01) {
            setZoom(newZoom)
          }
        } catch {
          // Ignore errors from cancelled renders
        }
      }
      void adjustZoom()
    }
  }, [containerWidth, fitMode]) // Only trigger on container resize or mode change

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < pageCount

  const pageLabel = useMemo(() => {
    if (!pageCount) return 'Page 0 / 0'
    return `Page ${currentPage} / ${pageCount}`
  }, [currentPage, pageCount])

  const loadDocument = useCallback(async () => {
    if (!fileUrl) return

    setLoadingDoc(true)
    setError(null)
    setSource(null)

    try {
      let bytes = null
      let sourceLabel = null

      if (navigator.onLine) {
        try {
          const response = await fetch(fileUrl, { method: 'GET' })
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF (${response.status})`)
          }

          const clone = response.clone()
          bytes = await response.arrayBuffer()
          sourceLabel = 'network'

          void writePdfToCache(fileUrl, clone)
        } catch {
          bytes = await readPdfFromCache(fileUrl)
          if (bytes) {
            sourceLabel = 'cache'
          }
        }
      } else {
        bytes = await readPdfFromCache(fileUrl)
        if (bytes) {
          sourceLabel = 'cache'
        }
      }

      if (!bytes) {
        throw new Error('No cached PDF available for offline mode')
      }

      loadingTaskRef.current?.destroy()
      loadingTaskRef.current = pdfjsLib.getDocument({ data: bytes })
      const doc = await loadingTaskRef.current.promise

      setPdfDoc(doc)
      setPageCount(doc.numPages)
      setCurrentPage(1)
      setSource(sourceLabel)
      
      // Auto-fit to width on initial load
      if (containerWidth && fitMode === 'width') {
        const firstPage = await doc.getPage(1)
        const originalViewport = firstPage.getViewport({ scale: 1 })
        const fitZoom = calculateFitZoom(originalViewport.width)
        setZoom(fitZoom)
      }
    } catch (err) {
      console.error('PDF viewer load error:', err)
      setError('Could not load this PDF in-app. Please open or download the file.')
    } finally {
      setLoadingDoc(false)
    }
  }, [fileUrl])

  useEffect(() => {
    void loadDocument()

    return () => {
      loadingTaskRef.current?.destroy()
      renderTaskRef.current?.cancel()
      setPdfDoc(null)
    }
  }, [loadDocument])

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return

      setLoadingPage(true)
      setError(null)

      try {
        const page = await pdfDoc.getPage(currentPage)
        
        // For fit modes, calculate zoom based on container
        let effectiveZoom = zoom
        if (fitMode === 'width' && containerWidth) {
          const originalViewport = page.getViewport({ scale: 1 })
          effectiveZoom = calculateFitZoom(originalViewport.width)
        } else if (fitMode === 'page' && containerWidth) {
          // Fit to height (page mode)
          const originalViewport = page.getViewport({ scale: 1 })
          const padding = 32
          const availableHeight = containerRef.current.clientHeight - padding
          const availableWidth = containerWidth - padding
          const scaleX = availableWidth / originalViewport.width
          const scaleY = availableHeight / originalViewport.height
          effectiveZoom = Math.min(scaleX, scaleY, ZOOM_MAX)
        }
        
        const viewport = page.getViewport({ scale: effectiveZoom })
        const outputScale = window.devicePixelRatio || 1

        const canvas = canvasRef.current
        const context = canvas.getContext('2d', { alpha: false })

        if (!context) {
          throw new Error('Canvas rendering context unavailable')
        }

        renderTaskRef.current?.cancel()

        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport,
        })

        await renderTaskRef.current.promise
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err)
          setError('Unable to render this page. Try opening the file in a new tab.')
        }
      } finally {
        setLoadingPage(false)
      }
    }

    void renderPage()

    return () => {
      renderTaskRef.current?.cancel()
    }
  }, [pdfDoc, currentPage, zoom, containerWidth, fitMode, calculateFitZoom])

  return (
    <div className={`pdfjs-viewer ${className}`} role="group" aria-label={`${title} viewer`}>
      <div className="pdfjs-toolbar">
        <div className="pdfjs-controls" aria-label="Page controls">
          <button
            type="button"
            className="pdfjs-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!canGoPrev || loadingDoc}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="pdfjs-page-label">{pageLabel}</span>
          <button
            type="button"
            className="pdfjs-btn"
            onClick={() => setCurrentPage(prev => Math.min(pageCount, prev + 1))}
            disabled={!canGoNext || loadingDoc}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="pdfjs-controls" aria-label="Zoom controls">
          <button
            type="button"
            className={`pdfjs-btn ${fitMode === 'width' ? 'pdfjs-btn-active' : ''}`}
            onClick={() => setFitMode('width')}
            disabled={loadingDoc}
            aria-label="Fit to width"
            title="Fit to width"
          >
            <StretchHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`pdfjs-btn ${fitMode === 'page' ? 'pdfjs-btn-active' : ''}`}
            onClick={() => setFitMode('page')}
            disabled={loadingDoc}
            aria-label="Fit to page"
            title="Fit to page"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="pdfjs-btn"
            onClick={() => {
              setFitMode('custom')
              setZoom(prev => Math.max(ZOOM_MIN, Number((prev - ZOOM_STEP).toFixed(2))))
            }}
            disabled={loadingDoc || zoom <= ZOOM_MIN}
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="pdfjs-page-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="pdfjs-btn"
            onClick={() => {
              setFitMode('custom')
              setZoom(prev => Math.min(ZOOM_MAX, Number((prev + ZOOM_STEP).toFixed(2))))
            }}
            disabled={loadingDoc || zoom >= ZOOM_MAX}
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="pdfjs-meta" aria-live="polite">
          {source === 'cache' && <span className="pdfjs-badge">Offline cache</span>}
          {source === 'network' && <span className="pdfjs-badge">Online</span>}
        </div>
      </div>

      <div className="pdfjs-stage" ref={containerRef}>
        {(loadingDoc || loadingPage) && (
          <div className="pdfjs-overlay" role="status" aria-live="polite" aria-label="Loading PDF">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{loadingDoc ? 'Loading PDF...' : 'Rendering page...'}</span>
          </div>
        )}

        {!error && <canvas ref={canvasRef} className="pdfjs-canvas" aria-label={`${title} page ${currentPage}`} />}

        {error && (
          <div className="pdfjs-error" role="status" aria-live="polite" aria-label="PDF preview error">
            <p>{error}</p>
            <div className="pdfjs-error-actions">
              <button type="button" className="pdfjs-btn-primary" onClick={() => void loadDocument()}>
                Retry
              </button>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="pdfjs-btn-link">
                  Open in browser
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {onDownload && (
                <button type="button" className="pdfjs-btn-link" onClick={onDownload}>
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PdfJsViewer
