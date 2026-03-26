import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'pwa_preferences'

const defaults = {
  updateNotifications: 'enabled',      // 'enabled' | 'muted'
  installDismissedUntil: null,          // timestamp or null
  installDismissedForever: false,
  lastInteraction: 0,
}

/**
 * Loads preferences from localStorage.
 */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

/**
 * Saves preferences to localStorage.
 */
function save(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch { /* storage full or blocked */ }
}

/**
 * Hook for managing PWA user preferences.
 *
 * @returns {{
 *   prefs: object,
 *   muteUpdates: Function,
 *   unmuteUpdates: Function,
 *   dismissInstall: Function,
 *   dismissInstallForever: Function,
 *   resetInstallDismiss: Function,
 *   isUpdateMuted: boolean,
 *   isInstallDismissed: boolean,
 * }}
 */
export function usePWAPreferences() {
  const [prefs, setPrefs] = useState(load)

  // Persist on change
  useEffect(() => {
    save(prefs)
  }, [prefs])

  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch, lastInteraction: Date.now() }
      return next
    })
  }, [])

  const muteUpdates = useCallback(() => {
    update({ updateNotifications: 'muted' })
  }, [update])

  const unmuteUpdates = useCallback(() => {
    update({ updateNotifications: 'enabled' })
  }, [update])

  /**
   * Dismiss install prompt for a number of days.
   * @param {number} days - default 7
   */
  const dismissInstall = useCallback((days = 7) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000
    update({ installDismissedUntil: until })
  }, [update])

  const dismissInstallForever = useCallback(() => {
    update({ installDismissedForever: true })
  }, [update])

  const resetInstallDismiss = useCallback(() => {
    update({ installDismissedUntil: null, installDismissedForever: false })
  }, [update])

  const isUpdateMuted = prefs.updateNotifications === 'muted'

  const isInstallDismissed = (() => {
    if (prefs.installDismissedForever) return true
    if (prefs.installDismissedUntil && Date.now() < prefs.installDismissedUntil) return true
    return false
  })()

  return {
    prefs,
    muteUpdates,
    unmuteUpdates,
    dismissInstall,
    dismissInstallForever,
    resetInstallDismiss,
    isUpdateMuted,
    isInstallDismissed,
  }
}
