import React from 'react';
import { 
  MessageCircle, 
  User, 
  Clock, 
  CheckCircle, 
  X 
} from 'lucide-react';

const MessageThread = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-surface-container shadow-card rounded-2xl p-6 border border-white/10">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-on-surface mb-2">
          {message.subject}
        </h2>
        <p className="text-on-surface-variant mb-4">
          {message.body}
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
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
        </div>
      </div>

      {/* Message responses thread */}
      {message.responses && message.responses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-on-surface mb-4">
            Conversation ({message.responses.length})
          </h3>
          <div className="space-y-4">
            {message.responses.map((response, index) => (
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
                  {/* In a real implementation, there would be admin controls here */}
                </div>
                <p className="text-on-surface/90">{response.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-on-surface-variant/60 mt-6">
        <Clock className="w-4 h-4 mr-2" aria-hidden="true" />
        Sent on {new Date(message.created_at).toLocaleString()}
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

export default MessageThread;