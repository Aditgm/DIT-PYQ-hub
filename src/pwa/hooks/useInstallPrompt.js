import { useState, useEffect, useCallback, useRef } from 'react'
import {
  promptInstall,
  canInstall as canInstallService,
  isStandalone,
  getPlatform,
  supportsInstallPrompt,
  onInstallEvent,
} from '../services/installPromptService'

/**
 * Hook for managing the install prompt state.
 *
 * @param {{ dismissed: boolean }} options
 * @returns {{
 *   showInstall: boolean,
 *   showIOS: boolean,
 *   platform: string,
 *   isInstalled: boolean,
 *   installing: boolean,
 *   error: string | null,
 *   install: Function,
 *   dismiss: Function,
 * }}
 */
export function useInstallPrompt({ dismissed = false } = {}) {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isStandalone())
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState(null)
  const [shownOnce, setShownOnce] = useState(false)
  const mountedRef = useRef(true)

  const platform = getPlatform()

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const unsub = onInstallEvent(({ type }) => {
      if (!mountedRef.current) return
      if (type === 'canInstall') setCanInstall(true)
      if (type === 'installed') {
        setIsInstalled(true)
        setCanInstall(false)
        setInstalling(false)
      }
      if (type === 'accepted') {
        setInstalling(true)
      }
      if (type === 'dismissed') {
        setInstalling(false)
      }
    })

    // Check initial state
    if (canInstallService()) setCanInstall(true)

    return unsub
  }, [])

  const install = useCallback(async () => {
    setError(null)
    setInstalling(true)
    try {
      const { outcome } = await promptInstall()
      if (outcome === 'dismissed') {
        setInstalling(false)
      }
      // 'accepted' handled by the event listener
      return outcome
    } catch (err) {
      setError(err.message || 'Install failed')
      setInstalling(false)
      return 'error'
    }
  }, [])

  const dismiss = useCallback(() => {
    setShownOnce(true)
  }, [])

  // Determine what to show
  const showInstall = canInstall && !isInstalled && !dismissed && !installing
  const showIOS = platform === 'ios' && !isInstalled && !dismissed && supportsInstallPrompt() === false

  return {
    showInstall,
    showIOS,
    platform,
    isInstalled,
    installing,
    error,
    install,
    dismiss,
  }
}
