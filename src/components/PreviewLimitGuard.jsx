import React, { useState } from 'react'
import { usePreviewCounter } from '../hooks/usePreviewCounter'
import { useAuth } from '../context/AuthContext'
import { Lock } from 'lucide-react'

const PreviewLimitGuard = ({ children }) => {
  const { canPreview, remaining, limit, resetInHours, isAuthenticated } = usePreviewCounter()
  const { user } = useAuth()
  const [showLimitModal, setShowLimitModal] = useState(false)

  // Authenticated users have full access
  if (isAuthenticated) {
    return children
  }

  // User has remaining previews
  if (canPreview()) {
    return children
  }

  // Limit reached - show modal
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => setShowLimitModal(true)}
      >
        <div className="bg-surface-container rounded-xl p-6 max-w-md w-full border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-on-surface-variant" />
            <h3 className="text-lg font-semibold text-on-surface">Preview limit reached</h3>
          </div>
          
          <p className="text-on-surface-variant mb-4">
            You have viewed all {limit} available free previews.
          </p>

          <p className="text-sm text-on-surface-variant mb-6">
            Limit resets in {resetInHours} hour{resetInHours !== 1 ? 's' : ''}.
          </p>

          <div className="flex flex-col gap-3">
            <a 
              href="/login" 
              className="btn-primary text-center"
            >
              Sign in for unlimited access
            </a>
            <a 
              href="/select-role" 
              className="btn-secondary text-center"
            >
              Create free account
            </a>
          </div>
        </div>
      </div>
      {children}
    </>
  )
}

export const PreviewCounterBanner = () => {
  const { remaining, limit, isAuthenticated } = usePreviewCounter()

  if (isAuthenticated) return null

  return (
    <div className="bg-surface-container border border-white/10 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface-variant">
          {remaining} preview{remaining !== 1 ? 's' : ''} remaining today
        </span>
        <div className="flex gap-1">
          {[...Array(limit)].map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full ${i < remaining ? 'bg-primary' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PreviewLimitGuard