import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, subscribeToPush, unsubscribeFromPush, markNotificationAsRead, markAllNotificationsAsRead, getVapidPublicKey } from '../api/notifications';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';
import Breadcrumb from '../components/Breadcrumb';
import { supabase } from '../lib/supabase';

const NotificationTypes = [
  { value: 'message_reply', label: 'Message Reply' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'paper_available', label: 'Paper Available' },
  { value: 'system', label: 'System Notification' }
];

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Notifications', 'Manage your notifications and alerts');
  
  // State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState('');
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  // Check if service worker and push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        return;
      }
      
      navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          setIsSupported(registrations.length > 0);
        })
        .catch(() => {
          setIsSupported(false);
        });
    };
    
    checkSupport();
  }, []);
  
  // Fetch VAPID public key
  const fetchVapidKey = useCallback(async () => {
    try {
      const { publicKey } = await getVapidPublicKey();
      setVapidPublicKey(publicKey);
    } catch (err) {
      console.warn('Could not fetch VAPID public key:', err);
      setVapidPublicKey(null);
    }
  }, []);
  
  // Fetch notifications
  const fetchNotificationsData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        limit: 20,
        unreadOnly: filters.unreadOnly,
        userId: filters.userId || user.id
      };
      
      const { data, total, unreadCount } = await fetchNotifications(params);
      setNotifications(data);
      setTotalPages(Math.ceil(total / 20));
      setUnreadCount(unreadCount);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user, page, filters]);
  
  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (data) {
        setIsSubscribed(true);
        setSubscriptionEndpoint(data.endpoint);
      } else {
        setIsSubscribed(false);
        setSubscriptionEndpoint('');
      }
    } catch (err) {
      // No subscription found
      setIsSubscribed(false);
      setSubscriptionEndpoint('');
    }
  }, [user]);
  
  // Load data on mount and when filters change
  useEffect(() => {
    fetchNotificationsData();
    checkSubscriptionStatus();
    fetchVapidKey();
  }, [fetchNotificationsData, checkSubscriptionStatus, fetchVapidKey]);
  
  // Handle subscribing to push notifications
  const handleSubscribe = async () => {
    if (!isSupported || !vapidPublicKey) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }
    
    setIsSubscribing(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // Save subscription to backend
      await subscribeToPush({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        }
      });
      
      setIsSubscribed(true);
      setSubscriptionEndpoint(subscription.endpoint);
      
      toast.success('Successfully subscribed to push notifications!');
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to subscribe to push notifications');
      toast.error('Failed to subscribe to push notifications');
    } finally {
      setIsSubscribing(false);
    }
  };
  
  // Handle unsubscribing from push notifications
  const handleUnsubscribe = async () => {
    if (!subscriptionEndpoint) return;
    
    try {
      await unsubscribeFromPush(subscriptionEndpoint);
      setIsSubscribed(false);
      setSubscriptionEndpoint('');
      
      // Also unsubscribe from push service
      const registration = await navigator.serviceWorker.ready;
      const subscriptions = await registration.pushManager.getSubscriptions();
      for (const sub of subscriptions) {
        await sub.unsubscribe();
      }
      
      toast.success('Successfully unsubscribed from push notifications');
    } catch (err) {
      console.error('Unsubscription error:', err);
      setError(err.message || 'Failed to unsubscribe from push notifications');
      toast.error('Failed to unsubscribe from push notifications');
    }
  };
  
  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUncount(prev => Math.max(0, prev - 1));
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };
  
  // Handle marking all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };
  
  // If no user, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-surface">
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-8">
        <Breadcrumb items={[
          { label: 'Notifications', to: '/notifications' }
        ]} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
            Notifications
          </h1>
          <p className="text-on-surface-variant">
            Stay updated with important alerts and manage your notification preferences
          </p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {/* Main content */}
        <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-on-surface">
                  Notification Center
                </h2>
                <p className="text-on-surface-variant">
                  {unreadCount > 0 ? `${unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}` : 'All notifications are up to date'}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || loading}
                  className="btn-outline btn-outline-secondary"
                >
                  Mark All as Read
                </button>
              </div>
            </div>
            
            {/* Notification filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Show
                </label>
                <select
                  className="input-glass w-full"
                  value={filters.unreadOnly ? 'unread' : 'all'}
                  onChange={(e) => {
                    const newFilters = { ...filters };
                    if (e.target.value === 'unread') {
                      newFilters.unreadOnly = true;
                    } else {
                      delete newFilters.unreadOnly;
                    }
                    handleFilterChange(newFilters);
                  }}
                >
                  <option value="all">All Notifications</option>
                  <option value="unread">Unread Only</option>
                </select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Type
                </label>
                <select
                  className="input-glass w-full"
                  value={filters.type || ''}
                  onChange={(e) => {
                    const newFilters = { ...filters };
                    if (e.target.value) {
                      newFilters.type = e.target.value;
                    } else {
                      delete newFilters.type;
                    }
                    handleFilterChange(newFilters);
                  }}
                >
                  <option value="">All Types</option>
                  {NotificationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Push notification controls */}
          <div className="mb-6 p-4 bg-surface-container rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              Push Notifications
            </h3>
            
            {!isSupported && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400">
                  Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.
                </p>
              </div>
            )}
            
            {!vapidPublicKey && isSupported && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-400">
                  Push notification service is being configured. Please try again in a moment.
                </p>
              </div>
            )}
            
            {isSupported && vapidPublicKey && !isSubscribed && !isSubscribing && (
              <div className="space-y-4">
                <p className="text-on-surface-variant">
                  Get instant alerts for message replies, status changes, and new papers in your degree.
                </p>
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="btn-primary w-full"
                >
                  {isSubscribing ? 'Subscribing...' : 'Enable Push Notifications'}
                </button>
              </div>
            )}
            
            {isSupported && vapidPublicKey && isSubscribed && !isSubscribing && (
              <div className="space-y-4">
                <p className="text-on-surface-variant">
                  You're currently subscribed to push notifications. You'll receive alerts even when the app is closed.
                </p>
                <button
                  onClick={handleUnsubscribe}
                  className="btn-outline btn-outline-secondary w-full"
                >
                  Disable Push Notifications
                </button>
              </div>
            )}
          </div>
          
          {/* Notifications list */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              Recent Notifications
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-on-surface-variant">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-on-surface-variant">
                  You have no notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => (
                  <div key={notification.id} className="py-4 hover:bg-surface-container/50 transition-colors"
                       onClick={() => {
                         // Mark as read when clicked if not already read
                         if (!notification.is_read) {
                           handleMarkAsRead(notification.id);
                         }
                       }}
                       style={{ cursor: 'pointer' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-on-surface mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-on-surface/90 mb-2">{notification.body}</p>
                      
                      {/* Notification type badge */}
                      <div className="text-xs text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeBadgeClass(notification.type)}`}>
                          {notification.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for notification type badge classes
const getTypeBadgeClass = (type) => {
  switch (type) {
    case 'message_reply': return 'bg-blue-500/10 text-blue-400';
    case 'status_change': return 'bg-green-500/10 text-green-400';
    case 'paper_available': return 'bg-purple-500/10 text-purple-400';
    case 'system': return 'bg-gray-500/10 text-gray-400';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

// Helper function to convert ArrayBuffer to base64 (for VAPID key)
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

export default NotificationsPage;