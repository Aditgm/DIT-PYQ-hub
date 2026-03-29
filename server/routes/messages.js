import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Middleware to verify authentication
async function verifyAuth(req, res, next) {
  const authToken = getBearerToken(req);
  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const supabase = getAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(authToken);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  req.user = user;
  req.profile = profile;
  req.supabase = supabase;
  next();
}

// Middleware to verify admin
async function verifyAdmin(req, res, next) {
  if (!req.profile || !['admin', 'moderator'].includes(req.profile.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// =============================================================================
// USER ENDPOINTS
// =============================================================================

// POST /api/messages - Create new message
router.post('/messages', verifyAuth, async (req, res) => {
  try {
    const { subject, body, category = 'general', priority = 'normal' } = req.body;
    const { user } = req;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    const validCategories = ['general', 'technical', 'access_issue', 'copyright', 'other'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const { data: message, error } = await req.supabase
      .from('messages')
      .insert({
        user_id: user.id,
        subject,
        body,
        category,
        priority,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;

    // Log creation in audit
    await req.supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'create',
      entity_type: 'message',
      entity_id: message.id,
      new_value: { subject, category }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// GET /api/messages - List user's messages
router.get('/messages', verifyAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const { user } = req;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = req.supabase
      .from('messages')
      .select(`
        *,
        response_count:message_responses(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize) - 1);

    const { data: messages, error } = await query;

    if (error) throw error;

    // Get total count
    const { count } = await req.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    res.json({
      messages: messages.map(m => ({
        ...m,
        responseCount: m.response_count?.[0]?.count || 0
      })),
      total: count || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil((count || 0) / parseInt(pageSize))
    });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

// GET /api/messages/:id - Get single message with responses
router.get('/messages/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Get message
    const { data: message, error } = await req.supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check ownership or admin
    if (message.user_id !== user.id && 
        (!req.profile || !['admin', 'moderator'].includes(req.profile.role))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get responses
    const { data: responses } = await req.supabase
      .from('message_responses')
      .select('*')
      .eq('message_id', id)
      .order('created_at', { ascending: true });

    res.json({
      ...message,
      responses
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
});

// POST /api/messages/:id/respond - User responds to message
router.post('/messages/:id/respond', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const { user } = req;

    if (!body) {
      return res.status(400).json({ error: 'Response body is required' });
    }

    // Verify message exists and user owns it
    const { data: message, error: msgError } = await req.supabase
      .from('messages')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (msgError || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create response
    const { data: response, error } = await req.supabase
      .from('message_responses')
      .insert({
        message_id: id,
        user_id: user.id,
        is_admin_response: false,
        body
      })
      .select()
      .single();

    if (error) throw error;

    // Update message status if was pending_user
    if (message.status === 'pending_user') {
      await req.supabase
        .from('messages')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Respond to message error:', error);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// GET /api/admin/messages - Admin lists all messages
router.get('/admin/messages', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, category, assignedTo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = req.supabase
      .from('messages')
      .select(`
        *,
        user:profiles!messages_user_id_fkey(full_name, email),
        assigned_to_admin:profiles!messages_assigned_to_fkey(full_name),
        response_count:message_responses(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize) - 1);

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);

    const { data: messages, error } = await query;

    if (error) throw error;

    const { count } = await req.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    res.json({
      messages: messages.map(m => ({
        ...m,
        user_name: m.user?.full_name,
        user_email: m.user?.email,
        assigned_to_name: m.assigned_to_admin?.full_name,
        responseCount: m.response_count?.[0]?.count || 0
      })),
      total: count || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('Admin list messages error:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

// PATCH /api/admin/messages/:id/status - Admin updates message status
router.patch('/admin/messages/:id/status', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, resolutionNotes } = req.body;
    const { user } = req;

    const validStatuses = ['open', 'in_progress', 'pending_user', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current message state
    const { data: current, error: currError } = await req.supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (currError || !current) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo || null;
    }
    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
    }
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: message, error } = await req.supabase
      .from('messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await req.supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'update',
      entity_type: 'message',
      entity_id: id,
      old_value: { status: current.status },
      new_value: updateData
    });

    // Create notification for user
    if (current.user_id !== user.id) {
      await req.supabase.from('notifications').insert({
        user_id: current.user_id,
        type: 'status_change',
        title: 'Message Status Updated',
        body: `Your message "${current.subject}" status changed to ${status}`,
        data: { message_id: id, new_status: status }
      });
    }

    res.json(message);
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// POST /api/admin/messages/:id/respond - Admin responds to message
router.post('/admin/messages/:id/respond', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, close = false } = req.body;
    const { user } = req;

    if (!body) {
      return res.status(400).json({ error: 'Response body is required' });
    }

    // Create response
    const { data: response, error } = await req.supabase
      .from('message_responses')
      .insert({
        message_id: id,
        user_id: user.id,
        is_admin_response: true,
        body
      })
      .select()
      .single();

    if (error) throw error;

    // Update message status
    const newStatus = close ? 'resolved' : 'in_progress';
    await req.supabase
      .from('messages')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
        resolved_at: close ? new Date().toISOString() : null
      })
      .eq('id', id);

    // Get message owner
    const { data: message } = await req.supabase
      .from('messages')
      .select('user_id, subject')
      .eq('id', id)
      .single();

    // Notify user
    if (message) {
      await req.supabase.from('notifications').insert({
        user_id: message.user_id,
        type: 'message_reply',
        title: 'New Response to Your Message',
        body: `Admin responded to "${message.subject}"`,
        data: { message_id: id }
      });
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Admin respond error:', error);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

export default router;
