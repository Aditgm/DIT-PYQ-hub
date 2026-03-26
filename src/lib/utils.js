// Sanitize search input to prevent pattern injection in ILIKE queries
// Escapes special characters: % (wildcard), _ (single char), backslash
export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return ''
  return query
    .replace(/\\/g, '\\\\')  // Escape existing backslashes first
    .replace(/%/g, '\\%')       // Escape percent wildcard
    .replace(/_/g, '\\_')       // Escape underscore wildcard
}
