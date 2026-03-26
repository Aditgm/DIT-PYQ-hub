import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:3001`;

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
    response = await fetch(`${API_BASE_URL}/api/download/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paperId, authToken }),
    });
  } catch (err) {
    throw new Error(
      `Download service is unreachable at ${API_BASE_URL}. Start the server (cd server && npm start) or set VITE_API_URL.`
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(error.error || 'Failed to initiate download');
  }

  return response.json();
}

/**
 * Verify a download token.
 * @param {string} token - The download token
 * @returns {Promise<{ valid: boolean, paperId: string, paperTitle: string, expiresAt: string }>}
 */
export async function verifyDownloadToken(token) {
  const response = await fetch(`${API_BASE_URL}/api/download/verify/${token}`);

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
  const response = await fetch(`${API_BASE_URL}/api/download/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, authToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Revocation failed' }));
    throw new Error(error.error || 'Failed to revoke token');
  }

  return response.json();
}