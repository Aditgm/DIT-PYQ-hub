import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMessages, createMessage, getMessage, respondToMessage, updateMessageStatus } from '../api/messages';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';
import MessageThread from '../components/MessageThread';
import Breadcrumb from '../components/Breadcrumb';

const Categories = [
  { value: 'general', label: 'General' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'access_issue', label: 'Access Issue' },
  { value: 'copyright', label: 'Copyright Concern' },
  { value: 'other', label: 'Other' }
];

const Priorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const Statuses = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_user', label: 'Pending User' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Messages & Support', 'Get help and track your support tickets');
  
  // State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageResponses, setMessageResponses] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminFilters, setAdminFilters] = useState({});
  
  // Check if user is admin/moderator
  const checkAdminStatus = useCallback(async () => {
    if (!user) return false;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return profile && ['admin', 'moderator'].includes(profile.role);
    } catch (err) {
      return false;
    }
  }, [user]);

  // Fetch messages
  const fetchMessagesData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const isAdmin = await checkAdminStatus();
      setIsAdminView(isAdmin);
      
      let params = {
        page,
        limit: 10,
        filters: {}
      };
      
      if (isAdmin) {
        params.filters = { ...adminFilters };
      } else {
        // Regular user sees only their messages
        params.filters = { ...filters };
      }
      
      const { data, total } = await fetchMessages(params);
      setMessages(data);
      setTotalPages(Math.ceil(total / 10));
    } catch (err) {
      setError(err.message || 'Failed to load messages');
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user, page, filters, adminFilters, checkAdminStatus]);
  
  // Load messages on mount and when filters change
  useEffect(() => {
    fetchMessagesData();
  }, [fetchMessagesData]);
  
  // Handle creating a new message
  const handleCreateMessage = async (messageData) => {
    try {
      const newMessage = await createMessage(messageData);
      setMessages(prev => [newMessage, ...prev]);
      toast.success('Message sent successfully!');
      return newMessage;
    } catch (err) {
      throw new Error(err.message || 'Failed to send message');
    }
  };
  
  // Handle responding to a message
  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    
    setIsReplying(true);
    try {
      const response = await respondToMessage(selectedMessage.id, { body: replyText });
      
      // Update selected message with new response
      setSelectedMessage(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          responses: [...(prev.responses || []), response]
        };
      });
      
      // Update message status if it was pending_user
      if (selectedMessage.status === 'pending_user') {
        await updateMessageStatus(selectedMessage.id, { status: 'in_progress' });
        setSelectedMessage(prev => {
          if (!prev) return prev;
          return { ...prev, status: 'in_progress' };
        });
      }
      
      setReplyText('');
      toast.success('Reply sent!');
    } catch (err) {
      throw new Error(err.message || 'Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };
  
  // Handle updating message status (admin only)
  const handleUpdateStatus = async (statusUpdate) => {
    if (!selectedMessage) return;
    
    try {
      const updatedMessage = await updateMessageStatus(selectedMessage.id, statusUpdate);
      setSelectedMessage(updatedMessage);
      
      // Refresh messages list
      await fetchMessagesData();
      
      toast.success('Message status updated!');
    } catch (err) {
      throw new Error(err.message || 'Failed to update message status');
    }
  };
  
  // Handle message selection
  const handleMessageSelect = async (messageId) => {
    try {
      const message = await getMessage(messageId);
      setSelectedMessage(message);
    } catch (err) {
      toast.error('Failed to load message details');
    }
  };
  
  // Handle closing message detail view
  const handleCloseMessageDetail = () => {
    setSelectedMessage(null);
    setMessageResponses([]);
    setReplyText('');
    setIsReplying(false);
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };
  
  // Handle admin filter changes
  const handleAdminFilterChange = (newFilters) => {
    setAdminFilters(newFilters);
    setPage(1); // Reset to first page when filters change
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
          { label: 'Messages & Support', to: '/messages' }
        ]} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
            Messages & Support
          </h1>
          <p className="text-on-surface-variant">
            Get help, track your tickets, and communicate with the support team
          </p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {/* Main content - either message list or message detail */}
        {!selectedMessage ? (
          // Message list view
          <>
            {/* New message button (for regular users) */}
            {!isAdminView && (
              <div className="mb-6">
                <Link to="/messages/new" className="btn-primary">
                  New Message
                </Link>
              </div>
            )}
            
            {/* Admin controls */}
            {isAdminView && (
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Status Filter
                  </label>
                  <select
                    className="input-glass w-full"
                    value={adminFilters.status || ''}
                    onChange={(e) => {
                      const newFilters = { ...adminFilters };
                      if (e.target.value) {
                        newFilters.status = e.target.value;
                      } else {
                        delete newFilters.status;
                      }
                      handleAdminFilterChange(newFilters);
                    }}
                  >
                    <option value="">All Statuses</option>
                    {Statuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Category Filter
                  </label>
                  <select
                    className="input-glass w-full"
                    value={adminFilters.category || ''}
                    onChange={(e) => {
                      const newFilters = { ...adminFilters };
                      if (e.target.value) {
                        newFilters.category = e.target.value;
                      } else {
                        delete newFilters.category;
                      }
                      handleAdminFilterChange(newFilters);
                    }}
                  >
                    <option value="">All Categories</option>
                    {Categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Message list */}
            <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <p className="mt-4 text-on-surface-variant">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-on-surface-variant">
                    {isAdminView ? 'No messages found' : 'You have no messages yet'}
                  </p>
                  {!isAdminView && (
                    <div className="mt-4">
                      <Link to="/messages/new" className="btn-primary">
                        Send First Message
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {messages.map((message) => (
                    <div key={message.id} className="py-4 hover:bg-surface-container/50 transition-colors cursor-pointer"
                       onClick={() => handleMessageSelect(message.id)}
                       style={{ cursor: 'pointer' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-on-surface mb-1 truncate">
                            {message.subject}
                          </h3>
                          <p className="text-sm text-on-surface-variant mb-2 truncate">
                            {message.body}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(message.status)}`}>
                              {message.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getCategoryBadgeClass(message.category)}`}>
                              {message.category.replace('_', ' ').toUpperCase()}
                            </span>
                            {message.priority && (
                              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadgeClass(message.priority)}`}>
                                {message.priority.toUpperCase()}
                              </span>
                            )}
                            <span className="text-on-surface-variant">
                              {new Date(message.created_at).toLocaleDateString()}
                            </span>
                            {message.responseCount > 0 && (
                              <span className="ml-2 text-on-surface-variant">
                                {message.responseCount} response{message.responseCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        {isAdminView && (
                          <div className="text-right text-xs">
                            <p className="text-on-surface-variant">From: {message.user_name || 'Unknown'}</p>
                            {message.assigned_to_name && (
                              <p className="text-on-surface-variant">Assigned: {message.assigned_to_name}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="px-4 py-2 bg-surface-container rounded-lg hover:bg-primary/10 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-on-surface-variant">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="px-4 py-2 bg-surface-container rounded-lg hover:bg-primary/10 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Message detail view
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-on-surface mb-2">
                  {selectedMessage.subject}
                </h2>
                <p className="text-on-surface-variant mb-4">
                  {selectedMessage.body}
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedMessage.status)}`}>
                    {selectedMessage.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getCategoryBadgeClass(selectedMessage.category)}`}>
                    {selectedMessage.category.replace('_', ' ').toUpperCase()}
                  </span>
                  {selectedMessage.priority && (
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadgeClass(selectedMessage.priority)}`}>
                      {selectedMessage.priority.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              {isAdminView && (
                <div className="space-x-3">
                  <button
                    onClick={() => navigate(`/messages/${selectedMessage.id}/edit`)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                </div>
              )}
              <button
                onClick={handleCloseMessageDetail}
                className="btn-outline"
              >
                Back to Messages
              </button>
            </div>
            
            {/* Admin controls for message */}
            {isAdminView && selectedMessage && (
              <div className="mb-6 p-4 bg-surface-container rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold text-on-surface mb-4">
                  Admin Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Status
                    </label>
                    <select
                      className="input-glass w-full"
                      value={selectedMessage.status}
                      onChange={(e) => {
                        handleUpdateStatus({ 
                          status: e.target.value,
                          ...(e.target.value === 'resolved' || e.target.value === 'closed' 
                            ? { resolved_at: new Date().toISOString() } 
                            : {})
                        });
                      }}
                    >
                      {Statuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Assigned To
                    </label>
                    <select
                      className="input-glass w-full"
                      value={selectedMessage.assigned_to || ''}
                      onChange={(e) => {
                        handleUpdateStatus({
                          assignedTo: e.target.value || null
                        });
                      }}
                    >
                      <option value="">Unassigned</option>
                      {/* In a real app, this would be populated with admin/moderator users */}
                      <option value="admin-1">Admin User</option>
                      <option value="mod-1">Moderator User</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Resolution Notes (Optional)
                    </label>
                    <textarea
                      className="input-glass w-full resize-none"
                      rows={3}
                      placeholder="Add resolution notes..."
                      onChange={(e) => {
                        handleUpdateStatus({
                          resolutionNotes: e.target.value
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Message responses thread */}
            {selectedMessage.responses && selectedMessage.responses.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">
                  Conversation ({selectedMessage.responses.length})
                </h3>
                <div className="space-y-4">
                  {selectedMessage.responses.map((response, index) => (
                    <div key={response.id} className={`border-l-2 border-${response.is_admin_response ? 'primary' : 'secondary'}/20 pl-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-on-surface">
                            {response.is_admin_response ? 'Admin Response' : 'Your Response'}
                          </p>
                          <p className="text-sm text-on-surface-variant">
                            {new Date(response.created_at).toLocaleString()}
                          </p>
                        </div>
                        {isAdminView && !response.is_admin_response && (
                          <button
                            onClick={() => handleUpdateStatus({ 
                              status: 'pending_user',
                              resolutionNotes: 'Marked as pending user response'
                            })}
                            className="text-xs text-primary hover:underline"
                          >
                            Mark as Pending User
                          </button>
                        )}
                      </div>
                      <p className="text-on-surface/90">{response.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Reply form (for non-admin users or when viewing own messages) */}
            {!isAdminView || (selectedMessage && selectedMessage.user_id === user.id)} && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">
                  Reply to Message
                </h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleReply();
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Your Response
                    </label>
                    <textarea
                      className="input-glass w-full resize-none"
                      rows={4}
                      placeholder="Type your response..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isReplying}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isReplying || !replyText.trim()}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions for badge classes
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'open': return 'bg-yellow-500/10 text-yellow-400';
    case 'in_progress': return 'bg-blue-500/10 text-blue-400';
    case 'pending_user': return 'bg-orange-500/10 text-orange-400';
    case 'resolved': return 'bg-green-500/10 text-green-400';
    case 'closed': return 'bg-gray-500/10 text-gray-400';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'technical': return 'bg-blue-500/10 text-blue-400';
    case 'access_issue': return 'bg-orange-500/10 text-orange-400';
    case 'copyright': return 'bg-purple-500/10 text-purple-400';
    case 'other': return 'bg-gray-500/10 text-gray-400';
    default: return 'bg-green-500/10 text-green-400'; // general
  }
};

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case 'low': return 'bg-green-500/10 text-green-400';
    case 'normal': return 'bg-yellow-500/10 text-yellow-400';
    case 'high': return 'bg-orange-500/10 text-orange-400';
    case 'urgent': return 'bg-red-500/10 text-red-400';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

export default MessagesPage;