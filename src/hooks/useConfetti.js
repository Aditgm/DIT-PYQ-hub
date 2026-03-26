import { useCallback, useEffect } from 'react'
import { celebrateUploadApproval, cancelConfetti, DEFAULT_OPTIONS } from '../lib/confetti'

export const useConfetti = () => {
  const celebrate = useCallback((options = {}) => {
    celebrateUploadApproval({
      ...DEFAULT_OPTIONS,
      ...options,
    })
  }, [])

  const celebrateSimple = useCallback((options = {}) => {
    return celebrateUploadApprovalSimple({
      ...DEFAULT_OPTIONS,
      ...options,
    })
  }, [])

  useEffect(() => {
    return () => {
      cancelConfetti()
    }
  }, [])

  return {
    celebrate,
    celebrateSimple,
    cancel: cancelConfetti,
  }
}

export default useConfetti