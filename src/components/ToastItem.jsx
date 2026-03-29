import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useToast, TOAST_TYPES } from '../context/ToastContext'

const ToastItem = ({ toast }) => {
  const { removeToast, updateHoverState } = useToast()
  const [isExiting, setIsExiting] = useState(false)
  
  const typeConfig = TOAST_TYPES[toast.type] || TOAST_TYPES.info
  const IconComponent = toast.icon || typeConfig.icon
  
  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => removeToast(toast.id), 200)
  }
  
  const handleMouseEnter = () => {
    updateHoverState(toast.id, true)
  }
  
  const handleMouseLeave = () => {
    updateHoverState(toast.id, false)
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      handleDismiss()
    }
  }

  const ariaMessage = typeof toast.message === 'string'
    ? toast.message
    : `${toast.type} notification`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: toast.position === 'top' ? -20 : 20, scale: 0.95 }}
      animate={{ 
        opacity: isExiting ? 0 : 1, 
        y: isExiting ? (toast.position === 'top' ? -20 : 20) : 0,
        scale: isExiting ? 0.95 : 1 
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaMessage}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={toast.pauseOnHover ? handleMouseEnter : undefined}
      onMouseLeave={toast.pauseOnHover ? handleMouseLeave : undefined}
      className="toast-item"
      style={{
        '--toast-color': `var(${typeConfig.colorVar})`,
        '--toast-bg': `var(${typeConfig.bgVar})`,
      }}
    >
      <div className="toast-main">
        <div className="toast-icon" aria-hidden="true">
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="toast-content">
          {typeof toast.message === 'string' ? (
            <p className="toast-message">{toast.message}</p>
          ) : (
            toast.message
          )}

          {toast.action && (
            <div className="toast-actions">
              <button
                onClick={toast.action.onClick}
                className="toast-action"
                aria-label={toast.action.label}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {toast.dismissible && (
        <button 
          onClick={handleDismiss}
          className="toast-dismiss"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

export default ToastItem