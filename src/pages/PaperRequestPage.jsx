import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchRequests, createRequest, getRequest, updateRequestStatus, cancelRequest } from '../api/requests';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';
import Breadcrumb from '../components/Breadcrumb';
import { DEGREES } from '../lib/supabase';

const PaperTypes = [
  { value: 'Mid Term', label: 'Mid Term' },
  { value: 'End Term', label: 'End Term' },
  { value: 'Supplementary', label: 'Supplementary' },
  { value: 'Quiz', label: 'Quiz' }
];

const RequestStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
];

const PaperRequestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageTitle('Paper Requests', 'Request papers that are not available');
  
  // State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
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

  // Fetch requests
  const fetchRequestsData = useCallback(async () => {
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
        // Regular user sees only their requests
        params.filters = { ...filters };
      }
      
      const { data, total } = await fetchRequests(params);
      setRequests(data);
      setTotalPages(Math.ceil(total / 10));
    } catch (err) {
      setError(err.message || 'Failed to load requests');
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [user, page, filters, adminFilters, checkAdminStatus]);
  
  // Load requests on mount and when filters change
  useEffect(() => {
    fetchRequestsData();
  }, [fetchRequestsData]);
  
  // Handle creating a new request
  const handleCreateRequest = async (requestData) => {
    try {
      const newRequest = await createRequest(requestData);
      setRequests(prev => [newRequest, ...prev]);
      toast.success('Paper request submitted successfully!');
      return newRequest;
    } catch (err) {
      throw new Error(err.message || 'Failed to submit request');
    }
  };
  
  // Handle canceling a request (user only)
  const handleCancelRequest = async () => {
    if (!selectedRequest || selectedRequest.status !== 'pending') return;
    
    try {
      await cancelRequest(selectedRequest.id);
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setSelectedRequest(null);
      toast.success('Request cancelled successfully!');
    } catch (err) {
      throw new Error(err.message || 'Failed to cancel request');
    }
  };
  
  // Handle updating request status (admin only)
  const handleUpdateStatus = async (statusUpdate) => {
    if (!selectedRequest) return;
    
    try {
      const updatedRequest = await updateRequestStatus(selectedRequest.id, statusUpdate);
      setSelectedRequest(updatedRequest);
      
      // Refresh requests list
      await fetchRequestsData();
      
      toast.success('Request status updated!');
    } catch (err) {
      throw new Error(err.message || 'Failed to update request status');
    }
  };
  
  // Handle request selection
  const handleRequestSelect = async (requestId) => {
    try {
      const request = await getRequest(requestId);
      setSelectedRequest(request);
    } catch (err) {
      toast.error('Failed to load request details');
    }
  };
  
  // Handle closing request detail view
  const handleCloseRequestDetail = () => {
    setSelectedRequest(null);
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
          { label: 'Paper Requests', to: '/request-paper' }
        ]} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
            Paper Requests
          </h1>
          <p className="text-on-surface-variant">
            Request papers that are not currently available in the system
          </p>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {/* Main content - either request list or request detail */}
        {!selectedRequest ? (
          // Request list view
          <>
            {/* New request button (for regular users) */}
            {!isAdminView && (
              <div className="mb-6">
                <Link to="/request-paper/new" className="btn-primary">
                  Request New Paper
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
                    {RequestStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Degree Filter
                  </label>
                  <select
                    className="input-glass w-full"
                    value={adminFilters.degree || ''}
                    onChange={(e) => {
                      const newFilters = { ...adminFilters };
                      if (e.target.value) {
                        newFilters.degree = e.target.value;
                      } else {
                        delete newFilters.degree;
                      }
                      handleAdminFilterChange(newFilters);
                    }}
                  >
                    <option value="">All Degrees</option>
                    {DEGREES.map(deg => (
                      <option key={deg.value} value={deg.value}>
                        {deg.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Branch Filter
                  </label>
                  <select
                    className="input-glass w-full"
                    value={adminFilters.branch || ''}
                    onChange={(e) => {
                      const newFilters = { ...adminFilters };
                      if (e.target.value) {
                        newFilters.branch = e.target.value;
                      } else {
                        delete newFilters.branch;
                      }
                      handleAdminFilterChange(newFilters);
                    }}
                  >
                    <option value="">All Branches</option>
                    {/* Branch options would be imported from supabase.js in a real implementation */}
                    <option value="cse">Computer Science & Engineering</option>
                    <option value="ece">Electronics & Communication</option>
                    <option value="me">Mechanical Engineering</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Request list */}
            <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <p className="mt-4 text-on-surface-variant">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-on-surface-variant">
                    {isAdminView ? 'No requests found' : 'You have no requests yet'}
                  </p>
                  {!isAdminView && (
                    <div className="mt-4">
                      <Link to="/request-paper/new" className="btn-primary">
                        Submit First Request
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {requests.map((request) => (
                    <div key={request.id} className="py-4 hover:bg-surface-container/50 transition-colors cursor-pointer"
                       onClick={() => handleRequestSelect(request.id)}
                       style={{ cursor: 'pointer' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-on-surface mb-1 truncate">
                            {request.paper_name}
                          </h3>
                          <p className="text-sm text-on-surface-variant mb-2">
                            {request.paper_type} • {request.degree} {request.branch ? `(${request.branch})` : ''}
                            {request.semester ? `Semester ${request.semester}` : ''}
                            {request.year ? `, ${request.year}` : ''}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(request.status)}`}>
                              {request.status.toUpperCase()}
                            </span>
                            <span className="text-on-surface-variant">
                              {new Date(request.requested_at).toLocaleDateString()}
                            </span>
                            {request.related_paper && (
                              <span className="ml-2 text-on-surface-variant">
                                ✓ Fulfilled
                              </span>
                            )}
                          </div>
                        </div>
                        {isAdminView && (
                          <div className="text-right text-xs">
                            <p className="text-on-surface-variant">From: {request.user_name || 'Unknown'}</p>
                            {request.fulfiller_name && (
                              <p className="text-on-surface-variant">Fulfilled by: {request.fulfiller_name}</p>
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
          // Request detail view
          <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-on-surface mb-2">
                  {selectedRequest.paper_name}
                </h2>
                <div className="space-y-2">
                  <p className="text-sm text-on-surface-variant">
                    <strong>Type:</strong> {selectedRequest.paper_type}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    <strong>Degree:</strong> {selectedRequest.degree}
                  </p>
                  {selectedRequest.branch && (
                    <p className="text-sm text-on-surface-variant">
                      <strong>Branch:</strong> {selectedRequest.branch}
                    </p>
                  )}
                  {selectedRequest.semester && (
                    <p className="text-sm text-on-surface-variant">
                      <strong>Semester:</strong> {selectedRequest.semester}
                    </p>
                  )}
                  {selectedRequest.year && (
                    <p className="text-sm text-on-surface-variant">
                      <strong>Year:</strong> {selectedRequest.year}
                    </p>
                  )}
                </p>
                <p className="text-sm text-on-surface-variant mb-4">
                  <strong>Description:</strong> {selectedRequest.description || 'No description provided'}
                </p>
                {selectedRequest.related_paper && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <h3 className="font-semibold text-green-400 mb-2">Fulfilled!</h3>
                    <p className="text-on-surface/90">
                      This request has been fulfilled by: <strong>{selectedRequest.related_paper.title}</strong>
                    </p>
                    <Link to={`/paper/${selectedRequest.related_paper.id}`} className="text-sm text-primary hover:underline">
                      View Paper
                    </Link>
                  </div>
                )}
              </div>
              {isAdminView && (
                <div className="space-x-3">
                  <button
                    onClick={() => navigate(`/request-paper/${selectedRequest.id}/edit`)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                </div>
              )}
              <button
                onClick={handleCloseRequestDetail}
                className="btn-outline"
              >
                Back to Requests
              </button>
            </div>
            
            {/* Admin controls for request */}
            {isAdminView && selectedRequest && (
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
                      value={selectedRequest.status}
                      onChange={(e) => {
                        const updateData = { status: e.target.value };
                        
                        if (e.target.value === 'fulfilled') {
                          updateData.fulfilled_at = new Date().toISOString();
                          updateData.fulfilled_by = (await supabase.auth.getUser()).data.user?.id;
                        } else if (e.target.value === 'rejected' || e.target.value === 'cancelled') {
                          // Additional logic for rejected/cancelled
                        }
                        
                        handleUpdateStatus(updateData);
                      }}
                    >
                      {RequestStatuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Related Paper (if fulfilled)
                    </label>
                    <select
                      className="input-glass w-full"
                      value={selectedRequest.related_paper_id || ''}
                      onChange={(e) => {
                        handleUpdateStatus({
                          relatedPaperId: e.target.value || null,
                          status: 'fulfilled'
                        });
                      }}
                    >
                      <option value="">Select a paper...</option>
                      {/* In a real app, this would be populated with approved papers */}
                      <option value="paper-1">Sample Paper Title</option>
                    </select>
                    
                    <label className="block text-sm font-medium text-on-surface mb-2 mt-4">
                      Notes (Optional)
                    </label>
                    <textarea
                      className="input-glass w-full resize-none"
                      rows={3}
                      placeholder="Add notes about this request..."
                      onChange={(e) => {
                        handleUpdateStatus({
                          notes: e.target.value
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* User actions (cancel request) */}
            {!isAdminView && selectedRequest && selectedRequest.status === 'pending' && (
              <div className="mb-6">
                <button
                  onClick={handleCancelRequest}
                  className="btn-outline btn-outline-secondary"
                >
                  Cancel Request
                </button>
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
    case 'pending': return 'bg-yellow-500/10 text-yellow-400';
    case 'in_progress': return 'bg-blue-500/10 text-blue-400';
    case 'fulfilled': return 'bg-green-500/10 text-green-400';
    case 'rejected': return 'bg-red-500/10 text-red-400';
    case 'cancelled': return 'bg-gray-500/10 text-gray-400';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

export default PaperRequestPage;