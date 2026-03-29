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

function allowEnvFallbackInBrowser() {
  if (typeof window === 'undefined') return true;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function getApiBaseCandidates() {
  const candidates = [API_BASE_URL];

  // Keep direct env host fallback for local development only.
  if (allowEnvFallbackInBrowser() && !candidates.includes(ENV_API_BASE_URL) && ENV_API_BASE_URL) {
    candidates.push(ENV_API_BASE_URL);
  }

  return candidates.filter((value, index, arr) => arr.indexOf(value) === index);
}

async function fetchWithApiFallback(path, options) {
  const bases = getApiBaseCandidates();
  let lastResponse = null;
  let lastError = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, options);

      if (response.status === 404 && bases.length > 1 && base !== bases[bases.length - 1]) {
        lastResponse = response;
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Download service is unreachable');
}

/**
 * Fetch papers from Supabase with pagination, sorting, and filters.
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Number of items per page (default: 10)
 * @param {string} params.sortBy - Field to sort by (default: 'created_at')
 * @param {string} params.sortDirection - Sort direction ('asc' or 'desc', default: 'desc')
 * @param {Object} params.filters - Key-value pairs for filtering (e.g., { branch: 'CS', semester: 5 })
 * @param {string} params.search - Search term for title or description
 * @returns {Promise<{ data: Array, total: number }>} - Papers data and total count
 */
export async function fetchPapers(params = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortDirection = 'desc',
    filters = {},
    search = '',
  } = params;

  let query = supabase.from('papers').select('*', { count: 'exact' });

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  });

  // Apply search
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

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

  return { data: data || [], total: count || 0 };
}

/**
 * Initiate a watermarked PDF download.
 * @param {string} paperId - The paper UUID
 * @param {string} authToken - Supabase auth token
 * @returns {Promise<{ downloadUrl: string, token: string, expiresAt: string, filename: string }>}
 */
export async function initiateDownload(paperId, authToken) {
  let response;

  try {
    response = await fetchWithApiFallback('/api/download/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ paperId }),
    });
  } catch (err) {
    throw new Error(
      `Download service is unreachable. For local dev, start the server (cd server && npm start). For production, verify /api/download proxy and API_SERVER_URL.`
    );
  }

  const responseData = await response.json().catch(() => null);
  
  if (!response.ok) {
    const errorMessage = response.status === 404
      ? 'Download API endpoint not found. Verify /api/download proxy deployment and API_SERVER_URL.'
      : (responseData?.error || 'Failed to initiate download');
    const error = new Error(errorMessage);
    error.status = response.status;
    error.nextAvailableTime = responseData?.nextAvailableTime;
    throw error;
  }

  if (!responseData) {
    throw new Error('Invalid response from download service');
  }

  return responseData;
}

/**
 * Verify a download token.
 * @param {string} token - The download token
 * @returns {Promise<{ valid: boolean, paperId: string, paperTitle: string, expiresAt: string }>}
 */
export async function verifyDownloadToken(token) {
  const response = await fetchWithApiFallback(`/api/download/verify/${token}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(error.error || 'Failed to verify token');
  }

  return response.json();
}

/**
 * Revoke a download token.
 * @param {string} token - The download token
 * @param {string} authToken - Supabase auth token
 * @returns {Promise<{ success: boolean, revoked: boolean }>}
 */
export async function revokeDownloadToken(token, authToken) {
  const response = await fetchWithApiFallback('/api/download/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Revocation failed' }));
    throw new Error(error.error || 'Failed to revoke token');
  }

  return response.json();
}