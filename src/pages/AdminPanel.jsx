import React, { useState, useEffect, useRef } from 'react'
import { 
  FileText, CheckCircle, XCircle, Clock, Search, 
  Filter, Download, Eye, Trash2, ChevronLeft, ChevronRight,
  BarChart3, List, Grid, RefreshCw, LogOut, User, Building, BookOpen, Calendar,
  MoreVertical, Flag
} from 'lucide-react'
import { supabase, PAPER_STATUS, BRANCHES, SEMESTERS, YEARS } from '../lib/supabase'
import { sanitizeSearchQuery } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { deletePaper, PaperServiceError } from '../lib/paperService'
import { getPreviewUrl, isDocxUrl } from '../lib/fileType'
import toast from 'react-hot-toast'
import { usePageTitle } from '../hooks/usePageTitle'
import ConfirmDialog from '../components/ConfirmDialog'
import IssuesQueue from '../features/issues/IssuesQueue'
import { celebrateUploadApproval } from '../lib/confetti'
import PaperMetadataEditor from '../components/PaperMetadataEditor'
import PaperVersionHistory from '../components/PaperVersionHistory'

// Statistics Card Component
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="surface-card rounded-xl p-6 border border-white/10">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-on-surface-variant text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-on-surface">{value}</p>
        {trend && (
          <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
)

// Submission Card Component
const SubmissionCard = ({ paper, onView, onEdit, onApprove, onReject, onDelete, isAdmin, isDeleting }) => {
  const branch = BRANCHES.find(b => b.value === paper.branch)
  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <div className="surface-card rounded-xl p-5 border border-white/10 hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-on-surface truncate">{paper.title}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0 ${
                isDocxUrl(paper.file_url) ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {isDocxUrl(paper.file_url) ? 'DOCX' : 'PDF'}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant truncate">{branch?.label || paper.branch}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${statusColors[paper.status]}`}>
          {paper.status.charAt(0).toUpperCase() + paper.status.slice(1)}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-sm">
        <div>
          <p className="text-on-surface-variant">Subject</p>
          <p className="text-on-surface font-medium truncate">{paper.subject}</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Sem.</p>
          <p className="text-on-surface font-medium">{paper.semester}</p>
        </div>
        <div>
          <p className="text-on-surface-variant">Year</p>
          <p className="text-on-surface font-medium">{paper.year}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{paper.profiles?.full_name || paper.profiles?.email || 'Unknown'}</span>
        </div>
        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
            <button 
              onClick={() => onView(paper)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-on-surface-variant" />
            </button>
            <button 
              onClick={() => onEdit(paper)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              title="Edit Metadata"
            >
              <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {paper.status === PAPER_STATUS.PENDING && (
              <>
                <button 
                  onClick={() => onApprove(paper)}
                  className="p-2 rounded-lg hover:bg-green-500/20 transition-colors"
                  title="Approve"
                >
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </button>
                <button 
                  onClick={() => onReject(paper)}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  title="Reject"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                </button>
              </>
            )}
            {isAdmin && (
              <button 
                onClick={() => onDelete(paper)}
                disabled={isDeleting}
                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete"
                aria-label={`Delete paper: ${paper.title}`}
                aria-busy={isDeleting}
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 text-red-400 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-red-400" />
                )}
              </button>
            )}
        </div>
        {/* Mobile actions */}
        <button 
          onClick={() => onView(paper)}
          className="sm:hidden p-2 rounded-lg hover:bg-surface-container-high transition-colors"
          title="View Details"
        >
          <Eye className="w-5 h-5 text-on-surface-variant" />
        </button>
      </div>
    </div>
  )
}

// Submission Detail Modal
const SubmissionDetail = ({ paper, onClose, onApprove, onReject, onDelete, isAdmin, isDeleting }) => {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [editedTitle, setEditedTitle] = useState('')

  useEffect(() => {
    if (paper?.title) {
      setEditedTitle(paper.title)
    }
  }, [paper])

  if (!paper) return null

  const branch = BRANCHES.find(b => b.value === paper.branch)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="surface-modal rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <h2 className="font-display font-bold text-lg sm:text-xl text-on-surface truncate mr-2">Submission Details</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <XCircle className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Preview */}
            <div>
              <h3 className="font-semibold text-on-surface mb-3">Document Preview</h3>
              <div className="surface-card rounded-xl overflow-hidden bg-surface-container-low border border-white/10 aspect-[3/4] relative">
                {pdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
                {paper.file_url ? (
                  <iframe 
                    src={getPreviewUrl(paper)}
                    className="w-full h-full"
                    title="Document Preview"
                    onLoad={() => setPdfLoading(false)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
                    No preview available
                  </div>
                )}
              </div>
              {paper.file_url && (
                <button 
                  onClick={() => window.open(paper.file_url, '_blank', 'noopener,noreferrer')}
                  className="mt-3 flex items-center justify-center gap-2 text-primary hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Download Original
                </button>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-on-surface mb-1">Title</h3>
                {paper.status === PAPER_STATUS.PENDING ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Edit file name before approval"
                      className="input-glass"
                    />
                    <p className="text-xs text-on-surface-variant">
                      This title will be visible to students after approval.
                    </p>
                  </div>
                ) : (
                  <p className="text-on-surface-variant">{paper.title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-on-surface mb-1">Branch</h3>
                  <p className="text-on-surface-variant">{branch?.label || paper.branch}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface mb-1">Semester</h3>
                  <p className="text-on-surface-variant">Semester {paper.semester}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-on-surface mb-1">Subject</h3>
                  <p className="text-on-surface-variant">{paper.subject}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface mb-1">Year</h3>
                  <p className="text-on-surface-variant">{paper.year}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-on-surface mb-1">Description</h3>
                <p className="text-on-surface-variant">{paper.description || 'No description provided'}</p>
              </div>

              {/* Uploader Info */}
              <div className="surface-card rounded-xl p-4 mt-4 border border-white/10">
                <h3 className="font-semibold text-on-surface mb-3">Uploader Information</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-on-surface-variant">
                    <span className="text-on-surface">Name:</span>{' '}
                    {paper.profiles?.full_name || 'Not provided'}
                  </p>
                  <p className="text-on-surface-variant">
                    <span className="text-on-surface">Email:</span>{' '}
                    {paper.profiles?.email || 'Not provided'}
                  </p>
                  <p className="text-on-surface-variant">
                    <span className="text-on-surface">Submitted:</span>{' '}
                    {new Date(paper.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Rejection History */}
              {paper.rejection_reason && (
                <div className="surface-card rounded-xl p-4 border border-white/10 border-l-4 border-l-red-500">
                  <h3 className="font-semibold text-red-400 mb-2">Rejection Reason</h3>
                  <p className="text-on-surface-variant text-sm">{paper.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {paper.status === PAPER_STATUS.PENDING && (
              <>
                {showRejectForm ? (
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        Rejection Reason (Required)
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this submission is being rejected..."
                        className="w-full px-4 py-3 bg-surface-container rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface resize-none h-24"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (rejectReason.trim()) {
                            onReject(paper.id, rejectReason)
                          }
                        }}
                        disabled={!rejectReason.trim()}
                        className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="px-4 py-2 text-on-surface-variant hover:text-on-surface"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onApprove(paper.id, editedTitle.trim())}
                      disabled={!editedTitle.trim()}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve & Publish
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </>
                )}
              </>
            )}
            {isAdmin && (
              <button
                onClick={() => onDelete(paper)}
                disabled={isDeleting}
                className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Delete paper: ${paper.title}`}
                aria-busy={isDeleting}
              >
                {isDeleting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Confirm Delete Dialog
const ConfirmDeleteDialog = ({ paper, onConfirm, onCancel, isDeleting }) => {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  if (!paper) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="surface-modal rounded-2xl w-full max-w-md p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <h2 id="delete-dialog-title" className="font-display font-bold text-lg text-on-surface">Delete Paper</h2>
        </div>
        <p className="text-on-surface-variant mb-2">
          Are you sure you want to permanently delete this paper?
        </p>
        <p className="text-sm text-on-surface font-medium mb-6 truncate">
          "{paper.title}"
        </p>
        <p className="text-xs text-red-400 mb-6">
          This action cannot be undone. The paper file and all associated download records will be removed.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onConfirm(paper.id)}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-3 text-on-surface-variant hover:text-on-surface rounded-xl border border-white/10 hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Admin Panel
const AdminPanel = () => {
  const { user, signOut, isAdmin, loading: authLoading } = useAuth()
  usePageTitle('Admin Panel', 'Manage paper submissions, approve or reject uploads, and view analytics.')
  const [papers, setPapers] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    branch: '',
    semester: '',
    year: ''
  })
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [editingPaper, setEditingPaper] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, paper: null })
  const [pagination, setPagination] = useState({ page: 1, limit: 10 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState(null)

  // Fetch papers
  useEffect(() => {
    fetchPapers()
  }, [activeTab, searchQuery, filters, pagination.page, refreshKey])

  // Fetch stats
  useEffect(() => {
    fetchStats()
  }, [refreshKey])

  const fetchPapers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('papers')
        .select(`
          *,
          profiles!papers_uploaded_by_fkey(
            full_name,
            email
          )
        `, { count: 'exact' })

      // Apply status filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`title.ilike.%${sanitizeSearchQuery(searchQuery)}%,subject.ilike.%${sanitizeSearchQuery(searchQuery)}%`)
      }

      // Apply filters
      if (filters.branch) {
        query = query.eq('branch', filters.branch)
      }
      if (filters.semester) {
        query = query.eq('semester', parseInt(filters.semester))
      }
      if (filters.year) {
        query = query.eq('year', parseInt(filters.year))
      }

      // Order by date
      query = query.order('created_at', { ascending: false })

      // Pagination
      const from = (pagination.page - 1) * pagination.limit
      query = query.range(from, from + pagination.limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      setPapers(data || [])
    } catch (error) {
      console.error('Error fetching papers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [{ count: total }, { count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
        supabase.from('papers').select('*', { count: 'exact', head: true }),
        supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', PAPER_STATUS.PENDING),
        supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', PAPER_STATUS.APPROVED),
        supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', PAPER_STATUS.REJECTED)
      ])

      setStats({ total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0 })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleApprove = async (paperId, nextTitle) => {
    try {
      const cleanTitle = (nextTitle || '').trim()
      const { error } = await supabase
        .from('papers')
        .update({ 
          ...(cleanTitle ? { title: cleanTitle } : {}),
          status: PAPER_STATUS.APPROVED,
          approved_at: new Date().toISOString()
        })
        .eq('id', paperId)

      if (error) throw error

      toast.success('Approved!')
      celebrateUploadApproval()
      setRefreshKey(k => k + 1)
      setSelectedPaper(null)
    } catch (error) {
      console.error('Error approving paper:', error)
      toast.error('Failed to approve paper. Please try again.')
    }
  }

  const handleReject = async (paperId, reason) => {
    try {
      const { error } = await supabase
        .from('papers')
        .update({ 
          status: PAPER_STATUS.REJECTED,
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', paperId)

      if (error) throw error

      toast('Paper rejected')
      setRefreshKey(k => k + 1)
      setSelectedPaper(null)
    } catch (error) {
      console.error('Error rejecting paper:', error)
      toast.error('Failed to reject paper. Please try again.')
    }
  }

  const handleDelete = async (paperId) => {
    if (deletingId) return // prevent duplicate requests

    setDeletingId(paperId)
    try {
      const result = await deletePaper(paperId)

      // Invalidate homepage subject cache so user-facing side reflects deletion
      sessionStorage.removeItem('homepage_popular_subjects')

      toast.success('Paper deleted')
      setSelectedPaper(null)
      setRefreshKey(k => k + 1)
    } catch (error) {
      console.error('Error deleting paper:', error)

      const messages = {
        [PaperServiceError.NOT_FOUND]: 'Paper not found. It may have already been deleted.',
        [PaperServiceError.FORBIDDEN]: 'You do not have permission to delete papers.',
        [PaperServiceError.BAD_REQUEST]: 'Invalid paper ID.',
      }

      toast.error(messages[error.code] || 'Failed to delete paper. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditMetadata = (paper) => {
    setEditingPaper(paper)
  }

  const handleEditSuccess = (message) => {
    toast.success(message)
    setRefreshKey(k => k + 1)
  }

  // Confirm dialog actions
  const openConfirmApprove = (paper) => {
    setConfirmDialog({ open: true, type: 'approve', paper })
  }
  const openConfirmReject = (paper) => {
    setSelectedPaper(paper) // open detail modal for reject reason
  }
  const openConfirmDelete = (paper) => {
    setConfirmDialog({ open: true, type: 'delete', paper })
  }

  const handleConfirmAction = () => {
    const { type, paper } = confirmDialog
    setConfirmDialog({ open: false, type: null, paper: null })

    if (type === 'approve') {
      handleApprove(paper.id)
    } else if (type === 'delete') {
      handleDelete(paper.id)
    }
  }

  const getDialogConfig = () => {
    const { type, paper } = confirmDialog
    if (type === 'approve') {
      return {
        title: 'Approve Paper',
        message: `Are you sure you want to approve "${paper?.title}"? It will be published and visible to all students.`,
        confirmText: 'Approve & Publish',
        cancelText: 'Cancel',
        variant: 'info',
      }
    }
    if (type === 'delete') {
      return {
        title: 'Delete Paper',
        message: `Are you sure you want to permanently delete "${paper?.title}"? This action cannot be undone. The paper file and all associated download records will be removed.`,
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel',
        variant: 'danger',
      }
    }
    return {}
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const tabs = [
    { id: 'pending', label: 'Pending', count: stats.pending, icon: Clock },
    { id: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle },
    { id: 'issues', label: 'Issues', count: null, icon: Flag },
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base">
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">Admin Panel</h1>
          <p className="text-on-surface-variant">DIT PYQ Hub Management</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Submissions" 
            value={stats.total} 
            icon={FileText} 
            color="bg-primary/20 text-primary"
          />
          <StatCard 
            title="Pending Review" 
            value={stats.pending} 
            icon={Clock} 
            color="bg-yellow-500/20 text-yellow-400"
          />
          <StatCard 
            title="Approved" 
            value={stats.approved} 
            icon={CheckCircle} 
            color="bg-green-500/20 text-green-400"
          />
          <StatCard 
            title="Rejected" 
            value={stats.rejected} 
            icon={XCircle} 
            color="bg-red-500/20 text-red-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 mb-6 border-b border-white/10 overflow-x-auto scrollbar-hide -mx-6 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setPagination(p => ({ ...p, page: 1 }))
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-container-high text-on-surface-variant">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'issues' ? (
          <IssuesQueue />
        ) : (
          <>
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 mb-6">
          <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPagination(p => ({ ...p, page: 1 }))
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface"
            />
          </div>

          <select
            value={filters.branch}
            onChange={(e) => {
              setFilters(f => ({ ...f, branch: e.target.value }))
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className="px-4 py-2.5 bg-surface-container rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface w-full sm:w-auto"
          >
            <option value="">All Branches</option>
            {BRANCHES.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>

          <select
            value={filters.semester}
            onChange={(e) => {
              setFilters(f => ({ ...f, semester: e.target.value }))
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className="px-4 py-2.5 bg-surface-container rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface w-full sm:w-auto"
          >
            <option value="">All Semesters</option>
            {SEMESTERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) => {
              setFilters(f => ({ ...f, year: e.target.value }))
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className="px-4 py-2.5 bg-surface-container rounded-xl border border-white/10 focus:border-primary/50 focus:outline-none text-on-surface w-full sm:w-auto"
          >
            <option value="">All Years</option>
            {YEARS.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2.5 rounded-xl bg-surface-container border border-white/10 hover:bg-surface-container-high transition-colors w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-on-surface-variant" />
            <span className="sm:hidden text-sm text-on-surface-variant">Refresh</span>
          </button>
        </div>

        {/* Papers List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : papers.length === 0 ? (
          <div className="surface-card rounded-xl p-12 text-center border border-white/10">
            <FileText className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
            <h3 className="font-semibold text-on-surface mb-2">No Submissions Found</h3>
            <p className="text-on-surface-variant">
              {searchQuery || filters.branch || filters.semester || filters.year
                ? 'Try adjusting your filters'
                : 'No papers in this category yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map(paper => (
              <SubmissionCard
                key={paper.id}
                paper={paper}
                onView={setSelectedPaper}
                onEdit={handleEditMetadata}
                onApprove={openConfirmApprove}
                onReject={openConfirmReject}
                onDelete={openConfirmDelete}
                isAdmin={isAdmin}
                isDeleting={deletingId === paper.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {papers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-on-surface-variant">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, stats.total)} of {stats.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg bg-surface-container border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-on-surface" />
              </button>
              <span className="px-4 py-2 text-on-surface-variant text-sm">
                Page {pagination.page}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={papers.length < pagination.limit}
                className="p-2 rounded-lg bg-surface-container border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-on-surface" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedPaper && (
        <SubmissionDetail
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={openConfirmDelete}
          isAdmin={isAdmin}
          isDeleting={deletingId === selectedPaper.id}
        />
      )}

      {/* Metadata Edit Modal */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <PaperMetadataEditor
            paper={editingPaper}
            mode="post_upload"
            onClose={() => setEditingPaper(null)}
            onSuccess={handleEditSuccess}
          />
        </div>
      )}

      {/* Confirm Dialog - Delete */}
      {confirmDialog.open && confirmDialog.type === 'delete' && (
        <ConfirmDeleteDialog
          paper={confirmDialog.paper}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmDialog({ open: false, type: null, paper: null })}
          isDeleting={!!deletingId}
        />
      )}

      {/* Confirm Dialog - Approve */}
      {confirmDialog.open && confirmDialog.type === 'approve' && (
        <ConfirmDialog
          isOpen={confirmDialog.open}
          onClose={() => setConfirmDialog({ open: false, type: null, paper: null })}
          onConfirm={handleConfirmAction}
          {...getDialogConfig()}
        />
      )}
    </div>
  )
}

export default AdminPanel
