import React, { useState, useEffect } from 'react';
import { getPaperVersionHistory } from '../api/papers';

const PaperVersionHistory = ({ paperId }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState(null);

  useEffect(() => {
    loadVersionHistory();
  }, [paperId]);

  const loadVersionHistory = async () => {
    try {
      const data = await getPaperVersionHistory(paperId);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading version history...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No version history available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Version History</h3>
      
      {versions.map((version, index) => (
        <div 
          key={version.id}
          className="border rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setExpandedVersion(expandedVersion === index ? null : index)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-surface-container-high transition-colors"
            aria-expanded={expandedVersion === index}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium">
                v{version.version_number}
              </div>
              <div>
                <div className="font-medium">
                  {version.profiles?.name || 'Unknown User'}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(version.edited_at).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{version.change_type}</div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedVersion === index ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedVersion === index && (
            <div className="border-t p-4 bg-gray-50">
              <div className="mb-3 text-sm text-gray-600 italic">
                Reason: {version.edit_reason}
              </div>

              {version.diff && Object.keys(version.diff).length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Changes:</h4>
                  {Object.entries(version.diff).map(([field, changes]) => (
                    <div key={field} className="grid grid-cols-2 gap-4 p-2 bg-white rounded border">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{field}</div>
                        <div className="text-red-600 line-through">
                          {formatValue(changes.old)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">&nbsp;</div>
                        <div className="text-green-600">
                          {formatValue(changes.new)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                index === 0 && (
                  <div className="text-sm text-gray-500">
                    Initial submission - no previous version to compare
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PaperVersionHistory;