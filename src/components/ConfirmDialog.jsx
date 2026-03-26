import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, Info, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const variants = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-error/20',
    iconColor: 'text-error',
    confirmBg: 'bg-error/20 border-error/30 text-error hover:bg-error/30',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning/20',
    iconColor: 'text-warning',
    confirmBg: 'bg-warning/20 border-warning/30 text-warning hover:bg-warning/30',
  },
  info: {
    icon: Info,
    iconBg: 'bg-info/20',
    iconColor: 'text-info',
    confirmBg: 'btn-primary',
  },
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  const cancelRef = useRef(null)
  const style = variants[variant] || variants.danger
  const Icon = style.icon

  useEffect(() => {
    if (!isOpen) return
    cancelRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="glass rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${style.iconColor}`} />
                </div>
                <h2 id="confirm-dialog-title" className="font-display font-bold text-lg text-on-surface">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-on-surface-variant"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">{message}</p>

            <div className="flex items-center gap-3">
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 border rounded-xl font-medium transition-colors ${style.confirmBg}`}
              >
                {confirmText}
              </button>
              <button
                ref={cancelRef}
                onClick={onClose}
                className="px-4 py-3 text-on-surface-variant hover:text-on-surface rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmDialog
