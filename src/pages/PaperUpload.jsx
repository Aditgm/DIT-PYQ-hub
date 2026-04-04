import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Upload, FileText, X, CheckCircle, AlertCircle, 
  BookOpen, GraduationCap
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { usePageTitle } from '../hooks/usePageTitle'
import { supabase, BRANCHES, SEMESTERS, YEARS, DEGREES } from '../lib/supabase'
import { uploadToCloudinary } from '../lib/cloudinary'
import { getMimeTypeFromFile } from '../lib/fileType'
import { isPaperFile } from '../lib/fileDetection'
import { celebratePaperUpload } from '../lib/confetti'
import { formatBytes } from '../lib/utils'
import Breadcrumb from '../components/Breadcrumb'
import { uploadSchema, validateFile } from '../lib/uploadSchema'
import ConfettiToggle from '../components/ConfettiToggle'

const subjects = [
  'Data Structures & Algorithms',
  'Database Management Systems',
  'Computer Networks',
  'Operating Systems',
  'Software Engineering',
  'Artificial Intelligence',
  'Machine Learning',
  'Web Technologies',
  'Deep Learning',
  'Advanced Java Programming',
  'Principles of Management',
  'Other'
]

const examTypes = ['Mid Term', 'End Term', 'Supplementary', 'Quiz']

/**
 * Renders an inline error message with ARIA attributes.
 */
const FieldError = ({ error, id }) => {
  if (!error) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-400 flex items-center gap-1">
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {error.message}
    </p>
  )
}

