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
 * Fetch paper requests from Supabase with pagination, sorting, and filters.
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Number of items per page (default: 10)
 * @param {string} params.sortBy - Field to sort by (default: 'requested_at')
 * @param {string} params.sortDirection - Sort direction ('asc' or 'desc', default: 'desc')
 * @param {Object} params.filters - Key-value pairs for filtering (e.g., { status: 'pending', degree: 'BTech' })
 * @returns {Promise<{ data: Array, total: number }>} - Requests data and total count
 */
export async function fetchRequests(params = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'requested_at',
    sortDirection = 'desc',
    filters = {},
  } = params;

  let query = supabase
    .from('paper_requests')
    .select('*, related_paper:papers!paper_requests_related_paper_id_fkey(title, file_url)', { count: 'exact' });

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
    data: data || [],
    total: count || 0
  };
}

/**
 * Create a new paper request
 * @param {Object} requestData - Request data
 * @param {string} requestData.paperName - Name of the requested paper
 * @param {string} requestData.paperType - Type of paper (Mid Term, End Term, etc.)
 * @param {string} requestData.degree - Degree type (BTech, BArch, etc.)
 * @param {string} [requestData.branch] - Branch/specialization
 * @param {number} [requestData.semester] - Semester number (1-8)
 * @param {number} [requestData.year] - Year of exam
 * @param {string} [requestData.description] - Additional description
 * @returns {Promise<Object>} Created request
 */
export async function createRequest(requestData) {
  const { data, error } = await supabase
    .from('paper_requests')
    .insert(requestData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a single request with related paper info
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Request with related paper data
 */
export async function getRequest(requestId) {
  const { data, error } = await supabase
    .from('paper_requests')
    .select('*, related_paper:papers!paper_requests_related_paper_id_fkey(*)')
    .eq('id', requestId)
    .single();

  if (error || !data) throw new Error('Request not found');
  return data;
}

/**
 * Update request status (admin only)
 * @param {string} requestId - Request ID
 * @param {Object} statusData - Status update data
 * @param {string} statusData.status - New status (pending, in_progress, fulfilled, rejected, cancelled)
 * @param {string} [statusData.relatedPaperId] - Related paper ID if fulfilled
 * @param {string} [statusData.notes] - Admin notes
 * @returns {Promise<Object>} Updated request
 */
export async function updateRequestStatus(requestId, statusData) {
  const { data, error } = await supabase
    .from('paper_requests')
    .update(statusData)
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel own request (only if pending)
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Success indicator
 */
export async function cancelRequest(requestId) {
  const { data, error } = await supabase
    .from('paper_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}