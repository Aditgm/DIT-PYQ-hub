import { useState, useEffect } from 'react'

/**
 * Reusable debounce hook. Returns `value` after `delay` ms of inactivity.
 *
 * @template T
 * @param {T} value - The value to debounce
 * @param {number} delay - Debounce delay in ms (default 300)
 * @returns {T} The debounced value
 *
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 300)
 * // debouncedSearch updates 300ms after the user stops typing
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
