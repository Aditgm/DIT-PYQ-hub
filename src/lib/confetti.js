import confetti from 'canvas-confetti'

const DEFAULT_PALETTE = {
  primary: '#6dddff',
  secondary: '#d674ff',
  success: '#22c55e',
  warning: '#f59e0b',
  accent: '#82a3ff',
}

const PAPER_UPLOAD_PALETTE = {
  softBlue: '#89b4ff',
  softGrey: '#a8b4c4',
  pastelPurple: '#c4b5fd',
  pastelGreen: '#86efac',
  pastelBlue: '#7dd3fc',
  softTeal: '#5eead4',
  lavender: '#c4b5fd',
  mist: '#94a3b8',
}

const DEFAULT_OPTIONS = {
  particleCount: 100,
  spread: 100,
  origin: { x: 0.5, y: 0.6 },
  gravity: 1.2,
  drift: 0,
  ticks: 200,
  shapes: ['circle', 'square', 'triangle'],
  zIndex: 999999,
  disableForReducedMotion: true,
  duration: 3000,
  canvasSelector: null,
  colors: null,
}

const PAPER_UPLOAD_OPTIONS = {
  particleCount: 60,
  spread: 70,
  origin: { x: 0.5, y: 0.8 },
  gravity: 0.8,
  drift: 2,
  ticks: 150,
  shapes: ['circle', 'square'],
  zIndex: 999999,
  disableForReducedMotion: true,
  duration: 1200,
  colors: null,
}

let confettiInstance = null
let animationFrameId = null
let paperConfettiTimeout = null
let lastPaperConfettiTime = 0
const CONFETTI_DEBOUNCE_MS = 1000

const confettiStorage = {
  getEnabled: () => {
    try {
      const stored = localStorage.getItem('confetti_enabled')
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  },
  setEnabled: (enabled) => {
    try {
      localStorage.setItem('confetti_enabled', String(enabled))
    } catch {
      // Storage not available
    }
  },
}

export const isConfettiEnabled = () => confettiStorage.getEnabled()
export const setConfettiEnabled = (enabled) => confettiStorage.setEnabled(enabled)

export const celebrateUploadApproval = (options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  if (config.disableForReducedMotion) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      announceSuccess()
      return
    }
  }

  const colors = config.colors || [
    DEFAULT_PALETTE.primary,
    DEFAULT_PALETTE.secondary,
    DEFAULT_PALETTE.success,
    DEFAULT_PALETTE.warning,
    DEFAULT_PALETTE.accent,
  ]

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = config.zIndex.toString()
  canvas.id = 'confetti-canvas'
  
  document.body.appendChild(canvas)
  
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const duration = config.duration
  const endTime = Date.now() + duration

  const fireConfetti = () => {
    if (Date.now() > endTime) {
      cleanup()
      return
    }

    confetti({
      canvas: canvas,
      particleCount: config.particleCount,
      spread: config.spread,
      origin: config.origin,
      colors: colors,
      shapes: config.shapes,
      gravity: config.gravity,
      drift: config.drift,
      ticks: config.ticks,
      disableForReducedMotion: false,
    })

    animationFrameId = requestAnimationFrame(fireConfetti)
  }

  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
    }
    announceSuccess()
  }

  fireConfetti()
}

const announceSuccess = () => {
  const liveRegion = document.createElement('div')
  liveRegion.setAttribute('role', 'status')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.className = 'sr-only'
  liveRegion.textContent = 'Upload approved! Celebration animation played.'
  document.body.appendChild(liveRegion)
  
  setTimeout(() => {
    liveRegion.parentNode?.removeChild(liveRegion)
  }, 1000)
}

export const celebrateUploadApprovalSimple = (options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  if (config.disableForReducedMotion) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      announceSuccess()
      return Promise.resolve()
    }
  }

  const colors = config.colors || [
    DEFAULT_PALETTE.primary,
    DEFAULT_PALETTE.secondary,
    DEFAULT_PALETTE.success,
    DEFAULT_PALETTE.warning,
    DEFAULT_PALETTE.accent,
  ]

  return new Promise((resolve) => {
    const end = Date.now() + config.duration
    
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      } else {
        announceSuccess()
        resolve()
      }
    }

    frame()
  })
}

export const cancelConfetti = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  const canvas = document.getElementById('confetti-canvas')
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas)
  }
  
  if (paperConfettiTimeout) {
    clearTimeout(paperConfettiTimeout)
    paperConfettiTimeout = null
  }
}

const getPaperUploadColors = () => [
  PAPER_UPLOAD_PALETTE.softBlue,
  PAPER_UPLOAD_PALETTE.softGrey,
  PAPER_UPLOAD_PALETTE.pastelPurple,
  PAPER_UPLOAD_PALETTE.pastelGreen,
  PAPER_UPLOAD_PALETTE.pastelBlue,
  PAPER_UPLOAD_PALETTE.softTeal,
  PAPER_UPLOAD_PALETTE.lavender,
  PAPER_UPLOAD_PALETTE.mist,
]

export const celebratePaperUpload = (options = {}) => {
  if (!isConfettiEnabled()) {
    return
  }
  
  const now = Date.now()
  if (now - lastPaperConfettiTime < CONFETTI_DEBOUNCE_MS) {
    return
  }
  lastPaperConfettiTime = now
  
  const config = { ...PAPER_UPLOAD_OPTIONS, ...options }
  
  if (config.disableForReducedMotion) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      announcePaperUpload()
      return
    }
  }

  const colors = config.colors || getPaperUploadColors()

  confetti({
    particleCount: config.particleCount,
    spread: config.spread,
    origin: config.origin,
    colors: colors,
    shapes: config.shapes,
    gravity: config.gravity,
    drift: config.drift,
    ticks: config.ticks,
    disableForReducedMotion: false,
    duration: config.duration,
  })

  paperConfettiTimeout = setTimeout(() => {
    announcePaperUpload()
  }, config.duration)
}

const announcePaperUpload = () => {
  const liveRegion = document.createElement('div')
  liveRegion.setAttribute('role', 'status')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.className = 'sr-only'
  liveRegion.textContent = 'Paper uploaded successfully!'
  document.body.appendChild(liveRegion)
  
  setTimeout(() => {
    liveRegion.parentNode?.removeChild(liveRegion)
  }, 1000)
}

export { DEFAULT_PALETTE, DEFAULT_OPTIONS, PAPER_UPLOAD_PALETTE, PAPER_UPLOAD_OPTIONS }
export default celebrateUploadApproval