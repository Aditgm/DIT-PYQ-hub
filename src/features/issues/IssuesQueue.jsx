import React, { useState, useEffect, useCallback } from 'react'
import {
  Flag, Filter, ChevronDown, ChevronUp, MessageSquare,
  User, Clock, AlertTriangle, CheckCircle, RefreshCw,
  ArrowUpCircle, Loader2, XCircle, Send
} from 'lucide-react'
import {
  fetchIssues, fetchIssue, updateIssueStatus, assignIssue,
  addIssueComment, updateIssuePriority,
  ISSUE_CATEGORIES, ISSUE_STATUSES, ISSUE_PRIORITIES
} from '../issues/issueService'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const priorityColors = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}

const statusColors = {
  new: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-green-500/20 text-green-400',
  reopened: 'bg-orange-500/20 text-orange-400',
}

const statusIcons = {
  new: Clock,
  in_progress: RefreshCw,
  resolved: CheckCircle,
  reopened: ArrowUpCircle,
}

const categoryLabels = Object.fromEntries(ISSUE_CATEGORIES.map(c => [c.value, c.label]))

/** Issue detail drawer */
const IssueDetail = ({ issue, onClose, onRefresh }) => {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [admins, setAdmins] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').eq('role', 'admin')
      .then(({ data }) => { if (data) setAdmins(data) })
  }, [])

  const handleStatusChange = async (status) => {
    setLoading(true)
    const result = await updateIssueStatus(issue.id, status, comment || null)
    setLoading(false)
    if (result.success) {
      toast.success(`Status changed to ${status}`)
      setComment('')
      onRefresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleAssign = async (adminId) => {
    setLoading(true)
    const result = await assignIssue(issue.id, adminId || null)
    setLoading(false)
    if (result.success) {
      toast.success('Issue assigned')
      onRefresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setLoading(true)
    const result = await addIssueComment(issue.id, comment.trim())
    setLoading(false)
    if (result.success) {
      toast.success('Comment added')
      setComment('')
      onRefresh()
    } else {
      toast.error(result.error)
    }
  }

  const handlePriority = async (priority) => {
    setLoading(true)
    const result = await updateIssuePriority(issue.id, priority)
    setLoading(false)
    if (result.success) {
      toast.success('Priority updated')
      onRefresh()
    } else {
      toast.error(result.error)
    }
  }

  const formatDate = (d) => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="glass rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[issue.status]}`}>
                {issue.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[issue.priority]}`}>
                {issue.priority}
              </span>
            </div>
            <h3 className="font-semibold text-on-surface">{categoryLabels[issue.category] || issue.category}</h3>
            <p className="text-sm text-on-surface-variant">
              Reported by {issue.reporter?.full_name || 'Unknown'} • {formatDate(issue.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded" aria-label="Close detail">
            <XCircle className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {issue.description && (
          <div className="bg-surface-container rounded-lg p-3 mt-3">
            <p className="text-sm text-on-surface">{issue.description}</p>
          </div>
        )}

        {issue.paper && (
          <div className="mt-3 text-sm text-on-surface-variant">
            Paper: <span className="text-on-surface font-medium">{issue.paper.title}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-5 border-b border-white/5 space-y-3">
        {/* Assign */}
        <div>
          <label className="text-xs text-on-surface-variant mb-1 block">Assign to</label>
          <select
            value={issue.assigned_admin_id || ''}
            onChange={(e) => handleAssign(e.target.value)}
            disabled={loading}
            className="input-glass text-sm"
          >
            <option value="">Unassigned</option>
            {admins.map(a => (
              <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs text-on-surface-variant mb-1 block">Priority</label>
          <div className="flex gap-2">
            {ISSUE_PRIORITIES.map(p => (
              <button
                key={p}
                onClick={() => handlePriority(p)}
                disabled={loading}
                className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                  issue.priority === p
                    ? `${priorityColors[p]} border-current`
                    : 'border-white/10 text-on-surface-variant hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status actions */}
        <div>
          <label className="text-xs text-on-surface-variant mb-1 block">Status</label>
          <div className="flex gap-2 flex-wrap">
            {issue.status !== 'in_progress' && (
              <button onClick={() => handleStatusChange('in_progress')} disabled={loading}
                className="px-3 py-1.5 text-xs rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
                Mark In Progress
              </button>
            )}
            {issue.status !== 'resolved' && (
              <button onClick={() => handleStatusChange('resolved')} disabled={loading}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                Resolve
              </button>
            )}
            {issue.status === 'resolved' && (
              <button onClick={() => handleStatusChange('reopened')} disabled={loading}
                className="px-3 py-1.5 text-xs rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-xs text-on-surface-variant mb-1 block">Add comment</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Type a comment..."
              className="input-glass flex-1 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleComment() }}
            />
            <button
              onClick={handleComment}
              disabled={loading || !comment.trim()}
              className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50"
              aria-label="Send comment"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="p-5">
        <h4 className="text-sm font-semibold text-on-surface mb-3">Activity</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {(issue.activity || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((entry) => (
            <div key={entry.id} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-on-surface">
                  <span className="font-medium">{entry.actor?.full_name || 'System'}</span>
                  {' '}{entry.action.replace(/_/g, ' ')}
                  {entry.details?.comment && (
                    <span className="text-on-surface-variant"> — "{entry.details.comment}"</span>
                  )}
                </p>
                <p className="text-xs text-on-surface-variant">{formatDate(entry.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Main issues queue */
const IssuesQueue = () => {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', category: 'all', priority: 'all' })
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const loadIssues = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await fetchIssues({
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
      page,
    })
    setLoading(false)
    if (error) {
      toast.error('Failed to load issues')
      return
    }
    setIssues(data || [])
    setTotalCount(count || 0)
  }, [filters, page])

  useEffect(() => { loadIssues() }, [loadIssues])

  const openDetail = async (issueId) => {
    const { data, error } = await fetchIssue(issueId)
    if (!error && data) setSelectedIssue(data)
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-on-surface flex items-center gap-2">
          <Flag className="w-5 h-5 text-yellow-400" />
          Issues ({totalCount})
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }} className="input-glass text-sm">
          <option value="all">All Statuses</option>
          {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1) }} className="input-glass text-sm">
          <option value="all">All Categories</option>
          {ISSUE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1) }} className="input-glass text-sm">
          <option value="all">All Priorities</option>
          {ISSUE_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={loadIssues} className="p-2 rounded-lg hover:bg-white/10 text-on-surface-variant" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue list */}
        <div className="space-y-3">
          {loading && issues.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-on-surface-variant">Loading issues...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
              <p className="text-on-surface-variant">No issues found</p>
            </div>
          ) : (
            issues.map(issue => {
              const StatusIcon = statusIcons[issue.status] || Clock
              return (
                <button
                  key={issue.id}
                  onClick={() => openDetail(issue.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedIssue?.id === issue.id
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-white/5 hover:border-white/10 bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4 text-on-surface-variant" />
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[issue.status]}`}>
                        {issue.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[issue.priority]}`}>
                        {issue.priority}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant">{formatDate(issue.created_at)}</span>
                  </div>
                  <p className="font-medium text-on-surface text-sm mb-1">
                    {categoryLabels[issue.category] || issue.category}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {issue.reporter?.full_name || 'Unknown'}
                    {issue.paper && ` • ${issue.paper.title}`}
                  </p>
                  {issue.assigned_admin_id && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Assigned: {issue.assignee?.full_name || 'Admin'}
                    </p>
                  )}
                </button>
              )
            })
          )}

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= totalCount}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Issue detail */}
        {selectedIssue ? (
          <IssueDetail
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
            onRefresh={() => openDetail(selectedIssue.id)}
          />
        ) : (
          <div className="glass rounded-xl border border-white/5 flex items-center justify-center h-64">
            <p className="text-on-surface-variant">Select an issue to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default IssuesQueue
