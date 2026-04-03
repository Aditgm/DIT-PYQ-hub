import { supabase } from '../lib/supabase';

function normalizeApiUrl(url) {
  return url?.trim().replace(/\/+$/, '') || '';
}

function resolveEnvApiUrl() {
  const rawUrl = import.meta.env.VITE_API_URL?.trim();
  if (!rawUrl) return '';

  if (typeof window !== 'undefined') {
    const isHttpsPage = window.location.protocol === 'https:';
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // If env accidentally uses http in production, prefer https to avoid mixed-content failures.
    if (isHttpsPage && rawUrl.startsWith('http://') && !isLocalHost) {
      return normalizeApiUrl(rawUrl.replace(/^http:\/\//i, 'https://'));
    }
  }

  return normalizeApiUrl(rawUrl);
}

function resolveApiBaseUrl() {
  const envUrl = resolveEnvApiUrl();
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser) {
    return envUrl || '';
  }

  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // In production/staging, always use same-origin /api so Vercel proxy handles routing.
  if (!isLocalHost) {
    return '';
  }

  if (envUrl) {
    return envUrl;
  }

  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

const API_BASE_URL = resolveApiBaseUrl();
const ENV_API_BASE_URL = resolveEnvApiUrl();

/**
 * Fetch messages from Supabase with pagination, sorting, and filters.
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Number of items per page (default: 10)
 * @param {string} params.sortBy - Field to sort by (default: 'created_at')
 * @param {string} params.sortDirection - Sort direction ('asc' or 'desc', default: 'desc')
 * @param {Object} params.filters - Key-value pairs for filtering (e.g., { category: 'technical', status: 'open' })
 * @returns {Promise<{ data: Array, total: number }>} - Messages data and total count
 */
export async function fetchMessages(params = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    filters = {},
  } = params;

  let query = supabase
    .from('messages')
    .select(`
      *,
      response_count:message_responses(count)
    `, { count: 'exact' });

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  });

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data.map(m => ({
      ...m,
      responseCount: m.response_count?.[0]?.count || 0
    })) || [],
    total: count || 0
  };
}

/**
 * Create a new message
 * @param {Object} messageData - Message data
 * @param {string} messageData.subject - Message subject
 * @param {string} messageData.body - Message body
 * @param {string} messageData.category - Message category (general, technical, etc.)
 * @param {string} messageData.priority - Message priority (low, normal, high, urgent)
 * @returns {Promise<Object>} Created message
 */
export async function createMessage(messageData) {
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a single message with responses
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Message with responses
 */
export async function getMessage(messageId) {
  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error || !message) throw new Error('Message not found');

  const { data: responses } = await supabase
    .from('message_responses')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  return {
    ...message,
    responses
  };
}

/**
 * Respond to a message
 * @param {string} messageId - Message ID
 * @param {Object} responseData - Response data
 * @param {string} responseData.body - Response body
 * @returns {Promise<Object>} Created response
 */
export async function respondToMessage(messageId, responseData) {
  const { data, error } = await supabase
    .from('message_responses')
    .insert({
      message_id: messageId,
      ...responseData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update message status (admin only)
 * @param {string} messageId - Message ID
 * @param {Object} statusData - Status update data
 * @param {string} statusData.status - New status
 * @param {string} [statusData.assignedTo] - Assigned admin ID
 * @param {string} [statusData.resolutionNotes] - Resolution notes
 * @returns {Promise<Object>} Updated message
 */
export async function updateMessageStatus(messageId, statusData) {
  const { data, error } = await supabase
    .from('messages')
    .update(statusData)
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}