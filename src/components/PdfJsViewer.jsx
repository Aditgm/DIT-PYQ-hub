import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Minus, Plus } from 'lucide-react'
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

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const loadingTaskRef = useRef(null)
  const renderTaskRef = useRef(null)

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
        const viewport = page.getViewport({ scale: zoom })
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
  }, [pdfDoc, currentPage, zoom])

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
            className="pdfjs-btn"
            onClick={() => setZoom(prev => Math.max(0.75, Number((prev - 0.1).toFixed(2))))}
            disabled={loadingDoc}
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="pdfjs-page-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="pdfjs-btn"
            onClick={() => setZoom(prev => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
            disabled={loadingDoc}
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
