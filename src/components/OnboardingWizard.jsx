import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Check, BookOpen, GraduationCap, FileText, Loader2, Download } from 'lucide-react'
import { supabase, BRANCHES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const OnboardingWizard = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recommendedPapers, setRecommendedPapers] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const totalSteps = 3

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedBranch('')
      setSelectedSemester('')
      setRecommendedPapers([])
      setError(null)
    }
  }, [isOpen])

  // Fetch recommended papers when onboarding completes
  useEffect(() => {
    if (step === 3 && selectedBranch && selectedSemester) {
      fetchRecommendedPapers()
    }
  }, [step, selectedBranch, selectedSemester])

  const fetchRecommendedPapers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('id, title, subject, branch, semester, year, exam_type, file_url')
        .eq('status', 'approved')
        .eq('branch', selectedBranch)
        .eq('semester', parseInt(selectedSemester))
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setRecommendedPapers(data || [])
    } catch (err) {
      console.error('Error fetching papers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAndComplete = async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Update user profile with branch and semester
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          branch: selectedBranch,
          semester: parseInt(selectedSemester),
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      onClose({ branch: selectedBranch, semester: selectedSemester })
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError('Failed to save your preferences. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const canProceed = () => {
    if (step === 1) return !!selectedBranch
    if (step === 2) return !!selectedSemester
    return true
  }

  // Handle download from recommendations
  const handleDownload = async (paper) => {
    if (!user) return

    try {
      // Record download
      await supabase.from('downloads').insert({
        paper_id: paper.id,
        user_id: user.id
      })

      // Download file — open directly in browser
      if (paper.file_url) {
        window.open(paper.file_url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  if (!isOpen) return null

  // Find branch label from value
  const selectedBranchLabel = BRANCHES.find(b => b.value === selectedBranch)?.label || selectedBranch

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {}}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-0.75rem)] sm:max-h-[90vh] bg-surface-container rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-container-highest">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Welcome to DIT PYQ Hub! 🎉</h2>
            <p className="text-sm text-on-surface-variant">Let's personalize your experience</p>
          </div>
          <button
            onClick={() => onClose({ skipped: true })}
            className="p-2 rounded-lg hover:bg-white/10 text-on-surface-variant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s 
                      ? 'bg-primary text-white' 
                      : 'bg-white/10 text-on-surface-variant'
                  }`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className={`ml-2 text-xs sm:text-sm ${
                    step >= s ? 'text-on-surface' : 'text-on-surface-variant'
                  }`}>
                    {s === 1 ? 'Branch' : s === 2 ? 'Semester' : 'Discover'}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                    step > s ? 'bg-primary' : 'bg-white/10'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* Step 1: Branch Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-2">Select Your Branch</h3>
                <p className="text-on-surface-variant">Choose your engineering branch to get relevant papers</p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {BRANCHES.map((branch) => (
                  <button
                    key={branch.value}
                    onClick={() => setSelectedBranch(branch.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedBranch === branch.value
                        ? 'border-primary bg-primary/10 text-on-surface'
                        : 'border-white/10 hover:border-primary/30 text-on-surface-variant hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedBranch === branch.value 
                          ? 'bg-primary text-white' 
                          : 'bg-white/10'
                      }`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{branch.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Semester Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-2">Select Your Semester</h3>
                <p className="text-on-surface-variant">Which semester are you currently in?</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem.toString())}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      selectedSemester === sem.toString()
                        ? 'border-secondary bg-secondary/10 text-on-surface'
                        : 'border-white/10 hover:border-secondary/30 text-on-surface-variant hover:bg-white/5'
                    }`}
                  >
                    <div className="text-2xl font-bold mb-1">{sem}</div>
                    <div className="text-xs">Sem</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-surface-container-low border border-white/5">
                <p className="text-sm text-on-surface-variant">
                  📚 <strong>Tip:</strong> You'll see papers for <span className="text-primary font-medium">{selectedBranchLabel}</span> in <span className="text-secondary font-medium">Semester {selectedSemester}</span>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Recommendations */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-tertiary/20 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-tertiary" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-2">Your Personalized Feed</h3>
                <p className="text-on-surface-variant">Here are papers matching your selection</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : recommendedPapers.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                  {recommendedPapers.map((paper) => (
                    <div 
                      key={paper.id}
                      className="p-4 rounded-xl bg-surface-container border border-white/5 hover:border-tertiary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-on-surface truncate">{paper.title}</h4>
                          <p className="text-sm text-on-surface-variant truncate">{paper.subject}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-xs">
                              {paper.exam_type}
                            </span>
                            <span className="text-xs text-on-surface-variant">{paper.year}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(paper)}
                          className="p-2 rounded-lg bg-tertiary/20 text-tertiary hover:bg-tertiary/30 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
                  <p className="text-on-surface-variant">No papers available for this selection yet</p>
                  <p className="text-sm text-on-surface-variant mt-1">Be the first to contribute!</p>
                </div>
              )}

              <div className="mt-4 p-4 rounded-xl bg-tertiary/10 border border-tertiary/20">
                <p className="text-sm text-on-surface">
                  ✨ <strong>That's it!</strong> Your preferences have been saved. You'll always see relevant papers first.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-surface-container-highest flex items-center justify-between pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-4">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === 1 
                ? 'text-on-surface-variant opacity-50 cursor-not-allowed' 
                : 'text-on-surface hover:bg-white/10'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                canProceed()
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-white/10 text-on-surface-variant cursor-not-allowed'
              }`}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSaveAndComplete}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-tertiary text-white font-medium hover:bg-tertiary/90 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
