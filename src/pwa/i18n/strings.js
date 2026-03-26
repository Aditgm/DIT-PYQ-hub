/**
 * PWA strings — all user-facing text.
 * Extract this file for i18n translation.
 */

export const strings = {
  // Update notification
  update: {
    title: 'Update available',
    message: 'A new version of PYQ Hub is ready.',
    reload: 'Reload',
    remindLater: 'Remind later',
    dismiss: 'Dismiss',
    mute: 'Don\'t show again',
    updating: 'Updating…',
  },

  // Install prompt
  install: {
    title: 'Install PYQ Hub',
    message: 'Add to your home screen for quick access and offline support.',
    install: 'Install',
    notNow: 'Not now',
    dontAsk: 'Don\'t ask again',
    installing: 'Installing…',
    success: 'Installed!',
    error: 'Install failed. Please try again.',

    // iOS-specific (no beforeinstallprompt)
    iosTitle: 'Install on iPhone',
    iosMessage: 'Tap Share then "Add to Home Screen" to install.',
    iosStep1: 'Tap the Share button',
    iosStep2: 'Scroll and tap "Add to Home Screen"',
    iosGotIt: 'Got it',
  },

  // ARIA labels
  aria: {
    updateBanner: 'App update notification',
    installBanner: 'App install prompt',
    closeUpdate: 'Dismiss update notification',
    closeInstall: 'Dismiss install prompt',
  },
}

/**
 * Get a string by path. e.g. get('update.title') => 'Update available'
 * @param {string} path
 * @returns {string}
 */
export function get(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], strings) || path
}
