import posthog from 'posthog-js'
import { useAuth } from '../context/AuthContext'

const UPLOAD_FUNNEL_STEPS = {
  PAGE_VISIT: 'upload_page_visit',
  VIEW_FORM: 'upload_form_view',
  FILE_SELECTED: 'upload_file_selected',
  FIELD_FOCUSED: 'upload_field_focused',
  FIELD_FILLED: 'upload_field_filled',
  FIELD_VALIDATED: 'upload_field_validated',
  VALIDATION_ERROR: 'upload_validation_error',
  SUBMIT_ATTEMPT: 'upload_submit_attempt',
  SUBMIT_SUCCESS: 'upload_submit_success',
  UPLOAD_FAILED: 'upload_failed'
}

export const trackUploadEvent = (eventName, properties = {}) => {
  if (!posthog?.isFeatureEnabled) return
  
  posthog.capture(eventName, {
    ...properties,
    $set_once: {
      first_upload_attempt: new Date().toISOString()
    }
  })
}

export const trackUploadPageVisit = () => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.PAGE_VISIT, {
    funnel_step: 1,
    funnel_name: 'paper_upload'
  })
}

export const trackUploadFormView = () => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.VIEW_FORM, {
    funnel_step: 2,
    funnel_name: 'paper_upload'
  })
}

export const trackFileSelected = (fileSize, fileType) => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.FILE_SELECTED, {
    funnel_step: 3,
    funnel_name: 'paper_upload',
    file_size: fileSize,
    file_type: fileType
  })
}

export const trackFieldFocused = (fieldId) => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.FIELD_FOCUSED, {
    field_id: fieldId,
    funnel_name: 'paper_upload'
  })
}

export const trackFieldFilled = (fieldId, isValid) => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.FIELD_FILLED, {
    field_id: fieldId,
    is_valid: isValid,
    funnel_name: 'paper_upload'
  })
}

export const trackValidationError = (fieldId, errorMessage) => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.VALIDATION_ERROR, {
    field_id: fieldId,
    error_message: errorMessage,
    funnel_name: 'paper_upload'
  })
}

export const trackSubmitAttempt = () => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.SUBMIT_ATTEMPT, {
    funnel_step: 6,
    funnel_name: 'paper_upload'
  })
}

export const trackSubmitSuccess = (paperId, durationMs) => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.SUBMIT_SUCCESS, {
    funnel_step: 7,
    funnel_name: 'paper_upload',
    paper_id: paperId,
    upload_duration_ms: durationMs
  })
}

export const trackUploadFailed = (error, durationMs) => {
  trackUploadEvent(UPLOAD_FUNNEL_STEPS.UPLOAD_FAILED, {
    funnel_step: 7,
    funnel_name: 'paper_upload',
    error: error?.message || 'Unknown error',
    error_code: error?.status || 500,
    upload_duration_ms: durationMs
  })
}

export const getUploadFunnelQuery = () => ({
  events: [
    { id: UPLOAD_FUNNEL_STEPS.PAGE_VISIT, name: 'Visit Upload Page' },
    { id: UPLOAD_FUNNEL_STEPS.VIEW_FORM, name: 'View Upload Form' },
    { id: UPLOAD_FUNNEL_STEPS.FILE_SELECTED, name: 'Select File' },
    { id: UPLOAD_FUNNEL_STEPS.FIELD_FILLED, name: 'Complete Required Fields' },
    { id: UPLOAD_FUNNEL_STEPS.SUBMIT_ATTEMPT, name: 'Submit Upload' },
    { id: UPLOAD_FUNNEL_STEPS.SUBMIT_SUCCESS, name: 'Upload Success' }
  ],
  funnelWindow: 3600, // 1 hour window
  dateRange: 'last_14_days'
})

export const UPLOAD_ANALYTICS_CONFIG = {
  enabled: import.meta.env.VITE_POSTHOG_KEY ? true : false,
  dashboardUrl: 'https://app.posthog.com/dashboard/12345',
  projectId: import.meta.env.VITE_POSTHOG_PROJECT_ID
}

export default {
  trackUploadEvent,
  trackUploadPageVisit,
  trackUploadFormView,
  trackFileSelected,
  trackFieldFocused,
  trackFieldFilled,
  trackValidationError,
  trackSubmitAttempt,
  trackSubmitSuccess,
  trackUploadFailed,
  getUploadFunnelQuery
}