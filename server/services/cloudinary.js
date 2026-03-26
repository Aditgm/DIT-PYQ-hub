import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

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
};

export function buildWatermarkText(token, timestamp, downloaderName = '') {
  const safeName = (downloaderName || '').trim();
  return safeName
    ? `${WATERMARK_CONFIG.text} | ${safeName} | ${timestamp}`
    : `${WATERMARK_CONFIG.text} | ${timestamp}`;
}

export function generateWatermarkedPdfUrl(publicId, watermarkText, useSigned = true, format = 'pdf') {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is missing. Set CLOUDINARY_CLOUD_NAME in server/.env');
  }

  const cleanPublicId = (publicId || '').replace(/\.(pdf|docx?|txt)$/i, '');
  const hasSigningSecret = !!process.env.CLOUDINARY_API_SECRET
    && process.env.CLOUDINARY_API_SECRET !== 'YOUR_API_SECRET_HERE';
  const shouldSign = useSigned && hasSigningSecret;

  // DOC/DOCX cannot be reliably watermarked through this raw delivery path.
  // Return a signed direct URL instead.
  if (format && format.toLowerCase() !== 'pdf') {
    return cloudinary.url(cleanPublicId, {
      resource_type: 'raw',
      type: 'upload',
      secure: true,
      sign_url: shouldSign,
      format,
    });
  }

  const transformation = [
    {
      overlay: {
        font_family: WATERMARK_CONFIG.fontFamily,
        font_size: WATERMARK_CONFIG.fontSize,
        text: watermarkText,
      },
      color: WATERMARK_CONFIG.fontColor,
      opacity: WATERMARK_CONFIG.textOpacity,
      gravity: WATERMARK_CONFIG.gravity,
      y_offset: WATERMARK_CONFIG.yOffset,
      x_offset: WATERMARK_CONFIG.xOffset,
      width: 800,
      crop: 'scale',
    },
  ];

  return cloudinary.url(cleanPublicId, {
    resource_type: 'raw',
    type: 'upload',
    secure: true,
    sign_url: shouldSign,
    transformation,
    format: 'pdf',
  });
}

export function generateSignedUrl(publicId, options = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    timestamp,
    ...options
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    cloudName: CLOUD_NAME,
    publicId
  };
}

export async function validateCloudinaryConfig() {
  try {
    const result = await cloudinary.api.ping();
    return { connected: true, version: result.version };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export default cloudinary;
