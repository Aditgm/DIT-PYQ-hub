/**
 * Install Prompt Service
 *
 * Captures the beforeinstallprompt event, defers it, and exposes
 * a prompt() method to show the browser's native install dialog.
 * Also detects platform and whether the app is already installed.
 */

let deferredPrompt = null
let installed = false
const listeners = new Set()

function notify(type, data) {
  for (const fn of listeners) {
    try { fn({ type, ...data }) } catch { /* ignore */ }
  }
}

// Capture the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  notify('canInstall', { platform: getPlatform(), timestamp: Date.now() })
})

// Detect if already installed (standalone mode)
window.addEventListener('DOMContentLoaded', () => {
  if (isStandalone()) {
    installed = true
    notify('installed', { timestamp: Date.now() })
  }
})

// Detect appinstalled event
window.addEventListener('appinstalled', () => {
  installed = true
  deferredPrompt = null
  notify('installed', { timestamp: Date.now() })
})

/**
 * Show the browser's native install prompt.
 * @returns {Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' }>}
 */
export async function promptInstall() {
  if (!deferredPrompt) {
    return { outcome: 'unavailable' }
  }

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null

  const result = outcome === 'accepted' ? 'accepted' : 'dismissed'
  notify(result, { platform: getPlatform(), timestamp: Date.now() })
  return { outcome: result }
}

/**
 * @returns {boolean} true if the beforeinstallprompt event was captured
 */
export function canInstall() {
  return !!deferredPrompt && !installed
}

/**
 * @returns {boolean} true if running in standalone mode (installed)
 */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true // iOS Safari
}

/**
 * Detect the current platform.
 * @returns {'android' | 'ios' | 'desktop' | 'unknown'}
 */
export function getPlatform() {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (window.matchMedia('(pointer: fine)').matches) return 'desktop'
  return 'unknown'
}

/**
 * @returns {boolean} true if the platform supports beforeinstallprompt
 */
export function supportsInstallPrompt() {
  return getPlatform() !== 'ios' // iOS doesn't fire beforeinstallprompt
}

/**
 * Subscribe to install events.
 * @param {Function} fn - callback({ type: string, ...data })
 * @returns {Function} unsubscribe
 */
export function onInstallEvent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
