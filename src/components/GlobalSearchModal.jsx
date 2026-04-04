import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Loader2, X, FileText, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const GlobalSearchModal = ({ isOpen, onClose, papers = [] }) => {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Escape') onClose()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
      setQuery('')
      setSelectedIndex(0)
    } else {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Search logic with debounce
  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    
    setLoading(true)
    
    const timer = setTimeout(() => {
      const filtered = papers.filter(p => 
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.subject.toLowerCase().includes(query.toLowerCase()) ||
        p.branch?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
      
      setResults(filtered)
      setLoading(false)
      setSelectedIndex(0)
    }, 150)

    return () => clearTimeout(timer)
  }, [query, papers])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyNavigation = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        navigate(`/paper/${results[selectedIndex].id}`)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyNavigation)
    return () => window.removeEventListener('keydown', handleKeyNavigation)
  }, [isOpen, results, selectedIndex, navigate, onClose])

  const handleResultClick = (paper) => {
    navigate(`/paper/${paper.id}`)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        <motion.div
          initial={{ y: prefersReducedMotion ? 0 : -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: prefersReducedMotion ? 0 : -10, opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
          className="w-full max-w-xl mx-4 glass-strong rounded-2xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 flex items-center gap-3 border-b border-white/10">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search papers, subjects, branches..."
              className="flex-1 bg-transparent text-lg outline-none text-on-surface placeholder:text-on-surface-variant/50"
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-activedescendant={results[selectedIndex] ? `result-${results[selectedIndex].id}` : undefined}
              autoComplete="off"
            />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Close search"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
            <kbd className="hidden sm:block px-2 py-1 text-xs bg-white/5 rounded text-on-surface-variant">
              ESC
            </kbd>
          </div>
          
          <div 
            id="search-results" 
            role="listbox" 
            className="max-h-80 overflow-y-auto"
          >
            {results.length === 0 && query && !loading ? (
              <div className="p-8 text-center text-on-surface-variant">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No papers found for "{query}"</p>
              </div>
            ) : (
              results.map((paper, index) => (
                <div
                  key={paper.id}
                  id={`result-${paper.id}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleResultClick(paper)}
                  className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${
                    index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-on-surface truncate">{paper.title}</p>
                    <p className="text-sm text-on-surface-variant truncate">{paper.subject} • {paper.branch} • Semester {paper.semester}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant flex-shrink-0 ml-2" />
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-on-surface-variant">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded text-xs">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded text-xs">Enter</kbd> Select</span>
            </div>
            <span><kbd className="px-1.5 py-0.5 bg-white/5 rounded text-xs">⌘K</kbd> Toggle</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default GlobalSearchModal