import React, { useEffect, useRef } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { strings } from '../i18n/strings'

/**
 * Update notification banner.
 *
 * Renders a fixed-position banner at the top of the viewport when
 * a new service worker version is available.
 *
 * Accessibility:
 *  - role="alert" for screen reader announcement
 *  - Keyboard: Tab to buttons, Enter to activate, Escape to dismiss
 *  - Focus is NOT stolen from the user's current task
 *
 * @param {{
 *   visible: boolean,
 *   isUpdating: boolean,
 *   onReload: Function,
 *   onRemindLater: Function,
 *   onDismiss: Function,
 *   onMute: Function,
 * }} props
 */
const UpdateBanner = ({ visible, isUpdating, onReload, onRemindLater, onDismiss, onMute }) => {
  const bannerRef = useRef(null)

  // Trap focus within banner when it appears (non-intrusive: just announce)
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div
      ref={bannerRef}
      role="alert"
      aria-label={strings.aria.updateBanner}
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--pwa-update-bg, #1e293b)',
        borderBottom: '1px solid var(--pwa-update-border, #334155)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'pwa-slide-down 200ms ease-out',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      <style>{`
        @keyframes pwa-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Icon */}
      <RefreshCw
        size={18}
        style={{
          color: 'var(--pwa-update-accent, #6dddff)',
          flexShrink: 0,
          animation: isUpdating ? 'spin 1s linear infinite' : 'none',
        }}
        aria-hidden="true"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          color: 'var(--pwa-update-text, #f1f5f9)',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'inherit',
        }}>
          {isUpdating ? strings.update.updating : strings.update.title}
        </p>
        <p style={{
          margin: 0,
          color: 'var(--pwa-update-dismiss, #64748b)',
          fontSize: '13px',
          fontFamily: 'inherit',
        }}>
          {strings.update.message}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onReload}
          disabled={isUpdating}
          aria-label={strings.update.reload}
          style={{
            background: 'var(--pwa-update-accent, #6dddff)',
            color: '#070e1a',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isUpdating ? 'wait' : 'pointer',
            opacity: isUpdating ? 0.6 : 1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {isUpdating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              {strings.update.updating}
            </span>
          ) : strings.update.reload}
        </button>

        <button
          onClick={onRemindLater}
          disabled={isUpdating}
          aria-label={strings.update.remindLater}
          style={{
            background: 'transparent',
            color: 'var(--pwa-update-text, #f1f5f9)',
            border: '1px solid var(--pwa-update-border, #334155)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            cursor: isUpdating ? 'wait' : 'pointer',
            opacity: isUpdating ? 0.6 : 1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {strings.update.remindLater}
        </button>

        <button
          onClick={onMute}
          disabled={isUpdating}
          aria-label={strings.update.mute}
          title={strings.update.mute}
          style={{
            background: 'transparent',
            color: 'var(--pwa-update-dismiss, #64748b)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: isUpdating ? 'wait' : 'pointer',
            opacity: isUpdating ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {strings.update.mute}
        </button>

        <button
          onClick={onDismiss}
          disabled={isUpdating}
          aria-label={strings.aria.closeUpdate}
          style={{
            background: 'transparent',
            color: 'var(--pwa-update-dismiss, #64748b)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: isUpdating ? 'wait' : 'pointer',
            opacity: isUpdating ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default UpdateBanner
