/**
 * Service Worker Update Service
 *
 * Detects when a new SW version is waiting and provides
 * skipWaiting() to activate it. Listens for:
 *  - 'updatefound' on the registration (new worker installing)
 *  - 'controllerchange' (new worker took control)
 *  - periodic checks via checkForUpdate()
 */

const listeners = new Set()
let currentRegistration = null

function notify(type, data) {
  for (const fn of listeners) {
    try { fn({ type, ...data }) } catch { /* ignore */ }
  }
}

/**
 * @param {ServiceWorkerRegistration} reg
 */
export function listenForUpdates(reg) {
  if (!reg) return
  currentRegistration = reg

  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing
    if (!newWorker) return

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // A new version is waiting
        notify('updateAvailable', { timestamp: Date.now() })
      }
    })
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    notify('controllerChange', { timestamp: Date.now() })
  })
}

/**
 * Call this to activate the waiting service worker.
 * The page will reload via the controllerchange listener.
 */
export async function skipWaiting() {
  const reg = currentRegistration || await navigator.serviceWorker.ready
  const waiting = reg.waiting
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }
}

/**
 * Manually trigger an update check.
 */
export async function checkForUpdate() {
  if (!currentRegistration) return false
  try {
    await currentRegistration.update()
    return true
  } catch {
    return false
  }
}

/**
 * Subscribe to update events.
 * @param {Function} fn - callback({ type: string, timestamp: number })
 * @returns {Function} unsubscribe
 */
export function onUpdateEvent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Returns true if a service worker is currently controlling the page.
 */
export function isSWControlling() {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller
}
