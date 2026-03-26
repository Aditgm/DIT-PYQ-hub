import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, USER_ROLES } from '../lib/supabase'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Memoized session check - only fetch once on mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // Get session from Supabase (handles persistence internally)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session) {
          setUser(session.user)
          fetchProfile(session.user.id, false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      if (session) {
        setUser(session.user)
        fetchProfile(session.user.id, true)
      } else {
        setUser(null)
        setProfile(null)
        setIsAdmin(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Optimized profile fetch with caching
  const fetchProfile = async (userId, setLoadingFlag = true) => {
    if (setLoadingFlag) setProfileLoading(true)
    
    try {
      // Check memory cache first
      if (profile?.id === userId) {
        return profile
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setProfile(data)
        setIsAdmin(data.role === USER_ROLES.ADMIN)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      if (setLoadingFlag) setProfileLoading(false)
    }
  }

  // Email/Password Sign Up - Optimized
  const signUp = useCallback(async (email, password, fullName = '') => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student'
          }
        }
      })
      
      if (error) throw error
      
      // Pre-fetch profile after signup
      if (data.user) {
        fetchProfile(data.user.id)
      }
      
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // Email/Password Sign In - Optimized
  const signIn = useCallback(async (email, password) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // Google OAuth - Optimized
  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // GitHub OAuth - Optimized
  const signInWithGitHub = useCallback(async () => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // Sign Out - Optimized
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear all cached data
      setUser(null)
      setProfile(null)
      setIsAdmin(false)
      
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // Reset Password
  const resetPassword = useCallback(async (email) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  // Update Profile
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { success: false, error: 'Not authenticated' }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setProfile(data)
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [user])

  // Memoized value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    profile,
    isAdmin,
    loading,
    profileLoading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    resetPassword,
    updateProfile,
    clearError: () => setError(null),
    refreshProfile: () => user ? fetchProfile(user.id, true) : Promise.resolve()
  }), [user, profile, isAdmin, loading, error, signUp, signIn, signInWithGoogle, signInWithGitHub, signOut, resetPassword, updateProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
