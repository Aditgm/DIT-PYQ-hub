import express from 'express';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { validateBody, validateQuery, uuidSchema, optionalUuidSchema } from '../middleware/validation.js';

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

// Configure web-push with VAPID keys
function configureWebPush() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:admin@ditpyqhub.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
}

configureWebPush();

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
// NOTIFICATION SUBSCRIPTION
// =============================================================================

// POST /api/notifications/subscribe - Subscribe to push notifications
router.post('/notifications/subscribe', verifyAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const { user } = req;

    if (!endpoint || !keys) {
      return res.status(400).json({ error: 'Endpoint and keys are required' });
    }

    // Check if already subscribed
    const { data: existing } = await req.supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      return res.json({ success: true, message: 'Already subscribed' });
    }

    // Save subscription
    const { data: subscription, error } = await req.supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint,
        keys,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Send welcome notification
    try {
      await webpush.sendNotification(
        { endpoint, keys: JSON.parse(JSON.stringify(keys)) },
        JSON.stringify({
          title: 'Notifications Enabled',
          body: 'You will now receive push notifications from DIT PYQ Hub',
          icon: '/icons/icon-192x192.png'
        })
      );
    } catch (pushError) {
      console.warn('Welcome notification failed:', pushError.message);
    }

    res.status(201).json({ success: true, subscription });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// DELETE /api/notifications/unsubscribe - Unsubscribe from push notifications
router.delete('/notifications/unsubscribe', verifyAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const { user } = req;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const { error } = await req.supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// =============================================================================
// IN-APP NOTIFICATIONS
// =============================================================================

// GET /api/notifications - Get user's notifications
router.get('/notifications', verifyAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, unreadOnly } = req.query;
    const { user } = req;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let query = req.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize) - 1);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    const { count } = await req.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: unreadCount } = await req.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    res.json({
      notifications,
      total: count || 0,
      unreadCount: unreadCount || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const { error } = await req.supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/notifications/read-all', verifyAuth, async (req, res) => {
  try {
    const { user } = req;

    const { error } = await req.supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// =============================================================================
// ADMIN BROADCAST
// =============================================================================

// POST /api/notifications/broadcast - Admin sends broadcast
router.post('/notifications/broadcast', verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { title, body, type = 'system', targetDegrees, targetRoles } = req.body;
    const { user } = req;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // Build target user query
    let userQuery = req.supabase
      .from('profiles')
      .select('id');

    if (targetRoles && targetRoles.length > 0) {
      userQuery = userQuery.in('role', targetRoles);
    }

    const { data: targetUsers, error: usersError } = await userQuery;
    if (usersError) throw usersError;

    // Create in-app notifications
    const notifications = targetUsers.map(u => ({
      user_id: u.id,
      type: type || 'system',
      title,
      body,
      data: { broadcast: true }
    }));

    const { error: insertError } = await req.supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    // Send push notifications to active subscriptions
    if (process.env.VAPID_PUBLIC_KEY) {
      const { data: subscriptions } = await req.supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', targetUsers.map(u => u.id))
        .eq('is_active', true);

      const payload = JSON.stringify({ title, body, icon: '/icons/icon-192x192.png' });

      for (const sub of subscriptions || []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          );
        } catch (pushError) {
          // Mark inactive if subscription expired
          if (pushError.statusCode === 410) {
            await req.supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
        }
      }
    }

    // Log action
    await req.supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'broadcast',
      entity_type: 'notification',
      entity_id: null,
      new_value: { title, body, targetDegrees, targetRoles }
    });

    res.json({ 
      success: true, 
      recipients: targetUsers.length 
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// GET /api/notifications/vapid-public-key - Get VAPID public key for client
router.get('/notifications/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    return res.status(503).json({ 
      error: 'Push notifications not configured' 
    });
  }

  res.json({ publicKey });
});

export default router;
