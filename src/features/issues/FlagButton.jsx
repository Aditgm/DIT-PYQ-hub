import React, { useState } from 'react'
import { Flag } from 'lucide-react'
import FlagModal from './FlagModal'

/**
 * Flag button — renders a prominent button that opens the report modal.
 *
 * @param {{ paperId: string, paperTitle?: string }} props
 */
const FlagButton = ({ paperId, paperTitle = '' }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-medium"
        aria-label="Report an issue with this paper"
      >
        <Flag className="w-4 h-4" aria-hidden="true" />
        Flag
      </button>

      {isOpen && (
        <FlagModal
          paperId={paperId}
          paperTitle={paperTitle}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default FlagButton
