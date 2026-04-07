/**
 * File type detection helpers.
 * Detects DOCX/DOC from URL extension and provides correct
 * download filename and preview URL logic.
 */

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME = 'application/msword'
const PDF_MIME = 'application/pdf'

function getFileSignals(input) {
  if (typeof input === 'string') {
    return { url: input.toLowerCase(), mime: '', name: '' }
  }

  const url = (input?.file_url || input?.fileUrl || '').toLowerCase()
  const mime = (input?.file_type || input?.fileType || input?.mime_type || input?.mimeType || '').toLowerCase()
  const name = (input?.file_name || input?.fileName || input?.name || '').toLowerCase()

  return { url, mime, name }
}

/**
 * Check if a file points to a DOCX document.
 * Accepts either a URL string or a paper/file-like object.
 * @param {string|object} input
 * @returns {boolean}
 */
export function isDocxUrl(input) {
  const { url, mime, name } = getFileSignals(input)
  return mime === DOCX_MIME || url.includes('.docx') || name.endsWith('.docx')
}

/**
 * Check if a file points to a DOC document.
 * Accepts either a URL string or a paper/file-like object.
 * @param {string|object} input
 * @returns {boolean}
 */
export function isDocUrl(input) {
  const { url, mime, name } = getFileSignals(input)
  return mime === DOC_MIME || ((url.includes('.doc') || name.endsWith('.doc')) && !isDocxUrl(input))
}

/**
 * Get the file extension for a paper based on its URL.
 * Handles both file_url (snake_case) and fileUrl (camelCase).
 * @param {object} paper
 * @returns {string} e.g. '.docx', '.doc', or '.pdf'
 */
export function getFileExtension(paper) {
  if (isDocxUrl(paper)) return '.docx'
  if (isDocUrl(paper)) return '.doc'
  return '.pdf'
}

/**
 * Get the MIME type for a paper based on its URL.
 * @param {object} paper
 * @returns {string}
 */
export function getFileMime(paper) {
  if (isDocxUrl(paper)) return DOCX_MIME
  if (isDocUrl(paper)) return DOC_MIME
  return PDF_MIME
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
  const { mime } = getFileSignals(paper)
  return mime === PDF_MIME || getFileExtension(paper) === '.pdf'
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

  if (isDocxUrl(paper) || isDocUrl(paper)) {
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
  if (name.endsWith('.docx')) return DOCX_MIME
  if (name.endsWith('.doc')) return DOC_MIME
  return file.type || PDF_MIME
}
