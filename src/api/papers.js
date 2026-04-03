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
 * Build the download-file URL client-side so it routes through the Vercel
 * rewrite proxy in production (relative "/api/…" path) instead of using
 * the server-provided URL which may contain the server's private IP.
 * @param {string} token - Download token returned by /api/download/initiate
 * @returns {string} The full URL to fetch the watermarked file from
 */
export function buildDownloadFileUrl(token) {
  return `${API_BASE_URL}/api/download/file/${token}`;
}

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
    const errorMessage = responseData?.error || (
      response.status === 404
        ? 'Download API endpoint not found. Verify /api/download proxy deployment and API_SERVER_URL.'
        : 'Failed to initiate download'
    );
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

/**
 * Update paper metadata only (no file changes)
 * @param {string} paperId - Paper UUID
 * @param {Object} metadata - Metadata fields to update
 * @param {string} editReason - Reason for the edit
 * @param {number} expectedVersion - Current record version for optimistic locking
 * @returns {Promise<Object>} Updated paper and version info
 */
export async function updatePaperMetadata(paperId, metadata, editReason, expectedVersion) {
  const { data: currentPaper, error: fetchError } = await supabase
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (fetchError) throw fetchError;

  if (currentPaper.record_version !== expectedVersion) {
    throw new Error('Concurrent edit detected. This paper was modified by someone else.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    throw new Error('Not authorized to edit paper metadata');
  }

  const allowedFields = ['title', 'subject', 'degree', 'branch', 'semester', 'year', 'exam_type', 'description'];
  const filteredMetadata = {};
  
  allowedFields.forEach(field => {
    if (metadata[field] !== undefined) {
      filteredMetadata[field] = metadata[field];
    }
  });
  
  if (profile?.role !== 'admin') {
    throw new Error('Not authorized to edit paper metadata');
  }

  const { data: updatedPaper, error: updateError } = await supabase
    .from('papers')
    .update({
      ...filteredMetadata,
      last_edited_by: user.id
    })
    .eq('id', paperId)
    .select()
    .single();

  if (updateError) throw updateError;

  const nextVersion = (await supabase
    .from('paper_versions')
    .select('version_number')
    .eq('paper_id', paperId)
    .order('version_number', { ascending: false })
    .limit(1)).data[0]?.version_number + 1 || 1;

  const { error: versionError } = await supabase
    .from('paper_versions')
    .insert({
      paper_id: paperId,
      version_number: nextVersion,
      metadata: filteredMetadata,
      edited_by: user.id,
      edit_reason: editReason,
      change_type: 'post_upload_edit'
    });

  if (versionError) throw versionError;

  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'metadata_edit',
    paper_id: paperId,
    change_details: filteredMetadata,
    previous_value: currentPaper,
    new_value: updatedPaper
  });

  return {
    success: true,
    paper: updatedPaper,
    version: {
      version_number: nextVersion,
      edited_at: new Date().toISOString(),
      edited_by: user.id
    }
  };
}

/**
 * Approve a paper with optional metadata changes
 * @param {string} paperId - Paper UUID
 * @param {Object} metadata - Optional metadata updates
 * @param {string} approvalNote - Approval note
 * @param {string} editReason - Reason for any metadata changes
 * @param {number} expectedVersion - Current record version
 * @returns {Promise<Object>} Approved paper data
 */
export async function approvePaper(paperId, metadata = {}, approvalNote = '', editReason = '', expectedVersion) {
  const { data: currentPaper, error: fetchError } = await supabase
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (fetchError) throw fetchError;

  if (currentPaper.record_version !== expectedVersion) {
    throw new Error('Concurrent edit detected. This paper was modified by someone else.');
  }

  const { data: { user } } = await supabase.auth.getUser();

  const allowedFields = ['title', 'subject', 'degree', 'branch', 'semester', 'year', 'exam_type', 'description'];
  const filteredMetadata = {};
  
  allowedFields.forEach(field => {
    if (metadata[field] !== undefined) {
      filteredMetadata[field] = metadata[field];
    }
  });

  const { data: approvedPaper, error: updateError } = await supabase
    .from('papers')
    .update({
      ...filteredMetadata,
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      last_edited_by: user.id
    })
    .eq('id', paperId)
    .select()
    .single();

  if (updateError) throw updateError;

  if (Object.keys(filteredMetadata).length > 0) {
    const nextVersion = (await supabase
      .from('paper_versions')
      .select('version_number')
      .eq('paper_id', paperId)
      .order('version_number', { ascending: false })
      .limit(1)).data[0]?.version_number + 1 || 1;

    await supabase.from('paper_versions').insert({
      paper_id: paperId,
      version_number: nextVersion,
      metadata: filteredMetadata,
      edited_by: user.id,
      edit_reason: editReason || 'Metadata edited during approval',
      change_type: 'approval_edit'
    });
  }

  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'approve_paper',
    paper_id: paperId,
    change_details: { status: 'approved', approvalNote, metadata }
  });

  return { success: true, paper: approvedPaper };
}

/**
 * Reject a paper with optional metadata changes
 * @param {string} paperId - Paper UUID
 * @param {string} rejectionReason - Reason for rejection
 * @param {Object} metadata - Optional metadata updates
 * @param {number} expectedVersion - Current record version
 * @returns {Promise<Object>} Rejected paper data
 */
export async function rejectPaper(paperId, rejectionReason, metadata = {}, expectedVersion) {
  const { data: currentPaper, error: fetchError } = await supabase
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (fetchError) throw fetchError;

  if (currentPaper.record_version !== expectedVersion) {
    throw new Error('Concurrent edit detected. This paper was modified by someone else.');
  }

  const { data: { user } } = await supabase.auth.getUser();

  const allowedFields = ['title', 'subject', 'degree', 'branch', 'semester', 'year', 'exam_type', 'description'];
  const filteredMetadata = {};
  
  allowedFields.forEach(field => {
    if (metadata[field] !== undefined) {
      filteredMetadata[field] = metadata[field];
    }
  });

  const { data: rejectedPaper, error: updateError } = await supabase
    .from('papers')
    .update({
      ...filteredMetadata,
      status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_at: new Date().toISOString(),
      last_edited_by: user.id
    })
    .eq('id', paperId)
    .select()
    .single();

  if (updateError) throw updateError;

  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'reject_paper',
    paper_id: paperId,
    change_details: { status: 'rejected', rejectionReason, metadata }
  });

  return { success: true, paper: rejectedPaper };
}

/**
 * Get complete version history for a paper
 * @param {string} paperId - Paper UUID
 * @returns {Promise<Array>} Version history with diffs
 */
export async function getPaperVersionHistory(paperId) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    throw new Error('Not authorized to view version history');
  }

  const { data: versions, error } = await supabase
    .from('paper_versions')
    .select(`
      *,
      profiles!edited_by(name, email)
    `)
    .eq('paper_id', paperId)
    .order('version_number', { ascending: true });

  if (error) throw error;

  const versionsWithDiffs = versions.map((version, index) => {
    if (index === 0) {
      return { ...version, diff: null };
    }
    
    const prevVersion = versions[index - 1];
    const diff = {};
    
    Object.keys(version.metadata).forEach(key => {
      if (JSON.stringify(version.metadata[key]) !== JSON.stringify(prevVersion.metadata[key])) {
        diff[key] = {
          old: prevVersion.metadata[key],
          new: version.metadata[key]
        };
      }
    });

    return { ...version, diff };
  });

  return versionsWithDiffs;
}
