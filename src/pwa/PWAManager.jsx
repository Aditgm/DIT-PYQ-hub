import React, { useEffect } from 'react'
import { listenForUpdates } from './services/swUpdateService'
import { usePWAPreferences } from './hooks/usePWAPreferences'
import { useUpdateNotification } from './hooks/useUpdateNotification'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import UpdateBanner from './components/UpdateBanner'
import InstallBanner from './components/InstallBanner'

/**
 * PWAManager — root component for PWA features.
 *
 * Place this inside App.jsx, at the top level of the component tree
 * (after providers like AuthProvider, but inside Router).
 *
 * It manages:
 *  1. Service worker update notification
 *  2. Install prompt banner
 *
 * Both features are controlled by user preferences (usePWAPreferences).
 */
const PWAManager = () => {
  const {
    isUpdateMuted,
    isInstallDismissed,
    muteUpdates,
    dismissInstall,
    dismissInstallForever,
  } = usePWAPreferences()

  const { updateAvailable, isUpdating, reload, dismiss } = useUpdateNotification({
    muted: isUpdateMuted,
  })

  const {
    showInstall,
    showIOS,
    platform,
    installing,
    install,
    dismiss: dismissInstallPrompt,
  } = useInstallPrompt({
    dismissed: isInstallDismissed,
  })

  // Register SW update listener on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((reg) => {
      listenForUpdates(reg)
    }).catch(() => {
      // SW not supported or blocked — features degrade gracefully
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement

    const syncOffsets = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const installVisible = showInstall || showIOS

      const topOffset = updateAvailable ? (isMobile ? '74px' : '66px') : '0px'
      const bottomOffset = installVisible
        ? (isMobile ? (platform === 'ios' ? '220px' : '140px') : (platform === 'ios' ? '170px' : '96px'))
        : '0px'

      root.style.setProperty('--pwa-top-offset', topOffset)
      root.style.setProperty('--pwa-bottom-offset', bottomOffset)
    }

    syncOffsets()
    window.addEventListener('resize', syncOffsets)

    return () => {
      window.removeEventListener('resize', syncOffsets)
      root.style.setProperty('--pwa-top-offset', '0px')
      root.style.setProperty('--pwa-bottom-offset', '0px')
    }
  }, [updateAvailable, showInstall, showIOS, platform])

  // Handle "remind later" — dismiss for 1 hour
  const handleRemindLater = () => {
    dismiss()
  }

  // Handle "mute" — disable update notifications permanently
  const handleMute = () => {
    muteUpdates()
    dismiss()
  }

  // Handle install dismiss — 7 day cooldown
  const handleInstallDismiss = () => {
    dismissInstall(7)
    dismissInstallPrompt()
  }

  // Handle "don't ask again"
  const handleInstallDismissForever = () => {
    dismissInstallForever()
    dismissInstallPrompt()
  }

  return (
    <>
      <UpdateBanner
        visible={updateAvailable}
        isUpdating={isUpdating}
        onReload={reload}
        onRemindLater={handleRemindLater}
        onDismiss={dismiss}
        onMute={handleMute}
      />

      <InstallBanner
        visible={showInstall || showIOS}
        platform={platform}
        installing={installing}
        onInstall={install}
        onDismiss={handleInstallDismiss}
        onDismissForever={handleInstallDismissForever}
        onIOSDismiss={handleInstallDismiss}
      />
    </>
  )
}

export default PWAManager
