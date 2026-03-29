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

// POST /api/requests - Create new paper request
router.post('/requests', verifyAuth, async (req, res) => {
  try {
    const { 
      paperName, 
      paperType, 
      degree, 
      branch, 
      semester, 
      year, 
      description 
    } = req.body;
    const { user } = req;

    // Validate required fields
    if (!paperName || !paperType || !degree) {
      return res.status(400).json({ 
        error: 'paperName, paperType, and degree are required' 
      });
    }

    // Validate degree
    const validDegrees = ['BTech', 'BArch', 'BCA', 'MCA', 'MTech'];
    if (!validDegrees.includes(degree)) {
      return res.status(400).json({ error: 'Invalid degree type' });
    }

    // Validate semester if provided
    if (semester && (semester < 1 || semester > 8)) {
      return res.status(400).json({ error: 'Semester must be between 1 and 8' });
    }

    const { data: request, error } = await req.supabase
      .from('paper_requests')
      .insert({
        user_id: user.id,
        paper_name: paperName,
        paper_type: paperType,
        degree,
        branch,
        semester,
        year,
        description,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(request);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create paper request' });
  }
});

// GET /api/requests - List user's paper requests
router.get('/requests', verifyAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const { user } = req;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = req.supabase
      .from('paper_requests')
      .select('*, related_paper:papers!paper_requests_related_paper_id_fkey(title, file_url)')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    const { count } = await req.supabase
      .from('paper_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    res.json({
      requests,
      total: count || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil((count || 0) / parseInt(pageSize))
    });
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ error: 'Failed to list paper requests' });
  }
});

// GET /api/requests/:id - Get single request
router.get('/requests/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const { data: request, error } = await req.supabase
      .from('paper_requests')
      .select('*, related_paper:papers!paper_requests_related_paper_id_fkey(*)')
      .eq('id', id)
      .single();

    if (error || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check ownership or admin
    if (request.user_id !== user.id && 
        (!req.profile || !['admin', 'moderator'].includes(req.profile.role))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Failed to get request' });
  }
});

// DELETE /api/requests/:id - Cancel own request
router.delete('/requests/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Verify ownership
    const { data: existing, error: checkError } = await req.supabase
      .from('paper_requests')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (existing.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    const { error } = await req.supabase
      .from('paper_requests')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// GET /api/admin/requests - Admin lists all requests
router.get('/admin/requests', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, degree, branch } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = req.supabase
      .from('paper_requests')
      .select(`
        *,
        user:profiles!paper_requests_user_id_fkey(full_name, email),
        fulfiller:profiles!paper_requests_fulfilled_by_fkey(full_name)
      `)
      .order('requested_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize) - 1);

    if (status) query = query.eq('status', status);
    if (degree) query = query.eq('degree', degree);
    if (branch) query = query.eq('branch', branch);

    const { data: requests, error } = await query;

    if (error) throw error;

    const { count } = await req.supabase
      .from('paper_requests')
      .select('*', { count: 'exact', head: true });

    res.json({
      requests: requests.map(r => ({
        ...r,
        user_name: r.user?.full_name,
        user_email: r.user?.email,
        fulfiller_name: r.fulfiller?.full_name
      })),
      total: count || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('Admin list requests error:', error);
    res.status(500).json({ error: 'Failed to list requests' });
  }
});

// PATCH /api/admin/requests/:id/status - Admin updates request status
router.patch('/admin/requests/:id/status', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, relatedPaperId, notes } = req.body;
    const { user } = req;

    const validStatuses = ['pending', 'in_progress', 'fulfilled', 'rejected', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current request
    const { data: current, error: currError } = await req.supabase
      .from('paper_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (currError || !current) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const updateData = {
      status,
      notes
    };

    if (status === 'fulfilled') {
      updateData.fulfilled_at = new Date().toISOString();
      updateData.fulfilled_by = user.id;
      updateData.related_paper_id = relatedPaperId || null;
    }

    const { data: request, error } = await req.supabase
      .from('paper_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await req.supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'resolve',
      entity_type: 'paper_request',
      entity_id: id,
      old_value: { status: current.status },
      new_value: updateData
    });

    // Notify user
    if (current.user_id !== user.id) {
      let title, body;
      
      if (status === 'fulfilled') {
        title = 'Paper Request Fulfilled';
        body = `Your request for "${current.paper_name}" has been fulfilled!`;
      } else if (status === 'rejected') {
        title = 'Paper Request Rejected';
        body = `Your request for "${current.paper_name}" was not fulfilled.`;
      } else {
        title = 'Paper Request Updated';
        body = `Your request for "${current.paper_name}" status changed to ${status}`;
      }

      await req.supabase.from('notifications').insert({
        user_id: current.user_id,
        type: status === 'fulfilled' ? 'paper_available' : 'status_change',
        title,
        body,
        data: { request_id: id, new_status: status, paper_id: relatedPaperId }
      });
    }

    res.json(request);
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// GET /api/admin/requests/stats - Admin request statistics
router.get('/admin/requests/stats', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { data: stats, error } = await req.supabase
      .from('paper_requests')
      .select('status, degree');

    if (error) throw error;

    // Calculate stats
    const statusCounts = stats.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const degreeCounts = stats.reduce((acc, r) => {
      acc[r.degree] = (acc[r.degree] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total: stats.length,
      byStatus: statusCounts,
      byDegree: degreeCounts
    });
  } catch (error) {
    console.error('Get request stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
