/**
 * File type detection helpers.
 * Detects DOCX/DOC from URL extension and provides correct
 * download filename and preview URL logic.
 */

/**
 * Check if a URL points to a DOCX file.
 * @param {string} url
 * @returns {boolean}
 */
export function isDocxUrl(url) {
  return typeof url === 'string' && url.toLowerCase().includes('.docx')
}

/**
 * Check if a URL points to a DOC file.
 * @param {string} url
 * @returns {boolean}
 */
export function isDocUrl(url) {
  return typeof url === 'string' && url.toLowerCase().includes('.doc') && !isDocxUrl(url)
}

/**
 * Get the file extension for a paper based on its URL.
 * Handles both file_url (snake_case) and fileUrl (camelCase).
 * @param {object} paper
 * @returns {string} e.g. '.docx', '.doc', or '.pdf'
 */
export function getFileExtension(paper) {
  const url = paper?.file_url || paper?.fileUrl || ''
  if (isDocxUrl(url)) return '.docx'
  if (isDocUrl(url)) return '.doc'
  return '.pdf'
}

/**
 * Get the MIME type for a paper based on its URL.
 * @param {object} paper
 * @returns {string}
 */
export function getFileMime(paper) {
  const url = paper?.file_url || paper?.fileUrl || ''
  if (isDocxUrl(url)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (isDocUrl(url)) return 'application/msword'
  return 'application/pdf'
}

/**
 * Get the download filename for a paper.
 * @param {object} paper
 * @returns {string}
 */
export function getDownloadFilename(paper) {
  const title = (paper?.title || 'paper').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'paper'
  return title + getFileExtension(paper)
}

/**
 * Check if a paper's file can be previewed inline in the browser.
 * PDFs render natively in iframes. DOCX needs Microsoft's viewer.
 * @param {object} paper
 * @returns {boolean}
 */
export function isPDF(paper) {
  return getFileExtension(paper) === '.pdf'
}

/**
 * Build a preview URL. For DOCX, wraps in Microsoft Office Online viewer.
 * For PDF, returns the original URL.
 * @param {object} paper
 * @returns {string|null}
 */
export function getPreviewUrl(paper) {
  const url = paper?.file_url || paper?.fileUrl
  if (!url) return null

  if (isDocxUrl(url)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
  }

  return url
}

/**
 * Get the MIME type from an uploaded File object.
 * @param {File} file
 * @returns {string}
 */
export function getMimeTypeFromFile(file) {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (name.endsWith('.doc')) return 'application/msword'
  return file.type || 'application/pdf'
}
