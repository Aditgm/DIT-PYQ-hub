import posthog from 'posthog-js'

export const initPostHog = () => {
  if (!import.meta.env.VITE_POSTHOG_KEY) return
  
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.debug()
      }
    },
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: false,
    persistence: 'localStorage'
  })
}

export const identifyUser = (userId, properties = {}) => {
  if (!posthog.__loaded) return
  posthog.identify(userId, properties)
}

export const captureEvent = (eventName, properties = {}) => {
  if (!posthog.__loaded) return
  posthog.capture(eventName, properties)
}

export const setUserProperties = (properties) => {
  if (!posthog.__loaded) return
  posthog.setPersonProperties(properties)
}

export const resetPostHog = () => {
  if (!posthog.__loaded) return
  posthog.reset()
}

export const posthogEnabled = !!import.meta.env.VITE_POSTHOG_KEY

export default {
  initPostHog,
  identifyUser,
  captureEvent,
  setUserProperties,
  resetPostHog,
  posthogEnabled
}