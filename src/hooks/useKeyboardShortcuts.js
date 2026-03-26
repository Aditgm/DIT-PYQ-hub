import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const isEditableElement = (el) => {
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()

  const handleKeyDown = useCallback((e) => {
    const isMod = e.metaKey || e.ctrlKey
    const key = e.key.toLowerCase()
    const inInput = isEditableElement(document.activeElement)

    // Escape — always active, close modals or blur
    if (key === 'escape') {
      // If a dialog/modal is open, let it handle escape
      const dialog = document.querySelector('[role="dialog"]')
      if (dialog) return // don't interfere with modal's own Escape handler
      // Otherwise blur active element
      if (document.activeElement) {
        document.activeElement.blur()
      }
      return
    }

    // Don't trigger shortcuts while typing (except Escape above)
    if (inInput) return

    // Ctrl+K / Cmd+K — focus search
    if (isMod && key === 'k') {
      e.preventDefault()
      const searchInput = document.querySelector('input[type="text"][placeholder*="earch"]')
      if (searchInput) {
        searchInput.focus()
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        navigate('/browse')
      }
      return
    }

    // Ctrl+/ — navigate to help/home (could show shortcuts panel)
    if (isMod && key === '/') {
      e.preventDefault()
      return
    }

    // Ctrl+Shift+U — navigate to upload
    if (isMod && e.shiftKey && key === 'u') {
      e.preventDefault()
      navigate('/upload')
      return
    }
  }, [navigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
