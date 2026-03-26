import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { 
  CheckCircle, AlertCircle, AlertTriangle, Info, X 
} from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    colorVar: '--color-success',
    bgVar: '--color-success-container',
  },
  error: {
    icon: AlertCircle,
    colorVar: '--color-error',
    bgVar: '--color-error-container',
  },
  warn: {
    icon: AlertTriangle,
    colorVar: '--color-warning',
    bgVar: '--color-warning-container',
  },
  info: {
    icon: Info,
    colorVar: '--color-info',
    bgVar: '--color-info-container',
  },
}

const DEFAULT_CONFIG = {
  duration: 4000,
  position: 'top',
  dismissible: true,
  pauseOnHover: true,
}

let toastId = 0

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children, config = {} }) => {
  const [toasts, setToasts] = useState([])
  
  const defaults = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  const showToast = useCallback((
    message,
    type = 'info',
    payload = {}
  ) => {
    const id = ++toastId
    const toastConfig = { ...defaults, ...payload }
    
    const toast = {
      id,
      message,
      type,
      ...toastConfig,
      icon: payload.icon || (TOAST_TYPES[type]?.icon || Info),
      createdAt: Date.now(),
      isHovered: false,
    }
    
    setToasts(prev => [...prev, toast])
    
    if (toastConfig.duration > 0) {
      const timeoutId = setTimeout(() => {
        if (!toastConfig.dismissible) return
        setToasts(prev => {
          const existing = prev.find(t => t.id === id)
          if (existing && !existing.isHovered) {
            return prev.filter(t => t.id !== id)
          }
          return prev
        })
      }, toastConfig.duration)
      
      return { id, dismiss: () => removeToast(id), timeoutId }
    }
    
    return { id, dismiss: () => removeToast(id) }
  }, [defaults, removeToast])
  
  const success = useCallback((message, payload) => 
    showToast(message, 'success', payload), [showToast])
  
  const error = useCallback((message, payload) => 
    showToast(message, 'error', payload), [showToast])
  
  const warn = useCallback((message, payload) => 
    showToast(message, 'warn', payload), [showToast])
  
  const info = useCallback((message, payload) => 
    showToast(message, 'info', payload), [showToast])
  
  const clear = useCallback(() => setToasts([]), [])
  
  const updateHoverState = useCallback((id, isHovered) => {
    setToasts(prev => prev.map(t => 
      t.id === id ? { ...t, isHovered } : t
    ))
  }, [])
  
  const value = useMemo(() => ({
    toasts,
    show: showToast,
    success,
    error,
    warn,
    info,
    clear,
    removeToast,
    updateHoverState,
  }), [toasts, showToast, success, error, warn, info, clear, removeToast, updateHoverState])
  
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export { TOAST_TYPES }
export default ToastContext