import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const PREVIEW_LIMIT = 5
const STORAGE_KEY = 'preview_counter'

export function usePreviewCounter() {
  const { user, loading: authLoading } = useAuth()
  const [counter, setCounter] = useState({ count: 0, windowStart: Date.now() })
  const [initialized, setInitialized] = useState(false)

  // Load counter from localStorage on mount
  useEffect(() => {
    if (authLoading) return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Check if window has expired (24 hours)
        if (Date.now() - parsed.windowStart > 24 * 60 * 60 * 1000) {
          // Reset counter for new window
          setCounter({ count: 0, windowStart: Date.now() })
        } else {
          setCounter(parsed)
        }
      }
      setInitialized(true)
    } catch {
      // Invalid storage, reset
      setCounter({ count: 0, windowStart: Date.now() })
      setInitialized(true)
    }
  }, [authLoading])

  // Persist counter to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counter))
    } catch {
      // Ignore storage errors
    }
  }, [counter])

  // Check if user has remaining previews - sync check
  const canPreview = useCallback(() => {
    if (user?.id) return true // Authenticated users have unlimited access
    
    // Check if window has expired
    if (Date.now() - counter.windowStart > 24 * 60 * 60 * 1000) {
      return true
    }
    
    return counter.count < PREVIEW_LIMIT
  }, [user, counter.count, counter.windowStart])

  // Increment preview counter - only if limit not reached
  const increment = useCallback(() => {
    if (user?.id || authLoading || !initialized) return // Don't count for authenticated users or during loading
    
    setCounter(prev => {
      // Check if window has expired
      if (Date.now() - prev.windowStart > 24 * 60 * 60 * 1000) {
        return { count: 1, windowStart: Date.now() }
      }
      
      // Don't increment if already at limit
      if (prev.count >= PREVIEW_LIMIT) {
        return prev
      }
      
      return { ...prev, count: prev.count + 1 }
    })
  }, [user, authLoading, initialized])

  // Get remaining previews
  const remaining = user ? Infinity : Math.max(0, PREVIEW_LIMIT - counter.count)

  // Calculate time until reset
  const resetInMs = Math.max(0, (counter.windowStart + 24 * 60 * 60 * 1000) - Date.now())
  const resetInHours = Math.ceil(resetInMs / (60 * 60 * 1000))

  // Return loading state until fully initialized
  if (authLoading || !initialized) {
    return {
      count: 0,
      remaining: PREVIEW_LIMIT,
      limit: PREVIEW_LIMIT,
      canPreview: () => true,
      increment: () => {},
      resetInMs: 0,
      resetInHours: 0,
      isAuthenticated: false,
      loading: true
    }
  }

  return {
    count: counter.count,
    remaining,
    limit: PREVIEW_LIMIT,
    canPreview,
    increment,
    resetInMs,
    resetInHours,
    isAuthenticated: !!user && !!user.id,
    loading: false
  }
}