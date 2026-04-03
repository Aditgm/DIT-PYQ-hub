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
 * Fetch user notifications from Supabase with pagination and filters.
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Number of items per page (default: 20)
 * @param {boolean} params.unreadOnly - Only return unread notifications
 * @param {string} params.userId - User ID (optional, defaults to current user)
 * @returns {Promise<{ data: Array, total: number, unreadCount: number }>} - Notifications data and counts
 */
export async function fetchNotifications(params = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    userId,
  } = params;

  // Get current user if userId not provided
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  
  if (!currentUserId) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUserId)
    .eq('is_read', false);

  return {
    data: data || [],
    total: count || 0,
    unreadCount: unreadCount || 0
  };
}

/**
 * Subscribe to push notifications
 * @param {Object} subscriptionData - Push subscription data
 * @param {string} subscriptionData.endpoint - Push endpoint
 * @param {Object} subscriptionData.keys - Encryption keys
 * @param {string} subscriptionData.userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Subscription record
 */
export async function subscribeToPush(subscriptionData) {
  const userId = subscriptionData.userId || (await supabase.auth.getUser()).data.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      ...subscriptionData,
      is_active: true
    }, { onConflict: ['user_id', 'endpoint'] })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unsubscribe from push notifications
 * @param {string} endpoint - Push endpoint to unsubscribe from
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Success indicator
 */
export async function unsubscribeFromPush(endpoint, userId) {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  
  if (!currentUserId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('user_id', currentUserId)
    .eq('endpoint', endpoint)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Success indicator
 */
export async function markNotificationAsRead(notificationId, userId) {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  
  if (!currentUserId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', currentUserId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark all notifications as read
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Success indicator
 */
export async function markAllNotificationsAsRead(userId) {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  
  if (!currentUserId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', currentUserId)
    .eq('is_read', false);

  if (error) throw error;
  return data;
}

/**
 * Get VAPID public key for push notifications
 * @returns {Promise<{ publicKey: string }>} VAPID public key
 */
export async function getVapidPublicKey() {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications/vapid-public-key`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get VAPID public key');
  }
  return response.json();
}