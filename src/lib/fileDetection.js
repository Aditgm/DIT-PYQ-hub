const PAPER_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.odt', '.txt', '.rtf']
const PAPER_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'text/rtf',
]

export const isPaperFile = (file) => {
  if (!file) return false
  
  const name = file.name?.toLowerCase() || ''
  const type = file.type?.toLowerCase() || ''
  
  const hasPaperExtension = PAPER_EXTENSIONS.some(ext => name.endsWith(ext))
  const hasPaperMimeType = PAPER_MIME_TYPES.some(mime => type.includes(mime))
  
  return hasPaperExtension || hasPaperMimeType
}

export const getFileType = (file) => {
  if (!file) return 'unknown'
  if (isPaperFile(file)) return 'paper'
  return 'other'
}

export const PAPER_TYPE = 'paper'
export const OTHER_TYPE = 'other'
export { PAPER_EXTENSIONS, PAPER_MIME_TYPES }

export default isPaperFile