import React, { useEffect, useRef } from 'react'
import { Download, X, Smartphone, Share } from 'lucide-react'
import { strings } from '../i18n/strings'

/**
 * Install prompt banner.
 *
 * Renders a fixed-position banner at the bottom of the viewport.
 * Handles two modes:
 *  - Standard: shows Install / Not Now / Don't Ask Again
 *  - iOS: shows manual installation instructions
 *
 * Accessibility:
 *  - role="dialog" with aria-modal for the iOS instruction overlay
 *  - Keyboard: Tab, Enter, Escape
 *  - Focus moves to banner when shown
 *
 * @param {{
 *   visible: boolean,
 *   platform: string,
 *   installing: boolean,
 *   onInstall: Function,
 *   onDismiss: Function,
 *   onDismissForever: Function,
 *   onIOSDismiss: Function,
 * }} props
 */
const InstallBanner = ({ visible, platform, installing, onInstall, onDismiss, onDismissForever, onIOSDismiss }) => {
  const bannerRef = useRef(null)

  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (platform === 'ios') onIOSDismiss()
        else onDismiss()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, platform, onDismiss, onIOSDismiss])

  // Focus the banner when it appears
  useEffect(() => {
    if (visible && bannerRef.current) {
      bannerRef.current.focus()
    }
  }, [visible])

  if (!visible) return null

  // iOS: show manual instructions
  if (platform === 'ios') {
    return (
      <div
        ref={bannerRef}
        role="dialog"
        aria-modal="true"
        aria-label={strings.aria.installBanner}
        tabIndex={-1}
        className="pwa-install-banner pwa-install-ios"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--mobile-bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'var(--pwa-install-bg, linear-gradient(135deg, #0f172a, #1e293b))',
          borderTop: '1px solid var(--pwa-install-border, #334155)',
          padding: '20px 16px 16px',
          animation: 'pwa-slide-up 200ms ease-out',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <style>{`
          @keyframes pwa-slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          @media (max-width: 640px) {
            .pwa-install-banner {
              padding: 12px !important;
            }

            .pwa-install-ios {
              padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px) !important;
            }

            .pwa-install-ios-steps {
              display: grid !important;
              grid-template-columns: 1fr;
              gap: 10px !important;
            }

            .pwa-install-actions {
              width: 100%;
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
            }

            .pwa-install-primary {
              grid-column: 1 / -1;
              width: 100% !important;
            }

            .pwa-install-secondary {
              width: 100% !important;
            }

            .pwa-install-icon-btn {
              justify-self: end;
              width: fit-content;
            }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{
              margin: 0,
              color: 'var(--pwa-install-text, #f1f5f9)',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'inherit',
            }}>
              {strings.install.iosTitle}
            </h2>
            <p style={{
              margin: '4px 0 0',
              color: 'var(--pwa-install-cancel, #64748b)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}>
              {strings.install.iosMessage}
            </p>
          </div>
          <button
            onClick={onIOSDismiss}
            aria-label={strings.aria.closeInstall}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pwa-install-cancel, #64748b)',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="pwa-install-ios-steps" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div className="pwa-install-ios-step" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <Share size={18} style={{ color: 'var(--pwa-install-accent, #6dddff)', flexShrink: 0 }} />
            <span style={{ color: 'var(--pwa-install-text, #f1f5f9)', fontSize: '13px', fontFamily: 'inherit' }}>
              {strings.install.iosStep1}
            </span>
          </div>
          <div className="pwa-install-ios-step" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <Smartphone size={18} style={{ color: 'var(--pwa-install-accent, #6dddff)', flexShrink: 0 }} />
            <span style={{ color: 'var(--pwa-install-text, #f1f5f9)', fontSize: '13px', fontFamily: 'inherit' }}>
              {strings.install.iosStep2}
            </span>
          </div>
        </div>

        <button
          className="pwa-install-primary"
          onClick={onIOSDismiss}
          style={{
            width: '100%',
            background: 'var(--pwa-install-accent, #6dddff)',
            color: '#070e1a',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {strings.install.iosGotIt}
        </button>
      </div>
    )
  }

  // Standard install prompt (Android / Desktop)
  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="true"
      aria-label={strings.aria.installBanner}
      tabIndex={-1}
      className="pwa-install-banner"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--mobile-bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--pwa-install-bg, linear-gradient(135deg, #0f172a, #1e293b))',
        borderTop: '1px solid var(--pwa-install-border, #334155)',
        padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'pwa-slide-up 200ms ease-out',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Icon */}
      <Download
        size={20}
        style={{ color: 'var(--pwa-install-accent, #6dddff)', flexShrink: 0 }}
        aria-hidden="true"
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
        <p style={{
          margin: 0,
          color: 'var(--pwa-install-text, #f1f5f9)',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'inherit',
        }}>
          {strings.install.title}
        </p>
        <p style={{
          margin: 0,
          color: 'var(--pwa-install-cancel, #64748b)',
          fontSize: '13px',
          fontFamily: 'inherit',
        }}>
          {strings.install.message}
        </p>
      </div>

      {/* Actions */}
      <div
        className="pwa-install-actions"
        style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <button
          className="pwa-install-primary"
          onClick={onInstall}
          disabled={installing}
          aria-label={strings.install.install}
          style={{
            background: 'var(--pwa-install-accent, #6dddff)',
            color: '#070e1a',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: installing ? 'wait' : 'pointer',
            opacity: installing ? 0.6 : 1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {installing ? strings.install.installing : strings.install.install}
        </button>

        <button
          className="pwa-install-secondary"
          onClick={onDismiss}
          disabled={installing}
          aria-label={strings.install.notNow}
          style={{
            background: 'transparent',
            color: 'var(--pwa-install-text, #f1f5f9)',
            border: '1px solid var(--pwa-install-border, #334155)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            cursor: installing ? 'wait' : 'pointer',
            opacity: installing ? 0.6 : 1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {strings.install.notNow}
        </button>

        <button
          className="pwa-install-icon-btn"
          onClick={onDismissForever}
          disabled={installing}
          aria-label={strings.install.dontAsk}
          title={strings.install.dontAsk}
          style={{
            background: 'transparent',
            color: 'var(--pwa-install-cancel, #64748b)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 8px',
            fontSize: '12px',
            cursor: installing ? 'wait' : 'pointer',
            opacity: installing ? 0.6 : 1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {strings.install.dontAsk}
        </button>

        <button
          className="pwa-install-icon-btn"
          onClick={onDismiss}
          disabled={installing}
          aria-label={strings.aria.closeInstall}
          style={{
            background: 'transparent',
            color: 'var(--pwa-install-cancel, #64748b)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: installing ? 'wait' : 'pointer',
            opacity: installing ? 0.6 : 1,
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

export default InstallBanner
