import { supabase } from '../../lib/supabase'

export const ISSUE_CATEGORIES = [
  { value: 'blurry_scan', label: 'Blurry Scan', priority: 'medium' },
  { value: 'wrong_syllabus', label: 'Wrong Syllabus', priority: 'high' },
  { value: 'wrong_document', label: 'Wrong Document', priority: 'high' },
  { value: 'missing_pages', label: 'Missing Pages', priority: 'medium' },
  { value: 'other', label: 'Other', priority: 'low' },
]

export const ISSUE_STATUSES = ['new', 'in_progress', 'resolved', 'reopened']
export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical']

const MAX_ATTACHMENTS = 3
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_ATTACHMENT_TYPES = [
  'image/png', 'image/jpeg', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * Create a new issue with optional attachments.
 *
 * @param {{ paper_id: string, category: string, description: string, attachments?: File[] }} data
 * @returns {Promise<{ success: boolean, issue?: object, error?: string }>}
 */
export async function createIssue({ paper_id, category, description, attachments = [] }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Validate attachments
    if (attachments.length > MAX_ATTACHMENTS) {
      throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`)
    }
    for (const file of attachments) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        throw new Error(`Attachment "${file.name}" exceeds 5MB limit`)
      }
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        throw new Error(`Attachment "${file.name}" has unsupported type`)
      }
    }

    // Determine priority from category
    const catConfig = ISSUE_CATEGORIES.find(c => c.value === category)
    const priority = catConfig?.priority || 'medium'

    // Create issue
    const { data: issue, error: issueError } = await supabase
      .from('issues')
      .insert({
        user_id: user.id,
        paper_id,
        category,
        description: description?.trim() || null,
        status: 'new',
        priority,
      })
      .select()
      .single()

    if (issueError) throw issueError

    // Log activity
    await supabase.from('issue_activity').insert({
      issue_id: issue.id,
      actor_id: user.id,
      action: 'created',
      details: { category, priority },
    })

    // Upload attachments
    for (const file of attachments) {
      const path = `issues/${issue.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('issue-attachments')
        .upload(path, file)

      if (uploadError) {
        console.error('Attachment upload failed:', uploadError)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('issue-attachments')
        .getPublicUrl(path)

      await supabase.from('issue_attachments').insert({
        issue_id: issue.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      })
    }

    return { success: true, issue }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetch issues with optional filters (admin view).
 */
export async function fetchIssues({ status, category, priority, assignedTo, page = 1, limit = 20 } = {}) {
  let query = supabase
    .from('issues')
    .select(`
      *,
      reporter:profiles!issues_user_id_fkey(full_name, email),
      assignee:profiles!issues_assigned_admin_id_fkey(full_name, email),
      paper:papers(id, title, subject),
      attachments:issue_attachments(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (category && category !== 'all') query = query.eq('category', category)
  if (priority && priority !== 'all') query = query.eq('priority', priority)
  if (assignedTo) query = query.eq('assigned_admin_id', assignedTo)

  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  return query
}

/**
 * Fetch a single issue with full details.
 */
export async function fetchIssue(issueId) {
  return supabase
    .from('issues')
    .select(`
      *,
      reporter:profiles!issues_user_id_fkey(full_name, email),
      assignee:profiles!issues_assigned_admin_id_fkey(full_name, email),
      paper:papers(id, title, subject, file_url),
      attachments:issue_attachments(*),
      activity:issue_activity(
        *,
        actor:profiles(full_name, email)
      )
    `)
    .eq('id', issueId)
    .single()
}

/**
 * Fetch user's own issues.
 */
export async function fetchMyIssues() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  return supabase
    .from('issues')
    .select(`
      *,
      paper:papers(id, title, subject),
      attachments:issue_attachments(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
}

/**
 * Update issue status (admin).
 */
export async function updateIssueStatus(issueId, newStatus, comment = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issueId)

    if (error) throw error

    const details = { status: newStatus }
    if (comment) details.comment = comment

    await supabase.from('issue_activity').insert({
      issue_id: issueId,
      actor_id: user.id,
      action: `status_changed_to_${newStatus}`,
      details,
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Assign issue to admin.
 */
export async function assignIssue(issueId, adminId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('issues')
      .update({ assigned_admin_id: adminId })
      .eq('id', issueId)

    if (error) throw error

    await supabase.from('issue_activity').insert({
      issue_id: issueId,
      actor_id: user.id,
      action: 'assigned',
      details: { assigned_to: adminId },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Add admin comment to issue.
 */
export async function addIssueComment(issueId, comment) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    await supabase.from('issue_activity').insert({
      issue_id: issueId,
      actor_id: user.id,
      action: 'comment',
      details: { comment },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Update issue priority (admin).
 */
export async function updateIssuePriority(issueId, newPriority) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('issues')
      .update({ priority: newPriority })
      .eq('id', issueId)

    if (error) throw error

    await supabase.from('issue_activity').insert({
      issue_id: issueId,
      actor_id: user.id,
      action: 'priority_changed',
      details: { priority: newPriority },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
