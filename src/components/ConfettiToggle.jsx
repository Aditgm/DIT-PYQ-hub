import React from 'react'
import { Sparkles } from 'lucide-react'
import { isConfettiEnabled, setConfettiEnabled } from '../lib/confetti'

const ConfettiToggle = ({ className = '' }) => {
  const [enabled, setEnabled] = React.useState(isConfettiEnabled)

  const handleToggle = () => {
    const newValue = !enabled
    setEnabled(newValue)
    setConfettiEnabled(newValue)
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-surface
          ${enabled ? 'bg-primary' : 'bg-surface-container-highest'}
        `}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle confetti animation"
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-md
            transition-transform duration-200 ease-in-out
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <span className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Sparkles className={`w-4 h-4 ${enabled ? 'text-primary' : 'text-on-surface-variant/50'}`} />
        <span>Confetti on upload</span>
      </span>
    </div>
  )
}

export default ConfettiToggle