import React, { useState, useRef, useEffect } from 'react'
import { Search, FileText, BookOpen, Loader2, X } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
import { useSearchSuggestions } from '../lib/queries'
import { useTheme } from '../context/ThemeContext'

const SearchAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Search papers by title, subject...',
  className = ''
}) => {
  const [query, setQuery] = useState(value || '')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Debounce the query — React Query fires only when debouncedQuery changes
  const debouncedQuery = useDebounce(query, 300)
  const { data: suggestions = [], isLoading, isError } = useSearchSuggestions(debouncedQuery)

  // Open/close dropdown based on results
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(suggestions.length > 0 || isLoading)
      setSelectedIndex(-1)
    } else {
      setIsOpen(false)
    }
  }, [suggestions, isLoading, debouncedQuery])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setQuery(newValue)
    onChange(newValue)
  }

  const handleSelect = (suggestion) => {
    setQuery(suggestion.text)
    onChange(suggestion.text)
    if (suggestion.type === 'subject') {
      onSelect({ type: 'subject', value: suggestion.text })
    } else {
      onSelect({ type: 'paper', id: suggestion.id, title: suggestion.text })
    }
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) handleSelect(suggestions[selectedIndex])
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const highlightMatch = (text, q) => {
    if (!q) return text
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <span key={i} className="text-primary font-semibold">{part}</span> : part
    )
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync external value
  useEffect(() => {
    if (value !== query) setQuery(value || '')
  }, [value])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
         <input
           ref={inputRef}
           type="text"
           value={query}
           onChange={handleInputChange}
           onKeyDown={handleKeyDown}
           onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
           placeholder={placeholder}
           className="w-full pl-12 pr-10 py-3 bg-surface-container rounded-xl border border-[rgba(65,72,86,0.1)] focus:border-primary/50 focus:outline-none text-on-surface placeholder:text-on-surface-variant"
           autoComplete="off"
           role="combobox"
           aria-expanded={isOpen}
           aria-controls="search-suggestions"
           aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
           aria-busy={isLoading}
         />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant animate-spin" />
        )}
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('')
              onChange('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-surface-container-highest rounded-xl border border-white/10 shadow-xl overflow-hidden max-h-80 overflow-y-auto"
        >
          {isError ? (
            <div className="px-4 py-3 text-sm text-red-400" role="alert">Failed to fetch suggestions</div>
          ) : suggestions.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-on-surface-variant">No results found</div>
          ) : (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.text}`} role="option" aria-selected={selectedIndex === index}>
                  <button
                    onClick={() => handleSelect(suggestion)}
                    id={`suggestion-${index}`}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                      selectedIndex === index ? 'bg-primary/20 text-on-surface' : 'text-on-surface hover:bg-white/5'
                    }`}
                  >
                    {suggestion.type === 'subject' ? (
                      <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <FileText className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{highlightMatch(suggestion.text, debouncedQuery)}</div>
                      {suggestion.type === 'paper' && suggestion.subject && (
                        <div className="text-xs text-on-surface-variant mt-0.5 truncate">{suggestion.subject}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      suggestion.type === 'subject' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                    }`}>
                      {suggestion.type === 'subject' ? 'Subject' : 'Paper'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2 border-t border-white/5 text-xs text-on-surface-variant flex items-center gap-2">
            <span>↑↓</span> to navigate <span>↵</span> to select <span>esc</span> to close
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchAutocomplete
