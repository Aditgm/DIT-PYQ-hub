import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'

const AuthCallback = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  usePageTitle('Authenticating...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get session from URL hash (Supabase OAuth uses hash)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session) {
          // Success - redirect to role selection / welcome page
          setTimeout(() => {
            navigate('/select-role')
          }, 1000)
        } else {
          // No session - redirect to login
          navigate('/login')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant">Completing authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Authentication Error</h2>
          <p className="text-on-surface-variant mb-6">{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary inline-block">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback
