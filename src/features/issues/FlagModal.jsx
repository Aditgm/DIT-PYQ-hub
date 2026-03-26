import React, { useState, useRef, useEffect } from 'react'
import { X, Flag, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { createIssue, ISSUE_CATEGORIES } from './issueService'
import toast from 'react-hot-toast'

/**
 * Flag modal — allows users to report an issue with a paper.
 *
 * @param {{ paperId: string, paperTitle: string, onClose: Function }} props
 */
const FlagModal = ({ paperId, paperTitle, onClose }) => {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const modalRef = useRef(null)
  const firstFieldRef = useRef(null)

  // Focus first field on open
  useEffect(() => {
    firstFieldRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024)
    if (valid.length !== files.length) {
      toast.error('Some files exceed 5MB limit')
    }
    setAttachments(prev => [...prev, ...valid].slice(0, 3))
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!category) newErrors.category = 'Please select a category'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    const result = await createIssue({
      paper_id: paperId,
      category,
      description,
      attachments,
    })
    setSubmitting(false)

    if (result.success) {
      setSubmitted(true)
      toast.success('Issue reported successfully')
    } else {
      toast.error(result.error || 'Failed to submit issue')
    }
  }

  // Success state
  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Issue reported"
      >
        <div className="glass rounded-2xl w-full max-w-md p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-on-surface mb-2">Issue Reported</h2>
          <p className="text-on-surface-variant mb-6">
            Thank you for your report. Our team will review it shortly.
          </p>
          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-modal-title"
    >
      <div ref={modalRef} className="glass rounded-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Flag className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div>
              <h2 id="flag-modal-title" className="font-display font-bold text-lg text-on-surface">
                Report an Issue
              </h2>
              {paperTitle && (
                <p className="text-sm text-on-surface-variant truncate max-w-xs">{paperTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-white/10 text-on-surface-variant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {/* Category */}
          <div>
            <label htmlFor="flag-category" className="block text-sm font-medium text-on-surface mb-2">
              Category *
            </label>
            <select
              ref={firstFieldRef}
              id="flag-category"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setErrors({}) }}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'cat-error' : undefined}
              className={`input-glass ${errors.category ? 'border-red-500/50' : ''}`}
            >
              <option value="">Select a category</option>
              {ISSUE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && (
              <p id="cat-error" role="alert" className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.category}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="flag-desc" className="block text-sm font-medium text-on-surface mb-2">
              Description (Optional)
              <span className="ml-2 text-on-surface-variant font-normal">{description.length}/500</span>
            </label>
            <textarea
              id="flag-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Describe the issue in detail..."
              className="input-glass resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Attachments (Optional, max 3 files, 5MB each)
            </label>
            <div className="space-y-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-surface-container rounded-lg">
                  <span className="text-sm text-on-surface flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-on-surface-variant">{(file.size / 1024).toFixed(0)}KB</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="p-1 hover:bg-red-500/10 rounded"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
              {attachments.length < 3 && (
                <label className="flex items-center gap-2 p-3 border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-sm text-on-surface-variant">Add attachment</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.docx"
                    onChange={handleFileAdd}
                    className="hidden"
                    multiple
                  />
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FlagModal
