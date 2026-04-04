import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const PREVIEW_LIMIT = 5
const STORAGE_KEY = 'preview_counter'

export function usePreviewCounter() {
  const { user } = useAuth()
  const [counter, setCounter] = useState({ count: 0, windowStart: Date.now() })

  // Load counter from localStorage on mount
  useEffect(() => {
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
    } catch {
      // Invalid storage, reset
      setCounter({ count: 0, windowStart: Date.now() })
    }
  }, [])

  // Persist counter to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counter))
    } catch {
      // Ignore storage errors
    }
  }, [counter])

  // Check if user has remaining previews
  const canPreview = useCallback(() => {
    if (user) return true // Authenticated users have unlimited access
    return counter.count < PREVIEW_LIMIT
  }, [user, counter.count])

  // Increment preview counter
  const increment = useCallback(() => {
    if (user) return // Don't count for authenticated users
    
    setCounter(prev => {
      // Check if window has expired
      if (Date.now() - prev.windowStart > 24 * 60 * 60 * 1000) {
        return { count: 1, windowStart: Date.now() }
      }
      return { ...prev, count: prev.count + 1 }
    })
  }, [user])

  // Get remaining previews
  const remaining = user ? Infinity : Math.max(0, PREVIEW_LIMIT - counter.count)

  // Calculate time until reset
  const resetInMs = Math.max(0, (counter.windowStart + 24 * 60 * 60 * 1000) - Date.now())
  const resetInHours = Math.ceil(resetInMs / (60 * 60 * 1000))

  return {
    count: counter.count,
    remaining,
    limit: PREVIEW_LIMIT,
    canPreview,
    increment,
    resetInMs,
    resetInHours,
    isAuthenticated: !!user
  }
}