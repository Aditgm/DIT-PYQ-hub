import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export const useOnboarding = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingData, setOnboardingData] = useState(null)

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || authLoading) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('branch, semester, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (error) throw error

        // Show onboarding if not completed or no branch selected
        if (!data?.onboarding_completed || !data?.branch) {
          setShowOnboarding(true)
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err)
      }
    }

    checkOnboarding()
  }, [user, authLoading])

  const handleOnboardingClose = (data) => {
    setShowOnboarding(false)
    setOnboardingData(data)
    // Optionally navigate to browse with filters
    if (data?.branch && data?.semester) {
      navigate(`/browse?branch=${data.branch}&semester=${data.semester}`)
    }
  }

  return {
    showOnboarding,
    onboardingData,
    handleOnboardingClose,
  }
}
