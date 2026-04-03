import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { 
  Search, Filter, Download, FileText,
  ChevronLeft, ChevronRight, ChevronUp, BookOpen,
  Calendar, GraduationCap, SortAsc, SortDesc, Loader2, Eye, Star, TrendingUp,
  Link2, Check
} from 'lucide-react'
import { supabase, BRANCHES, SEMESTERS, YEARS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getFileExtension } from '../lib/fileType'
import { useBrowsePapers } from '../lib/queries'
import { initiateDownload, buildDownloadFileUrl } from '../api/papers'
import toast from 'react-hot-toast'
import { usePageTitle } from '../hooks/usePageTitle'
import SearchAutocomplete from '../components/SearchAutocomplete'
import TiltCard from '../components/TiltCard'
import PDFPreviewModal from '../components/PDFPreviewModal'
import PDFThumbnail from '../components/PDFThumbnail'
import Breadcrumb from '../components/Breadcrumb'
import ShareButton from '../components/ShareButton'
import EmptyState from '../components/EmptyState/EmptyState'

const PaperBrowse = () => {
  usePageTitle('Browse Papers', 'Search and filter previous year question papers by subject, branch, semester, and year.')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()


  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  
  // Get subject from URL query parameter
  const subjectParam = searchParams.get('subject') || ''
  const pageParam = parseInt(searchParams.get('page')) || 1
  const pageSizeParam = parseInt(searchParams.get('pageSize')) || 20
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    subject: subjectParam,
    branch: '',
    semester: '',
    year: '',
    examType: ''
  })
  const [sortBy, setSortBy] = useState('downloads')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(pageParam)
  const [itemsPerPage, setItemsPerPage] = useState(pageSizeParam)
  const [showFilters, setShowFilters] = useState(false)
  const [previewPaper, setPreviewPaper] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const browseParams = useMemo(() => ({
    currentPage,
    itemsPerPage,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
  }), [currentPage, itemsPerPage, searchQuery, filters, sortBy, sortOrder])

  const { data: browseData, isLoading: browseLoading, error: browseError } = useBrowsePapers(browseParams)

  const papers = browseData?.papers || []
  const subjects = browseData?.subjects || []
  const totalCount = browseData?.totalCount || 0
  const downloadCounts = browseData?.downloadCounts || {}

  useEffect(() => {
    setLoading(browseLoading)
  }, [browseLoading])

  useEffect(() => {
    if (browseError) {
      console.error('Error fetching papers:', browseError)
    }
  }, [browseError])
  
  // Copy share link to clipboard
  const handleCopyLink = (paperId) => {
    const url = `${window.location.origin}/paper/${paperId}`
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(paperId)
        toast.success('Link copied!')
        setTimeout(() => setCopiedId(null), 2000)
      }).catch(() => fallbackCopy(url, paperId))
    } else {
      fallbackCopy(url, paperId)
    }
  }

  const fallbackCopy = (text, paperId) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      setCopiedId(paperId)
      toast.success('Link copied!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      toast.error('Failed to copy link')
    }
    document.body.removeChild(textarea)
  }
  
  // Recommendation states
  const [userProfile, setUserProfile] = useState(null)
  const [recommendedPapers, setRecommendedPapers] = useState([])
  const [popularPapers, setPopularPapers] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  
  // Back to top scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // Update URL when page or pageSize changes
  const updatePageInUrl = useCallback((page, pageSize) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (page > 1) {
        next.set('page', page.toString())
      } else {
        next.delete('page')
      }
      if (pageSize !== 20) {
        next.set('pageSize', pageSize.toString())
      } else {
        next.delete('pageSize')
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const handlePageChange = (page) => {
    setCurrentPage(page)
    updatePageInUrl(page, itemsPerPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageSizeChange = (size) => {
    setItemsPerPage(size)
    setCurrentPage(1)
    updatePageInUrl(1, size)
  }
  
  const branches = BRANCHES
  const semesters = SEMESTERS
  const years = YEARS
  const examTypes = ['Mid Term', 'End Term', 'Supplementary']
  
  // Handle autocomplete selection
  const handleSearchSelect = (selection) => {
    if (selection.type === 'subject') {
      setFilters(prev => ({ ...prev, subject: selection.value }))
      setSearchQuery(selection.value)
      setCurrentPage(1)
    } else if (selection.type === 'paper') {
      setSearchQuery(selection.title)
      setCurrentPage(1)
    }
  }
  
  // Fetch user profile and recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setRecommendationsLoading(true)
      
      try {
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('branch, semester')
            .eq('id', user.id)
            .single()
          
          if (profileData?.branch) {
            setUserProfile(profileData)
            
            let query = supabase
              .from('papers')
              .select('id, title, subject, branch, semester, year, exam_type, file_url, created_at')
              .eq('status', 'approved')
              .eq('branch', profileData.branch)
            
            if (profileData.semester) {
              query = query.eq('semester', parseInt(profileData.semester))
            }
            
            const { data: recPapers } = await query
              .order('created_at', { ascending: false })
              .limit(4)
            
            setRecommendedPapers(recPapers || [])
          }
        }
        
        // Always fetch popular/trending papers
        const { data: popPapers } = await supabase
          .from('papers')
          .select('id, title, subject, branch, semester, year, exam_type, file_url, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(4)
        
        setPopularPapers(popPapers || [])
        
      } catch (err) {
        console.error('Error fetching recommendations:', err)
      } finally {
        setRecommendationsLoading(false)
      }
    }
    
    fetchRecommendations()
  }, [user])
  
  // Subscribe to Supabase Realtime for live paper deletions
  // This ensures the browse page reflects admin deletions without manual refresh
  useEffect(() => {
    const channel = supabase
      .channel('papers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'papers' },
        () => {
          // Refresh all browse query variants from cache key prefix.
          queryClient.invalidateQueries({ queryKey: ['browsePapers'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
  
  const formatNextAvailableTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Track download
  const handleDownload = async (paper) => {
    if (!user) {
      navigate('/login')
      return
    }
    
    try {
      setDownloadingId(paper.id)

      const { data: { session } } = await supabase.auth.getSession()
      let authToken = session?.access_token

      if (!authToken) {
        toast.error('Please sign in again')
        navigate('/login')
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
      
      // Update React Query cache globally so it persists even if you leave the page
      queryClient.setQueriesData({ queryKey: ['browsePapers'] }, (oldData) => {
        if (!oldData || !oldData.downloadCounts) return oldData;
        return {
          ...oldData,
          downloadCounts: {
            ...oldData.downloadCounts,
            [paper.id]: (oldData.downloadCounts[paper.id] || 0) + 1
          }
        };
      });
      
      toast.success('Preparing download...')
      
      if (downloadData.token) {
        // Build the download URL client-side so it goes through the Vercel
        // rewrite proxy. The server-provided downloadUrl may point to its own
        // raw IP which isn't reachable from the browser in production.
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
        toast.error(err.message || 'Download failed')
      }
    } finally {
      setDownloadingId(null)
    }
  }
  
  // Server-side paginated papers (already filtered and sorted)
  // For "downloads" sort, apply secondary client-side re-sort on current page
  const paginatedPapers = sortBy === 'downloads'
    ? [...papers].sort((a, b) => {
        const aVal = downloadCounts[a.id] || 0
        const bVal = downloadCounts[b.id] || 0
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      })
    : papers
  
  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }
  
  const clearFilters = () => {
    setFilters({
      subject: '',
      branch: '',
      semester: '',
      year: '',
      examType: ''
    })
    setSearchQuery('')
    setCurrentPage(1)
  }
  
  const getSortIcon = (column) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
  }

  const getFileTypeMeta = (paper) => {
    const extension = getFileExtension(paper)

    if (extension === '.docx') {
      return {
        label: 'DOCX',
        classes: 'bg-blue-500/20 text-blue-400'
      }
    }

    if (extension === '.doc') {
      return {
        label: 'DOC',
        classes: 'bg-amber-500/20 text-amber-300'
      }
    }

    return {
      label: 'PDF',
      classes: 'bg-red-500/20 text-red-400'
    }
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Page Header */}
      <div className="bg-surface border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-6">
          <Breadcrumb items={[{ label: 'Browse Papers', to: '/browse' }]} />
          <div className="flex items-center gap-4 mb-6">
            <h1 className="font-display font-bold text-2xl text-on-surface">Browse Papers</h1>
          </div>
          
          {/* Search Bar with Autocomplete */}
          <div className="relative mb-4">
            <SearchAutocomplete
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value)
                setCurrentPage(1)
              }}
              onSelect={handleSearchSelect}
              placeholder="Search papers by title, subject, or branch..."
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${Object.values(filters).some(Boolean) ? 'bg-primary/10 border-primary/30 text-primary' : 'border-white/10 text-on-surface-variant hover:bg-white/5'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values(filters).some(v => v) && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-xs text-white">
                {Object.values(filters).filter(v => v).length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-surface-container border-b border-white/5 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Subject</label>
                <select
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                  className="w-full px-4 py-2 bg-surface rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Branch</label>
                <select
                  value={filters.branch}
                  onChange={(e) => handleFilterChange('branch', e.target.value)}
                  className="w-full px-4 py-2 bg-surface rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.value} value={branch.value}>{branch.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Semester</label>
                <select
                  value={filters.semester}
                  onChange={(e) => handleFilterChange('semester', e.target.value)}
                  className="w-full px-4 py-2 bg-surface rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(sem => (
                    <option key={sem.value} value={sem.value}>{sem.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full px-4 py-2 bg-surface rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface"
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year.value} value={year.value}>{year.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Exam Type</label>
                <select
                  value={filters.examType}
                  onChange={(e) => handleFilterChange('examType', e.target.value)}
                  className="w-full px-4 py-2 bg-surface rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface"
                >
                  <option value="">All Types</option>
                  {examTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {Object.values(filters).some(v => v) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <p className="text-on-surface-variant">
              Showing {paginatedPapers.length} of {totalCount} papers
            </p>
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="bg-surface-container border border-white/10 rounded-lg px-2 py-1 text-on-surface focus:outline-none focus:border-primary/50"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant text-sm">Sort by:</span>
            <button
              onClick={() => {
                setSortBy('downloads')
                setSortOrder(sortOrder === 'asc' && sortBy === 'downloads' ? 'desc' : 'asc')
              }}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                sortBy === 'downloads' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-white/5'
              }`}
            >
              Downloads {getSortIcon('downloads')}
            </button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading ? (
          <div>
            <div className="h-7 w-32 skeleton rounded mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="rounded-2xl p-6 border border-white/10 bg-surface-container shadow-card">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-5 w-3/4 skeleton rounded mb-2" />
                      <div className="h-4 w-1/2 skeleton rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 w-16 skeleton rounded" />
                    <div className="h-5 w-20 skeleton rounded" />
                    <div className="h-5 w-12 skeleton rounded" />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="h-4 w-16 skeleton rounded" />
                    <div className="flex gap-2">
                      <div className="h-8 w-20 skeleton rounded-lg" />
                      <div className="h-8 w-24 skeleton rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Section Title */}
            <h2 className="text-2xl font-bold text-on-surface mb-6">
              {searchQuery || filters.subject ? 'Search Results' : 'All Papers'}
            </h2>
            
            {paginatedPapers.length > 0 ? (
              <>
                {/* Papers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedPapers.map(paper => (
                    <TiltCard 
                      key={paper.id}
                      className="rounded-2xl p-6 group border border-white/10 bg-surface-container shadow-card hover:-translate-y-1 transition-all duration-300"
                      tiltIntensity={0.8}
                    >
                      {(() => {
                        const fileType = getFileTypeMeta(paper)
                        return (
                          <div className="flex justify-end mb-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${fileType.classes}`}>
                              {fileType.label}
                            </span>
                          </div>
                        )
                      })()}
                      <div className="flex items-start gap-4 mb-4">
                        <PDFThumbnail paper={paper} size="default" className="flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                            {paper.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant truncate">
                            {paper.subject}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-xs">
                          {paper.examType}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-xs">
                          Semester {paper.semester}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-xs">
                          {paper.year}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            {downloadCounts[paper.id] || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(paper.id) }}
                            className="text-on-surface-variant hover:text-primary text-sm font-medium transition-colors flex items-center gap-1"
                            aria-label="Copy share link"
                            title="Copy share link"
                          >
                            {copiedId === paper.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Link2 className="w-4 h-4" />
                            )}
                          </button>
                          <ShareButton
                            title={paper.title}
                            url={`${window.location.origin}/paper/${paper.id}`}
                            source="browse_card"
                            size="small"
                            onShareSuccess={() => toast.success('Link copied!')}
                          />
                          <button 
                            onClick={() => setPreviewPaper(paper)}
                            className="text-tertiary hover:text-tertiary/80 text-sm font-medium transition-colors flex items-center gap-1"
                            title="Preview paper"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                          <button 
                            onClick={() => handleDownload(paper)}
                            disabled={downloadingId === paper.id}
                            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {downloadingId === paper.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Download
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-white/10 text-on-surface-variant 
                        hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || page === totalPages || 
                          Math.abs(page - currentPage) <= 1
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-on-surface-variant">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`w-10 h-10 rounded-lg transition-colors ${
                              currentPage === page 
                                ? 'bg-primary text-white' 
                                : 'border border-white/10 text-on-surface-variant hover:bg-white/5'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-white/10 text-on-surface-variant 
                        hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                searchQuery={searchQuery}
                onUpload={() => navigate(`/upload?subject=${encodeURIComponent(filters.subject || searchQuery)}&branch=${encodeURIComponent(filters.branch)}&semester=${encodeURIComponent(filters.semester)}`)}
                onClearFilters={clearFilters}
              />
            )}
            
            {/* Recommendations Section - Below Main Content */}
            {!searchQuery && !filters.subject && !filters.branch && !filters.semester && (
              <div className="mt-16 pt-8 border-t border-white/5">
                {recommendationsLoading ? (
                  <div className="space-y-6">
                    <div className="h-8 w-48 bg-surface-container rounded animate-pulse"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-surface-container-low rounded-xl h-48 animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ) : (user && recommendedPapers.length > 0) ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Star className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-2xl font-bold text-on-surface">Recommended for you</h2>
                      <span className="text-sm text-on-surface-variant">
                        Based on your branch ({userProfile?.branch}) and semester ({userProfile?.semester})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {recommendedPapers.map((paper) => (
                        <TiltCard key={paper.id} className="bg-surface-container rounded-xl p-5 cursor-pointer hover:translate-y-[-4px] transition-transform duration-300">
                          {(() => {
                            const fileType = getFileTypeMeta(paper)
                            return (
                              <div className="flex justify-end mb-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0 ${fileType.classes}`}>
                                  {fileType.label}
                                </span>
                              </div>
                            )
                          })()}
                          <div 
                            onClick={() => setPreviewPaper(paper)}
                            className="space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="px-2 py-1 text-xs font-medium rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {paper.subject}
                              </span>
                              <PDFThumbnail paper={paper} size="small" className="flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-on-surface line-clamp-2">{paper.title}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
                              <span>{paper.branch}</span>
                              <span>•</span>
                              <span>Sem {paper.semester}</span>
                              <span>•</span>
                              <span>{paper.year}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs text-on-surface-variant">{paper.exam_type}</span>
                              <Download 
                                className="w-4 h-4 text-cyan-400 hover:text-cyan-300 transition-colors" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload({
                                    id: paper.id,
                                    fileUrl: paper.file_url,
                                    title: paper.title
                                  })
                                }}
                              />
                            </div>
                          </div>
                        </TiltCard>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                      <h2 className="text-2xl font-bold text-on-surface">Trending Papers</h2>
                      <span className="text-sm text-on-surface-variant">
                        Recent uploads from the community
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {popularPapers.map((paper) => (
                        <TiltCard key={paper.id} className="bg-surface-container rounded-xl p-5 cursor-pointer hover:translate-y-[-4px] transition-transform duration-300">
                          {(() => {
                            const fileType = getFileTypeMeta(paper)
                            return (
                              <div className="flex justify-end mb-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0 ${fileType.classes}`}>
                                  {fileType.label}
                                </span>
                              </div>
                            )
                          })()}
                          <div 
                            onClick={() => setPreviewPaper(paper)}
                            className="space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="px-2 py-1 text-xs font-medium rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {paper.subject}
                              </span>
                              <PDFThumbnail paper={paper} size="small" className="flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-on-surface line-clamp-2">{paper.title}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
                              <span>{paper.branch}</span>
                              <span>•</span>
                              <span>Sem {paper.semester}</span>
                              <span>•</span>
                              <span>{paper.year}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs text-on-surface-variant">{paper.exam_type}</span>
                              <Download 
                                className="w-4 h-4 text-purple-400 hover:text-purple-300 transition-colors" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload({
                                    id: paper.id,
                                    fileUrl: paper.file_url,
                                    title: paper.title
                                  })
                                }}
                              />
                            </div>
                          </div>
                        </TiltCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={!!previewPaper}
        onClose={() => setPreviewPaper(null)}
        paper={previewPaper}
        onDownload={handleDownload}
      />

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll back to top"
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center
          bg-surface-container border border-white/10 text-on-surface-variant
          hover:bg-white/10 hover:text-on-surface transition-all duration-300 shadow-lg
          ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </div>
  )
}

export default PaperBrowse
