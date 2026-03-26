import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import ToastItem from './ToastItem'

const ToastContainer = ({ 
  position = 'top',
  maxToasts = 5,
  className = ''
}) => {
  const { toasts, removeToast } = useToast()
  const [isRendered, setIsRendered] = useState(false)
  const focusRef = useRef(null)
  
  useEffect(() => {
    setIsRendered(true)
  }, [])
  
  const positionClass = position === 'top' 
    ? 'toast-container-top' 
    : 'toast-container-bottom'
  
  const visibleToasts = toasts.slice(-maxToasts)
  
  const topToasts = visibleToasts.filter(t => t.position !== 'bottom')
  const bottomToasts = visibleToasts.filter(t => t.position === 'bottom')
  
  useEffect(() => {
    if (toasts.length > 0) {
      const latestToast = toasts[toasts.length - 1]
      focusRef.current?.focus()
    }
  }, [toasts.length])
  
  return (
    <div 
      className={`toast-container ${positionClass} ${className}`}
      role="region"
      aria-label="Notifications"
    >
      {position === 'top' && (
        <AnimatePresence mode="popLayout">
          {topToasts.map((toast) => (
            <ToastItem 
              key={toast.id} 
              toast={toast} 
            />
          ))}
        </AnimatePresence>
      )}
      
      {position === 'bottom' && (
        <AnimatePresence mode="popLayout">
          {bottomToasts.map((toast) => (
            <ToastItem 
              key={toast.id} 
              toast={toast} 
            />
          ))}
        </AnimatePresence>
      )}
      
      {position === 'mixed' && (
        <AnimatePresence mode="popLayout">
          {visibleToasts.map((toast) => (
            <ToastItem 
              key={toast.id} 
              toast={toast} 
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

export default ToastContainer