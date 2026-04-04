import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const PREVIEW_LIMIT = 5
const STORAGE_KEY = 'preview_counter'
const DEDUPE_STORAGE_KEY = 'preview_counter_recent_views'
const PREVIEW_WINDOW_MS = 24 * 60 * 60 * 1000
const DEDUPE_WINDOW_MS = 5 * 1000

const createFreshCounter = () => ({
  count: 0,
  windowStart: Date.now()
})

const normalizeCounter = (value) => {
  if (!value || typeof value !== 'object') {
    return createFreshCounter()
  }

  const count = Number.isFinite(value.count) ? value.count : 0
  const windowStart = Number.isFinite(value.windowStart) ? value.windowStart : Date.now()

  if (Date.now() - windowStart > PREVIEW_WINDOW_MS) {
    return createFreshCounter()
  }

  return {
    count: Math.max(0, count),
    windowStart
  }
}

const readStoredCounter = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return createFreshCounter()
    }

    return normalizeCounter(JSON.parse(stored))
  } catch {
    return createFreshCounter()
  }
}

const hasRecentPreviewConsumption = (previewKey) => {
  if (!previewKey) return false

  try {
    const now = Date.now()
    const raw = sessionStorage.getItem(DEDUPE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const nextEntries = Object.fromEntries(
      Object.entries(parsed).filter(([, timestamp]) => now - timestamp < DEDUPE_WINDOW_MS)
    )

    const wasConsumedRecently = Number.isFinite(nextEntries[previewKey]) && now - nextEntries[previewKey] < DEDUPE_WINDOW_MS
    nextEntries[previewKey] = now
    sessionStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(nextEntries))

    return wasConsumedRecently
  } catch {
    return false
  }
}

export function usePreviewCounter() {
  const { user, loading: authLoading } = useAuth()
  const [counter, setCounter] = useState(createFreshCounter)
  const [initialized, setInitialized] = useState(false)

  // Load counter from localStorage on mount
  useEffect(() => {
    if (authLoading) return

    if (user?.id) {
      setInitialized(true)
      return
    }

    setCounter(readStoredCounter())
    setInitialized(true)
  }, [authLoading, user?.id])

  // Persist counter to localStorage when it changes
  useEffect(() => {
    if (!initialized || authLoading || user?.id) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counter))
    } catch {
      // Ignore storage errors
    }
  }, [authLoading, counter, initialized, user?.id])

  const activeCounter = user?.id ? createFreshCounter() : normalizeCounter(counter)

  // Check if user has remaining previews - sync check
  const canPreview = useCallback(() => {
    if (user?.id) return true // Authenticated users have unlimited access

    return activeCounter.count < PREVIEW_LIMIT
  }, [activeCounter.count, user])

  // Atomically check and increment preview counter - returns true if allowed
  const tryPreview = useCallback((previewKey) => {
    if (user?.id) return true // Authenticated users have unlimited access
    if (authLoading || !initialized) return false // Wait for initialization
    
    if (hasRecentPreviewConsumption(previewKey)) {
      return true // Already counted recently, allow
    }
    
    let allowed = false
    
    setCounter(prev => {
      const nextCounter = normalizeCounter(prev)
      
      // Check if limit not reached
      if (nextCounter.count < PREVIEW_LIMIT) {
        allowed = true
        return { ...nextCounter, count: nextCounter.count + 1 }
      }
      
      // Limit reached
      allowed = false
      return nextCounter
    })
    
    return allowed
  }, [user, authLoading, initialized])

  // Legacy increment method - deprecated
  const increment = useCallback((previewKey) => {
    console.warn('increment() is deprecated, use tryPreview() instead')
    return tryPreview(previewKey)
  }, [tryPreview])

  // Get remaining previews
  const remaining = user?.id ? Infinity : Math.max(0, PREVIEW_LIMIT - activeCounter.count)
  const limitReached = !user?.id && remaining === 0

  // Calculate time until reset
  const resetInMs = Math.max(0, (activeCounter.windowStart + PREVIEW_WINDOW_MS) - Date.now())
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
      limitReached: false,
      isAuthenticated: false,
      loading: true
    }
  }

  return {
    count: activeCounter.count,
    remaining,
    limit: PREVIEW_LIMIT,
    canPreview,
    tryPreview,
    increment,
    resetInMs,
    resetInHours,
    limitReached,
    isAuthenticated: !!user && !!user.id,
    loading: false
  }
}
