import { z } from 'zod'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

/**
 * Zod schema for the upload form.
 * Validates all text/select fields. File is validated separately
 * because RHF doesn't handle File objects natively.
 */
export const uploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),

  subject: z
    .string()
    .min(1, 'Subject is required'),

  customSubject: z
    .string()
    .optional()
    .default(''),

  branch: z
    .string()
    .min(1, 'Branch is required'),

  semester: z
    .string()
    .min(1, 'Semester is required'),

  examType: z
    .string()
    .min(1, 'Exam type is required'),

  year: z
    .number()
    .int()
    .min(2000, 'Year must be 2000 or later')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),

  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .default(''),
}).refine(
  (data) => data.subject !== 'Other' || (data.customSubject && data.customSubject.trim().length > 0),
  {
    message: 'Please specify your subject',
    path: ['customSubject'],
  }
)

/**
 * Validate a file object outside of RHF.
 * Returns an error string or null if valid.
 */
export function validateFile(file) {
  if (!file) return 'Please upload a PDF or DOCX file'

  const ext = '.' + file.name.split('.').pop().toLowerCase()
  const isValidType = ALLOWED_MIME_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)

  if (!isValidType) return 'Only PDF and DOCX files are allowed'
  if (file.size > MAX_FILE_SIZE) return 'File size must be less than 25MB'
  if (file.size === 0) return 'File is empty'

  return null
}

export { MAX_FILE_SIZE, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES }
