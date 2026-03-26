import { supabase } from './supabase'

/**
 * Standardized error codes matching HTTP semantics.
 * Used by callers to show appropriate UI messages.
 */
export const PaperServiceError = {
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  UNKNOWN: 'UNKNOWN',
}

/**
 * Maps a Supabase/Postgres error to a PaperServiceError code.
 */
function mapError(error) {
  if (!error) return null

  const msg = error.message || ''
  const code = error.code || ''

  if (code === 'P0002' || msg.includes('Paper not found')) {
    return { code: PaperServiceError.NOT_FOUND, message: 'Paper not found. It may have already been deleted.' }
  }
  if (code === '42501' || msg.includes('admin role required') || msg.includes('row-level security')) {
    return { code: PaperServiceError.FORBIDDEN, message: 'You do not have permission to perform this action.' }
  }
  if (code === '22P02' || msg.includes('invalid input syntax')) {
    return { code: PaperServiceError.BAD_REQUEST, message: 'Invalid paper ID format.' }
  }

  return { code: PaperServiceError.UNKNOWN, message: msg || 'An unexpected error occurred.' }
}

/**
 * Validates that a value is a valid UUID v4 string.
 */
export function isValidUUID(value) {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Deletes a paper. Tries the secure RPC first; if the function hasn't been
 * deployed to Supabase yet, falls back to direct table operations.
 *
 * RPC path (preferred):
 *   Calls public.delete_paper() which is SECURITY DEFINER — verifies admin,
 *   checks existence, deletes with cascade, writes audit log.
 *
 * Fallback path:
 *   1. Fetches the paper to confirm it exists (and get its title)
 *   2. Deletes related downloads (enforced by RLS; requires admin DELETE policy)
 *   3. Deletes the paper itself
 *   4. Inserts an audit log row (if the audit_logs table exists)
 *
 * @param {string} paperId - UUID of the paper to delete
 * @returns {Promise<{ success: boolean, deletedPaperId: string, deletedDownloads: number }>}
 * @throws {{ code: string, message: string }} on failure
 */
export async function deletePaper(paperId) {
  if (!isValidUUID(paperId)) {
    throw { code: PaperServiceError.BAD_REQUEST, message: 'Invalid paper ID format.' }
  }

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_paper', { p_paper_id: paperId })

  if (!rpcError) {
    return rpcData
  }

  // If the function doesn't exist yet, fall back to direct table operations
  const isMissingFunction = rpcError.code === 'PGRST202'
    || (rpcError.message && rpcError.message.includes('delete_paper'))

  if (!isMissingFunction) {
    throw mapError(rpcError)
  }

  // ── Fallback: direct table operations ──────────────────────────
  // ON DELETE CASCADE on downloads.paper_id means deleting the paper
  // automatically removes all related download rows — no manual cleanup needed.

  // 1. Verify the paper exists
  const { data: paper, error: fetchError } = await supabase
    .from('papers')
    .select('id, title')
    .eq('id', paperId)
    .maybeSingle()

  if (fetchError) throw mapError(fetchError)
  if (!paper) throw { code: PaperServiceError.NOT_FOUND, message: 'Paper not found. It may have already been deleted.' }

  // 2. Delete the paper (CASCADE removes related downloads automatically)
  const { error: paperError } = await supabase
    .from('papers')
    .delete()
    .eq('id', paperId)

  if (paperError) throw mapError(paperError)

  // 3. Best-effort audit log (table may not exist yet if schema not applied)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'delete',
        entity_type: 'paper',
        entity_id: paperId,
        metadata: { title: paper.title },
      })
    }
  } catch {
    // audit_logs table may not exist — don't block deletion
  }

  return { success: true, deleted_paper_id: paperId, deleted_downloads: 0 }
}

/**
 * Fetches papers with optional filtering. Used by the admin panel.
 *
 * @param {object} options
 * @param {string} [options.status] - Filter by status (pending/approved/rejected)
 * @param {string} [options.search] - Search in title/subject
 * @param {string} [options.branch] - Filter by branch
 * @param {number} [options.semester] - Filter by semester
 * @param {number} [options.year] - Filter by year
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=10] - Items per page
 * @returns {Promise<{ data: Array, count: number, error: object|null }>}
 */
export async function fetchPapers({ status, search, branch, semester, year, page = 1, limit = 10 } = {}) {
  let query = supabase
    .from('papers')
    .select(`
      *,
      profiles!papers_uploaded_by_fkey(
        full_name,
        email
      )
    `, { count: 'exact' })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    const sanitized = search.replace(/[,()]/g, '')
    query = query.or(`title.ilike.%${sanitized}%,subject.ilike.%${sanitized}%`)
  }

  if (branch) query = query.eq('branch', branch)
  if (semester) query = query.eq('semester', parseInt(semester))
  if (year) query = query.eq('year', parseInt(year))

  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  return query
}

/**
 * Fetches aggregate stats for the admin panel.
 *
 * @returns {Promise<{ total: number, pending: number, approved: number, rejected: number }>}
 */
export async function fetchStats() {
  const [{ count: total }, { count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
    supabase.from('papers').select('*', { count: 'exact', head: true }),
    supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('papers').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ])

  return { total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0 }
}
