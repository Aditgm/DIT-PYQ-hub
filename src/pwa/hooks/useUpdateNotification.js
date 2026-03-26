import { useState, useEffect, useCallback, useRef } from 'react'
import { onUpdateEvent, skipWaiting, checkForUpdate, isSWControlling } from '../services/swUpdateService'

/**
 * Hook for managing service worker update state.
 *
 * @param {{ muted: boolean }} options
 * @returns {{
 *   updateAvailable: boolean,
 *   isUpdating: boolean,
 *   reload: Function,
 *   dismiss: Function,
 * }}
 */
export function useUpdateNotification({ muted = false } = {}) {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!isSWControlling()) return

    const unsub = onUpdateEvent(({ type }) => {
      if (!mountedRef.current) return
      if (type === 'updateAvailable' && !muted) {
        setUpdateAvailable(true)
        setDismissed(false)
      }
      if (type === 'controllerChange') {
        // New SW took control — page will reload
        setIsUpdating(false)
      }
    })

    return unsub
  }, [muted])

  // Check for updates periodically (every 30 minutes)
  useEffect(() => {
    if (!isSWControlling()) return
    const id = setInterval(() => checkForUpdate(), 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const reload = useCallback(() => {
    setIsUpdating(true)
    skipWaiting()
    // The page will reload when the new SW takes control.
    // If it doesn't reload within 3 seconds, force it.
    setTimeout(() => {
      if (mountedRef.current) window.location.reload()
    }, 3000)
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    setUpdateAvailable(false)
  }, [])

  return {
    updateAvailable: updateAvailable && !dismissed,
    isUpdating,
    reload,
    dismiss,
  }
}