const PaperUpload = () => {
  const { user } = useAuth()
  usePageTitle('Upload Paper', 'Share previous year question papers with the DIT University community.')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef(null)
  const firstErrorRef = useRef(null)

  // ── React Hook Form setup ──────────────────────────────────────
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isValid, isSubmitted },
    reset,
    watch,
    setFocus,
  } = useForm({
    resolver: zodResolver(uploadSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      subject: searchParams.get('subject') || '',
      customSubject: '',
      branch: searchParams.get('branch') || '',
      semester: searchParams.get('semester') || '',
      examType: '',
      year: new Date().getFullYear(),
      description: '',
    },
  })

  const selectedSubject = watch('subject')

  // ── File state (managed separately — RHF can't handle File objects) ─
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pdfThumbnail, setPdfThumbnail] = useState(null)

  // ── File validation ────────────────────────────────────────────
  const validateAndSetFile = useCallback((selectedFile) => {
    const error = validateFile(selectedFile)
    if (error) {
      setFileError(error)
      setFile(null)
      toast.error(error)
      return false
    }
    setFile(selectedFile)
    setFileError(null)
    return true
  }, [])

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }, [validateAndSetFile])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    for (const droppedFile of droppedFiles) {
      if (validateAndSetFile(droppedFile)) return
    }
    if (droppedFiles.length > 0 && !fileError) {
      toast.error('No valid PDF or DOCX files found.')
    }
  }, [validateAndSetFile, fileError])

  const removeFile = useCallback(() => {
    setFile(null)
    setPdfThumbnail(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ── PDF thumbnail generation ───────────────────────────────────
  useEffect(() => {
    if (!file) { setPdfThumbnail(null); return }
    let cancelled = false
    let pdfInstance = null
    const generate = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js'
            s.onload = resolve
            s.onerror = reject
            document.head.appendChild(s)
          })
        }
        if (cancelled) return
        const pdfjsLib = window.pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
        pdfInstance = pdf
        if (cancelled) {
          pdf.destroy()
          return
        }
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport })
        await renderTask.promise
        if (!cancelled) setPdfThumbnail(canvas.toDataURL('image/jpeg', 0.8))
        // Cleanup render task and page resources
        if (renderTask.cancel) renderTask.cancel()
        if (page.cleanup) page.cleanup()
        if (pdf.destroy) pdf.destroy()
        pdfInstance = null
      } catch { if (!cancelled) setPdfThumbnail(null) }
    }
    generate()
    return () => {
      cancelled = true
      if (pdfInstance?.destroy) pdfInstance.destroy()
    }
  }, [file])

  // ── Focus first error on submit ────────────────────────────────
  useEffect(() => {
    if (isSubmitted && Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0]
      setFocus(firstKey)
    }
  }, [isSubmitted, errors, setFocus])

  // ── Submit handler ─────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (!file) {
      setFileError('Please upload a PDF or DOCX file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus(null)

    try {
      const { url: fileUrl, publicId } = await uploadToCloudinary(
        file,
        (progress) => setUploadProgress(Math.round(progress * 0.8))
      )
      setUploadProgress(80)

      const subjectToSubmit = data.subject === 'Other' ? data.customSubject.trim() : data.subject
      const { error: dbError } = await supabase
        .from('papers')
        .insert({
          title: data.title,
          subject: subjectToSubmit,
          branch: data.branch,
          semester: parseInt(data.semester),
          exam_type: data.examType,
          year: data.year,
          description: data.description,
          file_url: fileUrl,
          file_type: getMimeTypeFromFile(file),
          file_size: file.size,
          cloudinary_public_id: publicId,
          uploaded_by: user.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (dbError) throw new Error(`Database error: ${dbError.message}`)

      setUploadProgress(100)
      setUploadStatus('success')
      
      // Reset form immediately for psychological closure
      reset()
      removeFile()
      setUploadProgress(0)
      
      toast.success('Paper uploaded!')
      
      if (isPaperFile(file)) {
        celebratePaperUpload()
      }

      setTimeout(() => {
        setUploadStatus(null)
      }, 2000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      setFileError(error.message || 'Upload failed')
      toast.error(error.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Please sign in to upload papers</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    )
  }

  const errorKeys = Object.keys(errors)
  const hasFieldErrors = errorKeys.length > 0 || !!fileError

  return (
    <div className="min-h-screen bg-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-8">
        <Breadcrumb items={[{ label: 'Upload Paper', to: '/upload' }]} />
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">Upload Paper</h1>
          <p className="text-on-surface-variant">Share previous year question papers with the DIT community</p>
        </div>

        {/* Success banner */}
        {uploadStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3" role="status">
            <CheckCircle className="w-6 h-6 text-green-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-green-400">Upload Successful!</p>
              <p className="text-sm text-green-400/70">Your paper has been submitted for review</p>
            </div>
          </div>
        )}

        {/* Error summary — shown when multiple errors exist after submit */}
        {isSubmitted && hasFieldErrors && (
          <div
            role="alert"
            aria-label="Form errors"
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <p className="font-semibold text-red-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              Please fix the following errors:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-400/90">
              {fileError && <li>{fileError}</li>}
              {errorKeys.map((key) => (
                <li key={key}>{errors[key].message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ARIA-live region for screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isSubmitted && hasFieldErrors && `${errorKeys.length + (fileError ? 1 : 0)} error(s) found. Please fix them before submitting.`}
        </div>

        <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* ── File Upload ──────────────────────────────────────── */}
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <h2 id="upload-heading" className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" aria-hidden="true" />
              Upload Document
            </h2>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-labelledby="upload-heading upload-instructions"
                aria-invalid={!!fileError}
                aria-describedby={fileError ? 'file-error' : undefined}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all outline-none focus:ring-2 focus:ring-primary/50
                  ${fileError ? 'border-red-500/50 bg-red-500/5' :
                    isDragging ? 'border-primary bg-primary/10 scale-[1.02]' :
                    'border-white/10 hover:border-primary/50 hover:bg-primary/5'}`}
              >
                <FileText className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary' : fileError ? 'text-red-400' : 'text-on-surface-variant'}`} />
                <p className="text-on-surface font-medium mb-1">
                  {isDragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                </p>
                <p id="upload-instructions" className="text-sm text-on-surface-variant">PDF or DOCX • Maximum 25MB</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-surface-container rounded-xl border border-primary/20">
                {pdfThumbnail ? (
                  <img src={pdfThumbnail} alt="PDF preview" className="w-16 h-20 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-20 rounded-lg bg-surface flex items-center justify-center border border-white/10 flex-shrink-0">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                   <p className="font-medium text-on-surface truncate">{file.name}</p>
                   <p className="text-sm text-on-surface-variant">{formatBytes(file.size)}</p>
                </div>
                <button type="button" onClick={removeFile} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0" aria-label="Remove file">
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
            )}

            {fileError && <FieldError error={{ message: fileError }} id="file-error" />}

            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-on-surface-variant">Uploading...</span>
                  <span className="text-primary">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/5">
              <ConfettiToggle />
            </div>
          </div>

          {/* ── Paper Details ────────────────────────────────────── */}
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-secondary" aria-hidden="true" />
              Paper Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-on-surface mb-2">
                  Paper Title *
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., Data Structures - End Term 2023"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                  className={`input-glass ${errors.title ? 'border-red-500/50 focus:border-red-500' : ''}`}
                  {...register('title')}
                />
                <FieldError error={errors.title} id="title-error" />
              </div>

               {/* Subject */}
               <div>
                 <label htmlFor="subject" className="block text-sm font-medium text-on-surface mb-2">
                   Subject *
                 </label>
                 <select
                   id="subject"
                   aria-invalid={!!errors.subject}
                   aria-describedby={errors.subject ? 'subject-error' : undefined}
                   className={`input-glass ${errors.subject ? 'border-red-500/50' : ''}`}
                   {...register('subject')}
                 >
                   <option value="">Select Subject</option>
                   {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                 </select>
                 {selectedSubject === 'Other' && (
                   <input
                     type="text"
                     placeholder="Please specify your subject..."
                     aria-invalid={!!errors.customSubject}
                     aria-describedby={errors.customSubject ? 'customSubject-error' : undefined}
                     className={`input-glass mt-2 ${errors.customSubject ? 'border-red-500/50' : ''}`}
                     {...register('customSubject')}
                   />
                 )}
                 <FieldError error={errors.subject || errors.customSubject} id="subject-error" />
               </div>

               {/* Degree */}
               <div>
                 <label htmlFor="degree" className="block text-sm font-medium text-on-surface mb-2">
                   Degree *
                 </label>
                 <select
                   id="degree"
                   aria-invalid={!!errors.degree}
                   aria-describedby={errors.degree ? 'degree-error' : undefined}
                   className={`input-glass ${errors.degree ? 'border-red-500/50' : ''}`}
                   {...register('degree')}
                 >
                   <option value="">Select Degree</option>
                   {DEGREES.map(deg => <option key={deg.value} value={deg.value}>{deg.label}</option>)}
                 </select>
                 <FieldError error={errors.degree} id="degree-error" />
               </div>

              {/* Branch */}
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-on-surface mb-2">
                  Branch *
                </label>
                <select
                  id="branch"
                  aria-invalid={!!errors.branch}
                  aria-describedby={errors.branch ? 'branch-error' : undefined}
                  className={`input-glass ${errors.branch ? 'border-red-500/50' : ''}`}
                  {...register('branch')}
                >
                  <option value="">Select Branch</option>
                  {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
                <FieldError error={errors.branch} id="branch-error" />
              </div>

              {/* Semester */}
              <div>
                <label htmlFor="semester" className="block text-sm font-medium text-on-surface mb-2">
                  Semester *
                </label>
                <select
                  id="semester"
                  aria-invalid={!!errors.semester}
                  aria-describedby={errors.semester ? 'semester-error' : undefined}
                  className={`input-glass ${errors.semester ? 'border-red-500/50' : ''}`}
                  {...register('semester')}
                >
                  <option value="">Select Semester</option>
                  {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <FieldError error={errors.semester} id="semester-error" />
              </div>

              {/* Exam Type */}
              <div>
                <label htmlFor="examType" className="block text-sm font-medium text-on-surface mb-2">
                  Exam Type *
                </label>
                <select
                  id="examType"
                  aria-invalid={!!errors.examType}
                  aria-describedby={errors.examType ? 'examType-error' : undefined}
                  className={`input-glass ${errors.examType ? 'border-red-500/50' : ''}`}
                  {...register('examType')}
                >
                  <option value="">Select Exam Type</option>
                  {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <FieldError error={errors.examType} id="examType-error" />
              </div>

              {/* Year */}
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-on-surface mb-2">
                  Year
                </label>
                <select
                  id="year"
                  className="input-glass"
                  {...register('year', { valueAsNumber: true })}
                >
                  {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-on-surface mb-2">
                  Description (Optional)
                  {watch('description')?.length > 0 && (
                    <span className="ml-2 text-on-surface-variant font-normal">
                      {watch('description').length}/1000
                    </span>
                  )}
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Add any additional notes about this paper..."
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'description-error' : undefined}
                  className={`input-glass resize-none ${errors.description ? 'border-red-500/50' : ''}`}
                  {...register('description')}
                />
                <FieldError error={errors.description} id="description-error" />
              </div>
            </div>
          </div>

          {/* ── Submit ───────────────────────────────────────────── */}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Submit Paper'}
            </button>
          </div>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default PaperUpload
