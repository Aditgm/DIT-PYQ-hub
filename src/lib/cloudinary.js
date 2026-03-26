const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn(
    'Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET. ' +
    'File uploads will fail. Add them to your .env file.'
  )
}

export const WATERMARK_CONFIG = {
  text: 'Downloaded from DIT PYQ Hub',
  fontFamily: 'Arial',
  fontSize: 40,
  fontColor: '#ffffff',
  textOpacity: 40,
  gravity: 'south',
  yOffset: 50,
  xOffset: 0,
  background: '#000000',
  backgroundOpacity: 30
}

/**
 * Upload file to Cloudinary using the /raw/upload endpoint.
 *
 * PDFs are uploaded as raw resources so the original file format is preserved.
 * Raw resources serve the file as-is with the correct Content-Type, making
 * downloads and inline viewing work reliably without needing transformations.
 *
 * The upload_preset must be configured for raw uploads in the Cloudinary dashboard:
 *   Settings → Upload → Upload presets → Edit your preset → set Resource type to "Raw"
 */
export const uploadToCloudinary = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText)
        resolve({ url: res.secure_url, publicId: res.public_id })
      } else {
        let message = `Upload failed: ${xhr.status}`
        try {
          const err = JSON.parse(xhr.responseText)
          if (err?.error?.message) message = err.error.message
        } catch (_) {}
        reject(new Error(message))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`)
    xhr.send(formData)
  })
}

/**
 * Get the canonical download URL. For raw uploads, the original URL
 * already serves the PDF directly.
 */
export const getCloudinaryDownloadUrl = (fileUrl) => {
  return fileUrl
}

/**
 * Get fallback download URL. Same as the original URL for raw uploads.
 */
export const getCloudinaryFallbackDownloadUrl = (fileUrl) => {
  return fileUrl
}

/**
 * Get a Cloudinary URL for inline PDF display in the browser.
 * For raw uploads, the original URL serves the PDF with proper Content-Type.
 */
export const getCloudinaryInlineUrl = (fileUrl) => {
  return fileUrl
}

/**
 * Get a Cloudinary URL for previewing the first page of a PDF as an image.
 * Uses Cloudinary's URL transformation: appending .jpg to the PDF URL.
 * 
 * NOTE: This requires the Cloudinary upload preset to be configured to allow
 * image transformations on raw PDF files. In Cloudinary dashboard:
 *   Settings → Upload → Upload presets → Edit your preset → 
 *   Set "Incoming transformation" to allow PDF to image conversion
 *   OR use the "auto" resource type instead of "raw".
 * 
 * @param {string} fileUrl - The Cloudinary URL of the PDF
 * @param {object} options - Transformation options
 * @param {number} options.width - Output width (default: 200)
 * @param {number} options.height - Output height (default: 260)
 * @param {number} options.quality - JPEG quality 1-100 (default: 80)
 * @returns {string|null} - Transformed thumbnail URL or null if invalid
 */
export const getCloudinaryThumbnailUrl = (fileUrl, options = {}) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null
  
  const { width = 200, height = 260, quality = 80 } = options
  
  if (!fileUrl.includes('cloudinary.com')) {
    return null
  }

  if (!fileUrl.toLowerCase().endsWith('.pdf')) {
    return null
  }
  
  const hasTransformation = fileUrl.includes('/upload/')
  
  if (hasTransformation) {
    const uploadIndex = fileUrl.indexOf('/upload/')
    const baseUrl = fileUrl.substring(0, uploadIndex + 8)
    const restPath = fileUrl.substring(uploadIndex + 8)
    return `${baseUrl}f_jpg,q_${quality},w_${width},h_${height}/${restPath}`
  }
  
  const lastDotIndex = fileUrl.lastIndexOf('.')
  if (lastDotIndex === -1) return null
  
  const baseUrl = fileUrl.substring(0, lastDotIndex)
  return `${baseUrl}.jpg?f_jpg,q_${quality},w_${width},h_${height}`
}

/**
 * Check if a Cloudinary URL is a raw resource.
 */
export const isRawResourceUrl = (fileUrl) => {
  return !!(fileUrl && fileUrl.includes('/raw/'))
}

/**
 * Check if a Cloudinary URL is an image resource (can have transformations applied).
 */
export const isImageResourceUrl = (fileUrl) => {
  return fileUrl && fileUrl.includes('/image/')
}

/**
 * Check if a Cloudinary URL is a PDF.
 */
export const isPdfUrl = (fileUrl) => {
  return typeof fileUrl === 'string' && fileUrl.toLowerCase().includes('.pdf')
}

/**
 * Check if thumbnail generation is possible for a given URL.
 * Returns true if the URL is a Cloudinary PDF that can be transformed.
 */
export const canGenerateThumbnail = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return false
  if (!fileUrl.includes('cloudinary.com')) return false
  if (isRawResourceUrl(fileUrl)) return false
  return isPdfUrl(fileUrl)
}
