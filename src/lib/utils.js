// Sanitize search input to prevent pattern injection in ILIKE queries
// Escapes special characters: % (wildcard), _ (single char), backslash
export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return ''
  return query
    .replace(/\\/g, '\\\\')  // Escape existing backslashes first
    .replace(/%/g, '\\%')       // Escape percent wildcard
    .replace(/_/g, '\\_')       // Escape underscore wildcard
}

// Format bytes to human-readable size
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  if (!bytes) return ''
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
