import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  FileText, Download, Calendar, BookOpen, GraduationCap,
  User, Clock, AlertCircle, Loader2, ExternalLink, Copy, Check
} from 'lucide-react'
import { supabase, BRANCHES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getPreviewUrl, isPDF } from '../lib/fileType'
import { initiateDownload, buildDownloadFileUrl } from '../api/papers'
import { usePreviewCounter } from '../hooks/usePreviewCounter'
import PreviewLimitGuard, { PreviewCounterBanner } from '../components/PreviewLimitGuard'
import toast from 'react-hot-toast'
import { usePageTitle } from '../hooks/usePageTitle'
import FlagButton from '../features/issues/FlagButton'
import ShareButton from '../components/ShareButton'
import PdfJsViewer from '../components/PdfJsViewer'

const PaperDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [paper, setPaper] = useState(null)
  const [downloadCount, setDownloadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [citationCopied, setCitationCopied] = useState(false)
  const [isStandaloneMobile, setIsStandaloneMobile] = useState(false)
  const [forcePdfJsFallback, setForcePdfJsFallback] = useState(false)
  const { tryPreview } = usePreviewCounter()

  // Atomic check and increment on page load
  useEffect(() => {
    if (paper && !loading) {
      tryPreview(`paper-detail:${paper.id}`)
    }
  }, [paper, loading, tryPreview])

  usePageTitle(paper?.title || 'Paper Details', paper ? `View details, download, and cite: ${paper.title}` : 'View paper details and download options.')

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

  useEffect(() => {
    setForcePdfJsFallback(false)
  }, [paper?.id])

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('papers')
          .select(`
            *,
            profiles:uploaded_by (
              full_name, email
            )
          `)
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        if (!data) throw new Error('Paper not found')
        if (data.status !== 'approved' && data.uploaded_by !== user?.id) {
          throw new Error('This paper is not available')
        }

        setPaper(data)

        const { count } = await supabase
          .from('downloads')
          .select('*', { count: 'exact', head: true })
          .eq('paper_id', id)

        setDownloadCount(count || 0)
      } catch (err) {
        console.error('Error fetching paper:', err)
        setError(err.message || 'Failed to load paper')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchPaper()
  }, [id, user])

  // Subscribe to Realtime for this specific paper
  // If the paper is deleted by admin while user is viewing it, show error immediately
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`paper-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'papers',
          filter: `id=eq.${id}`
        },
        () => {
          setError('This paper has been removed.')
          setPaper(null)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'papers',
          filter: `id=eq.${id}`
        },
        (payload) => {
          if (payload.new.status !== 'approved') {
            setError('This paper is no longer available.')
            setPaper(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const formatNextAvailableTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const handleDownload = async () => {
    if (!user) {
      toast('Please sign in to download papers')
      return
    }

    try {
      setDownloading(true)

      const { data: { session } } = await supabase.auth.getSession()
      let authToken = session?.access_token

      if (!authToken) {
        toast.error('Authentication required. Please sign in again.')
        return
      }

      let downloadData
      try {
        downloadData = await initiateDownload(paper.id, authToken)
      } catch (initErr) {
        if (initErr?.status === 401) {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }))
          const refreshedToken = refreshedSession?.access_token
          if (!refreshedToken) {
            throw initErr
          }

          authToken = refreshedToken
          downloadData = await initiateDownload(paper.id, authToken)
        } else {
          throw initErr
        }
      }

      setDownloadCount(prev => prev + 1)
      toast.success('Preparing download...')

      if (downloadData.token) {
        // Build URL client-side so it goes through the Vercel proxy
        const downloadFileUrl = buildDownloadFileUrl(downloadData.token)

        const fetchWithToken = (token) => {
          if (!token) return fetch(downloadFileUrl)
          return fetch(downloadFileUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Authorization': `Bearer ${token}`,
            },
          })
        }

        let fileResponse = await fetchWithToken(authToken)

        if (fileResponse.status === 401) {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }))
          const refreshedToken = refreshedSession?.access_token

          if (refreshedToken && refreshedToken !== authToken) {
            authToken = refreshedToken
            fileResponse = await fetchWithToken(authToken)
          }

          if (fileResponse.status === 401) {
            // Compatibility fallback for backends that authorize purely by download token.
            fileResponse = await fetchWithToken(null)
          }
        }

        if (!fileResponse.ok) {
          const fileError = await fileResponse.json().catch(() => ({ error: 'Download file failed' }))
          const error = new Error(fileError.error || 'Failed to download file')
          error.status = fileResponse.status
          throw error
        }

        const blob = await fileResponse.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = downloadData.filename || 'document.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }
    } catch (err) {
      console.error('Download error:', err)
      if (err.nextAvailableTime) {
        const retryTime = formatNextAvailableTime(err.nextAvailableTime)
        toast.error(
          `Download credits exhausted. You can retry after ${retryTime}.`,
          { duration: 5000 }
        )
      } else {
        toast.error(err.message || 'Download failed. Please try again.')
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyCitation = () => {
    if (!citationText) return
    navigator.clipboard.writeText(citationText)
    setCitationCopied(true)
    toast.success('Citation copied!')
    setTimeout(() => setCitationCopied(false), 2000)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const getSemesterString = (semester) => {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
    return numerals[semester - 1] || semester
  }

  const branch = paper ? BRANCHES.find(b => b.value === paper.branch) : null

  const citationText = paper
    ? `${paper.profiles?.full_name || 'Anonymous'}. "${paper.title}." ${branch?.label || paper.branch}, ${paper.year}. DIT PYQ Hub.`
    : ''

  const activePreviewUrl = getPreviewUrl(paper)
  const isPdfFile = isPDF(paper)
  const shouldUsePdfJsViewer = Boolean(isPdfFile && (isStandaloneMobile || forcePdfJsFallback))

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-on-surface-variant">Loading paper...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-semibold text-on-surface">Paper Not Found</h2>
          <p className="text-on-surface-variant">{error}</p>
          <Link to="/browse" className="btn-primary">Browse Papers</Link>
        </div>
      </div>
    )
  }

  return (
    <PreviewLimitGuard>
      <div className="min-h-screen bg-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Preview */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl overflow-hidden border border-white/5">
              <div className="aspect-[3/4] bg-surface-container relative">
                {paper.file_url ? (
                  shouldUsePdfJsViewer ? (
                    <PdfJsViewer
                      fileUrl={paper.file_url}
                      title={paper.title}
                      className="h-full"
                      onDownload={handleDownload}
                    />
                  ) : (
                    <iframe
                      src={activePreviewUrl}
                      className="w-full h-full"
                      title="Document Preview"
                      onError={() => {
                        if (isPdfFile) {
                          setForcePdfJsFallback(true)
                        }
                      }}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-on-surface-variant opacity-50" />
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Paper Details Sidebar */}
            <div className="space-y-6">
              <PreviewCounterBanner />
              
              {/* Title & Actions */}
            <div className="glass rounded-xl p-6 border border-white/5">
              <h1 className="text-2xl font-display font-bold text-on-surface mb-4">
                {paper.title}
              </h1>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={downloading || !paper.file_url}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    {downloading ? 'Downloading...' : 'Download'}
                  </button>
                  
                  <ShareButton
                    title={paper.title}
                    url={window.location.href}
                    source="paper_detail_preview"
                    size="large"
                    onShareSuccess={() => toast.success('Link copied!')}
                  />
                </div>

                <button
                  onClick={handleCopyLink}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>

                <FlagButton paperId={paper.id} paperTitle={paper.title} />
              </div>

              <div className="flex items-center gap-2 mt-4 text-sm text-on-surface-variant">
                <Download className="w-4 h-4" />
                <span>{downloadCount} downloads</span>
              </div>
            </div>

            {/* Metadata */}
            <div className="glass rounded-xl p-6 border border-white/5 space-y-4">
              <h2 className="font-semibold text-on-surface">Paper Details</h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Subject</p>
                    <p className="text-sm text-on-surface">{paper.subject}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-secondary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Branch</p>
                    <p className="text-sm text-on-surface">{branch?.label || paper.branch}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-tertiary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Year</p>
                    <p className="text-sm text-on-surface">{paper.year}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Semester</p>
                    <p className="text-sm text-on-surface">Semester {getSemesterString(paper.semester)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Uploaded by</p>
                    <p className="text-sm text-on-surface">{paper.profiles?.full_name || 'Anonymous'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
                  <div>
                    <p className="text-xs text-on-surface-variant">Uploaded</p>
                    <p className="text-sm text-on-surface">{formatDate(paper.created_at)}</p>
                  </div>
                </div>
              </div>

              {paper.description && (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-xs text-on-surface-variant mb-1">Description</p>
                  <p className="text-sm text-on-surface">{paper.description}</p>
                </div>
              )}
            </div>

            {/* Citation */}
            <div className="glass rounded-xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-on-surface">Cite This Paper</h2>
                <button
                  onClick={handleCopyCitation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors"
                  aria-label="Copy citation"
                >
                  {citationCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-surface-container rounded-lg p-3 text-sm text-on-surface-variant font-mono break-words">
                {citationText}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PreviewLimitGuard>
  )
}

export default PaperDetail
